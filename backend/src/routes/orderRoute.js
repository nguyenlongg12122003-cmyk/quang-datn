const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { safeJsonParse } = require('../utils/mapRows');
const { VNPay, ignoreLogger } = require('vnpay');
const { PayOS } = require('@payos/node');

const router = express.Router();

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const VNPAY_RETURN_URL = process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/orders/vnpay-return';
const PAYOS_RETURN_URL = process.env.PAYOS_RETURN_URL || new URL('/payment/payos-return', FRONTEND_BASE_URL).toString();
const PAYOS_CANCEL_URL = process.env.PAYOS_CANCEL_URL || PAYOS_RETURN_URL;

function resolveVNPayHost() {
  const raw = process.env.VNPAY_HOST || process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://sandbox.vnpayment.vn';
  }
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip?.replace('::ffff:', '') || '127.0.0.1';
}

function buildFrontendReturnUrl(params = {}) {
  const url = new URL('/orders', FRONTEND_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function buildFrontendPaymentPage(pathname, params = {}) {
  const url = new URL(pathname, FRONTEND_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function getVNPayGateway() {
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secureSecret = process.env.VNPAY_SECURE_SECRET || process.env.VNPAY_HASH_SECRET;

  if (!tmnCode || !secureSecret) return null;

  return new VNPay({
    tmnCode,
    secureSecret,
    vnpayHost: resolveVNPayHost(),
    testMode: String(process.env.VNPAY_TEST_MODE || 'true') === 'true',
    hashAlgorithm: 'SHA512',
    enableLog: false,
    loggerFn: ignoreLogger,
  });
}

function getPayOSGateway() {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!clientId || !apiKey || !checksumKey) return null;

  return new PayOS({
    clientId,
    apiKey,
    checksumKey,
    partnerCode: process.env.PAYOS_PARTNER_CODE || undefined,
    baseURL: process.env.PAYOS_BASE_URL || undefined,
  });
}

function getPayOSOrderCode(orderId) {
  const digits = String(orderId || '').replace(/\D/g, '');
  const orderCode = Number(digits);
  if (!Number.isSafeInteger(orderCode) || orderCode <= 0) {
    throw new Error('Không thể tạo orderCode hợp lệ cho PayOS');
  }
  return orderCode;
}

function getOrderIdFromPayOSOrderCode(orderCode) {
  const numericCode = Number(orderCode);
  if (!Number.isSafeInteger(numericCode) || numericCode <= 0) return '';
  return `ORD-${String(numericCode).padStart(8, '0')}`;
}

async function markOrderPaid(pool, orderId, successNote) {
  const orderResult = await pool.request()
    .input('id', sql.NVarChar, orderId)
    .query('SELECT TOP 1 id, paymentStatus, voucherCode, [status] FROM dbo.orders WHERE id = @id');

  const order = orderResult.recordset[0];
  if (!order) {
    return { ok: false, reason: 'order_not_found', orderId };
  }

  await pool.request()
    .input('id', sql.NVarChar, orderId)
    .query("UPDATE dbo.orders SET paymentStatus = 'paid', [status] = CASE WHEN [status] = 'pending' THEN 'confirmed' ELSE [status] END WHERE id = @id");

  await pool.request()
    .input('orderId', sql.NVarChar, orderId)
    .input('status', sql.NVarChar, 'confirmed')
    .input('note', sql.NVarChar, successNote)
    .query("IF NOT EXISTS (SELECT 1 FROM dbo.order_timeline WHERE orderId = @orderId AND [status] = @status) INSERT INTO dbo.order_timeline (orderId, status, date, note) VALUES (@orderId, @status, SYSUTCDATETIME(), @note)");

  if (order.voucherCode && order.paymentStatus !== 'paid') {
    await adjustVoucherUsage(pool, order.voucherCode, 'increment');
  }

  return { ok: true, orderId };
}

async function markOrderFailed(pool, orderId, failureNote) {
  const orderResult = await pool.request()
    .input('id', sql.NVarChar, orderId)
    .query('SELECT TOP 1 id, paymentStatus FROM dbo.orders WHERE id = @id');

  const order = orderResult.recordset[0];
  if (!order) {
    return { ok: false, reason: 'order_not_found', orderId };
  }

  if (order.paymentStatus === 'paid') {
    return { ok: true, orderId };
  }

  await pool.request()
    .input('id', sql.NVarChar, orderId)
    .query("UPDATE dbo.orders SET paymentStatus = 'failed', [status] = 'cancelled' WHERE id = @id");

  await pool.request()
    .input('orderId', sql.NVarChar, orderId)
    .input('status', sql.NVarChar, 'cancelled')
    .input('note', sql.NVarChar, failureNote)
    .query("IF NOT EXISTS (SELECT 1 FROM dbo.order_timeline WHERE orderId = @orderId AND [status] = @status) INSERT INTO dbo.order_timeline (orderId, status, date, note) VALUES (@orderId, @status, SYSUTCDATETIME(), @note)");

  return { ok: false, orderId, reason: 'payment_failed' };
}

async function processVNPayReturnQuery(query) {
  const vnpay = getVNPayGateway();
  if (!vnpay) {
    return { ok: false, reason: 'gateway_not_configured' };
  }

  const verify = vnpay.verifyReturnUrl(query);
  if (!verify.isVerified) {
    return { ok: false, reason: 'invalid_signature' };
  }

  const orderId = String(verify.vnp_TxnRef || '');
  if (!orderId) {
    return { ok: false, reason: 'missing_order_id' };
  }

  const isPaid = verify.isSuccess && String(verify.vnp_ResponseCode) === '00';
  const pool = await getPool();

  if (isPaid) {
    const result = await markOrderPaid(pool, orderId, 'Thanh toán VNPay thành công');
    return { ...result, code: String(verify.vnp_ResponseCode || '00') };
  }

  const result = await markOrderFailed(pool, orderId, `Thanh toán VNPay thất bại: ${verify.message || 'unknown'}`);
  return { ...result, code: String(verify.vnp_ResponseCode || ''), message: verify.message };
}

async function processPayOSPaymentStatus({ orderCode, paymentLinkId } = {}) {
  const payos = getPayOSGateway();
  if (!payos) {
    return { ok: false, reason: 'gateway_not_configured' };
  }

  const normalizedOrderCode = Number(orderCode);
  if (!Number.isSafeInteger(normalizedOrderCode) || normalizedOrderCode <= 0) {
    return { ok: false, reason: 'missing_order_code' };
  }

  const payment = await payos.paymentRequests.get(paymentLinkId || normalizedOrderCode);
  const orderId = getOrderIdFromPayOSOrderCode(payment.orderCode || normalizedOrderCode);
  if (!orderId) {
    return { ok: false, reason: 'order_not_found' };
  }

  const pool = await getPool();
  if (payment.status === 'PAID') {
    const result = await markOrderPaid(pool, orderId, 'Thanh toán PayOS thành công');
    return { ...result, orderId, orderCode: payment.orderCode, paymentStatus: payment.status };
  }

  if (['PENDING', 'PROCESSING'].includes(String(payment.status))) {
    return {
      ok: false,
      pending: true,
      orderId,
      orderCode: payment.orderCode,
      paymentStatus: payment.status,
      reason: 'payment_pending',
    };
  }

  const result = await markOrderFailed(pool, orderId, `Thanh toán PayOS thất bại: ${payment.status}`);
  return { ...result, orderId, orderCode: payment.orderCode, paymentStatus: payment.status };
}

async function processPayOSWebhook(payload) {
  const payos = getPayOSGateway();
  if (!payos) {
    return { ok: false, reason: 'gateway_not_configured' };
  }

  const webhookData = await payos.webhooks.verify(payload);
  return processPayOSPaymentStatus({
    orderCode: webhookData.orderCode,
    paymentLinkId: webhookData.paymentLinkId,
  });
}

async function cancelPayOSPaymentLinkByOrderId(orderId, cancellationReason) {
  const payos = getPayOSGateway();
  if (!payos) return;

  try {
    await payos.paymentRequests.cancel(getPayOSOrderCode(orderId), cancellationReason);
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : '';
    if (
      message.includes('Payment link not found')
      || message.includes('payment link not found')
      || message.includes('already cancelled')
      || message.includes('already paid')
    ) {
      return;
    }
    throw error;
  }
}

async function buildOrders(pool, userId) {
  const ordersResult = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query('SELECT * FROM dbo.orders WHERE userId = @userId ORDER BY createdAt DESC');

  const itemResult = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
      SELECT oi.*
      FROM dbo.order_items oi
      INNER JOIN dbo.orders o ON o.id = oi.orderId
      WHERE o.userId = @userId
    `);

  const timelineResult = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
      SELECT ot.*
      FROM dbo.order_timeline ot
      INNER JOIN dbo.orders o ON o.id = ot.orderId
      WHERE o.userId = @userId
      ORDER BY ot.[date]
    `);

  return buildOrdersFromRows(ordersResult.recordset, itemResult.recordset, timelineResult.recordset);
}

async function buildAllOrders(pool, { status, q } = {}) {
  const request = pool.request();
  const conditions = [];

  if (status && status !== 'all') {
    request.input('statusFilter', sql.NVarChar, status);
    conditions.push("[status] = @statusFilter");
  }
  if (q) {
    request.input('q', sql.NVarChar, `%${q}%`);
    conditions.push("(id LIKE @q OR shippingAddress LIKE @q)");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const ordersResult = await request.query(`SELECT * FROM dbo.orders ${where} ORDER BY createdAt DESC`);
  if (ordersResult.recordset.length === 0) return [];

  const allItems = await pool.request().query('SELECT * FROM dbo.order_items');
  const allTimelines = await pool.request().query('SELECT * FROM dbo.order_timeline ORDER BY [date]');

  return buildOrdersFromRows(ordersResult.recordset, allItems.recordset, allTimelines.recordset);
}

function buildOrdersFromRows(orders, items, timelines) {
  const itemsByOrder = items.reduce((acc, row) => {
    acc[row.orderId] = acc[row.orderId] || [];
    acc[row.orderId].push({
      productId: row.productId,
      productName: row.productName,
      productImage: row.productImage,
      price: Number(row.price),
      quantity: row.quantity,
      customization: safeJsonParse(row.customization, null),
    });
    return acc;
  }, {});

  const timelineByOrder = timelines.reduce((acc, row) => {
    acc[row.orderId] = acc[row.orderId] || [];
    acc[row.orderId].push({ status: row.status, date: row.date, note: row.note });
    return acc;
  }, {});

  return orders.map((row) => ({
    ...row,
    subtotal: Number(row.subtotal),
    shippingFee: Number(row.shippingFee),
    discount: Number(row.discount),
    total: Number(row.total),
    shippingAddress: safeJsonParse(row.shippingAddress, {}),
    returnRequest: safeJsonParse(row.returnRequest, null),
    items: itemsByOrder[row.id] || [],
    timeline: timelineByOrder[row.id] || [],
  }));
}

function normalizeProductCustomizationOptions(rawOptions) {
  const parsed = safeJsonParse(rawOptions, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((option) => {
      if (typeof option === 'string') {
        const label = option.trim();
        if (!label) return null;
        return { label, inputType: 'text', extraPrice: 0 };
      }

      if (!option || typeof option !== 'object') return null;
      const label = String(option.label || '').trim();
      if (!label) return null;

      return {
        label,
        inputType: ['text', 'image'].includes(String(option.inputType || '')) ? String(option.inputType) : 'text',
        extraPrice: option.extraPrice && Number.isFinite(Number(option.extraPrice)) ? Number(option.extraPrice) : 0,
      };
    })
    .filter(Boolean);
}

const allowedOrderTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: [],
  returned: [],
};

async function adjustVoucherUsage(pool, voucherCode, direction) {
  if (!voucherCode) return;
  const normalizedCode = String(voucherCode).toUpperCase();
  if (direction === 'increment') {
    await pool.request()
      .input('code', sql.NVarChar, normalizedCode)
      .query('UPDATE dbo.vouchers SET usedCount = usedCount + 1 WHERE code = @code');
    return;
  }

  await pool.request()
    .input('code', sql.NVarChar, normalizedCode)
    .query('UPDATE dbo.vouchers SET usedCount = CASE WHEN usedCount > 0 THEN usedCount - 1 ELSE 0 END WHERE code = @code');
}

// ==================== CUSTOMER ====================

router.get('/my-orders', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const orders = await buildOrders(pool, req.user.userId);
    return res.json(orders);
  } catch (error) {
    return next(error);
  }
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      items, subtotal, shippingFee, discount, total,
      paymentMethod, shippingMethod, shippingAddress, voucherCode, note,
    } = req.body;

    const normalizedPaymentMethod = paymentMethod || 'cod';
    if (!['cod', 'vnpay', 'payos'].includes(normalizedPaymentMethod)) {
      return res.status(400).json({ message: 'Chỉ hỗ trợ thanh toán COD, VNPay hoặc PayOS' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
    }

    const orderId = `ORD-${Date.now().toString().slice(-8)}`;
    const pool = await getPool();

    const normalizedShippingFee = Number(shippingFee || 0);
    const normalizedDiscount = Number(discount || 0);
    let computedSubtotal = 0;

    await pool.request()
      .input('id', sql.NVarChar, orderId)
      .input('userId', sql.NVarChar, req.user.userId)
      .input('subtotal', sql.Decimal(18, 2), 0)
      .input('shippingFee', sql.Decimal(18, 2), normalizedShippingFee)
      .input('discount', sql.Decimal(18, 2), normalizedDiscount)
      .input('total', sql.Decimal(18, 2), 0)
      .input('status', sql.NVarChar, 'pending')
      .input('paymentMethod', sql.NVarChar, normalizedPaymentMethod)
      .input('paymentStatus', sql.NVarChar, 'pending')
      .input('shippingMethod', sql.NVarChar, shippingMethod || 'standard')
      .input('shippingAddress', sql.NVarChar(sql.MAX), JSON.stringify(shippingAddress || {}))
      .input('voucherCode', sql.NVarChar, voucherCode || null)
      .input('note', sql.NVarChar(sql.MAX), note || null)
      .query(`
        INSERT INTO dbo.orders (
          id, userId, subtotal, shippingFee, discount, total, status, paymentMethod, paymentStatus,
          shippingMethod, shippingAddress, voucherCode, note, createdAt, returnRequest
        )
        VALUES (
          @id, @userId, @subtotal, @shippingFee, @discount, @total, @status, @paymentMethod, @paymentStatus,
          @shippingMethod, @shippingAddress, @voucherCode, @note, SYSUTCDATETIME(), NULL
        )
      `);

    for (const item of items) {
      const productResult = await pool.request()
        .input('productId', sql.NVarChar, item.productId)
        .query('SELECT TOP 1 id, name, images, price, isCustomizable, customizationOptions FROM dbo.products WHERE id = @productId');

      const product = productResult.recordset[0];
      if (!product) {
        return res.status(400).json({ message: `Sản phẩm không tồn tại: ${item.productId}` });
      }

      let normalizedCustomization = null;
      let enforcedExtraPrice = 0;
      if (item.customization) {
        const type = typeof item.customization.type === 'string' ? item.customization.type.trim() : '';
        const text = typeof item.customization.text === 'string' ? item.customization.text.trim() : '';

        if (!type) {
          return res.status(400).json({ message: `Thông tin tùy chỉnh không hợp lệ cho sản phẩm: ${product.name}` });
        }

        if (!product.isCustomizable) {
          return res.status(400).json({ message: `Sản phẩm không hỗ trợ tùy chỉnh: ${product.name}` });
        }

        const allowedOptions = normalizeProductCustomizationOptions(product.customizationOptions);
        let selectedOption = null;
        if (allowedOptions.length > 0) {
          selectedOption = allowedOptions.find((opt) => opt.label.toLowerCase() === type.toLowerCase()) || null;
          if (!selectedOption) {
            return res.status(400).json({ message: `Loại tùy chỉnh không hợp lệ cho sản phẩm: ${product.name}` });
          }
        }

        if (!text) {
          return res.status(400).json({ message: `Vui lòng nhập nội dung tùy chỉnh cho sản phẩm: ${product.name}` });
        }

        if (selectedOption?.inputType === 'image' && !text.startsWith('data:image/')) {
          return res.status(400).json({ message: `Ảnh tùy chỉnh không hợp lệ cho sản phẩm: ${product.name}` });
        }

        normalizedCustomization = {
          type,
          text,
          inputType: selectedOption?.inputType || 'text',
          extraPrice: selectedOption?.extraPrice || 0,
        };
        enforcedExtraPrice = selectedOption?.extraPrice || 0;
      }

      const requestedUnitPrice = Number(item.price || 0);
      const fallbackBasePrice = Number(product.price || 0);
      const minimumValidPrice = fallbackBasePrice + enforcedExtraPrice;
      const finalUnitPrice = Math.max(requestedUnitPrice, minimumValidPrice);
      const quantityValue = Number(item.quantity || 1);
      computedSubtotal += finalUnitPrice * quantityValue;

      const images = safeJsonParse(product.images, []);
      const productImage = Array.isArray(images) && images[0]?.url ? images[0].url : '';

      await pool.request()
        .input('orderId', sql.NVarChar, orderId)
        .input('productId', sql.NVarChar, item.productId)
        .input('productName', sql.NVarChar, product.name || item.productName || '')
        .input('productImage', sql.NVarChar, productImage || item.productImage || '')
        .input('price', sql.Decimal(18, 2), finalUnitPrice)
        .input('quantity', sql.Int, quantityValue)
        .input('customization', sql.NVarChar(sql.MAX), JSON.stringify(normalizedCustomization))
        .query('INSERT INTO dbo.order_items (orderId, productId, productName, productImage, price, quantity, customization) VALUES (@orderId, @productId, @productName, @productImage, @price, @quantity, @customization)');
    }

    const computedTotal = Math.max(0, computedSubtotal + normalizedShippingFee - normalizedDiscount);
    await pool.request()
      .input('id', sql.NVarChar, orderId)
      .input('subtotal', sql.Decimal(18, 2), computedSubtotal)
      .input('total', sql.Decimal(18, 2), computedTotal)
      .query('UPDATE dbo.orders SET subtotal = @subtotal, total = @total WHERE id = @id');

    await pool.request()
      .input('orderId', sql.NVarChar, orderId)
      .query("INSERT INTO dbo.order_timeline (orderId, status, date, note) VALUES (@orderId, 'pending', SYSUTCDATETIME(), NULL)");

    // Mark voucher used immediately for COD only.
    if (voucherCode && normalizedPaymentMethod === 'cod') {
      await pool.request()
        .input('code', sql.NVarChar, voucherCode.toUpperCase())
        .query('UPDATE dbo.vouchers SET usedCount = usedCount + 1 WHERE code = @code');
    }

    if (normalizedPaymentMethod === 'vnpay') {
      const vnpay = getVNPayGateway();
      if (!vnpay) {
        return res.status(500).json({ message: 'VNPay chưa được cấu hình trên server' });
      }

      const payableAmount = Math.round(Number(computedTotal || 0));
      if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
        return res.status(400).json({ message: 'Số tiền thanh toán không hợp lệ' });
      }

      const paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: payableAmount,
        vnp_IpAddr: getClientIp(req),
        vnp_ReturnUrl: VNPAY_RETURN_URL,
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      });

      return res.status(201).json({
        id: orderId,
        paymentMethod: normalizedPaymentMethod,
        paymentStatus: 'pending',
        paymentUrl,
      });
    }

    if (normalizedPaymentMethod === 'payos') {
      const payos = getPayOSGateway();
      if (!payos) {
        return res.status(500).json({ message: 'PayOS chưa được cấu hình trên server' });
      }

      const payableAmount = Math.round(Number(computedTotal || 0));
      if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
        return res.status(400).json({ message: 'Số tiền thanh toán không hợp lệ' });
      }

      const paymentLink = await payos.paymentRequests.create({
        orderCode: getPayOSOrderCode(orderId),
        amount: payableAmount,
        description: `Thanh toan ${orderId}`.slice(0, 25),
        returnUrl: PAYOS_RETURN_URL,
        cancelUrl: PAYOS_CANCEL_URL,
        buyerName: shippingAddress?.name ? String(shippingAddress.name).slice(0, 100) : undefined,
        buyerPhone: shippingAddress?.phone ? String(shippingAddress.phone).slice(0, 20) : undefined,
        buyerAddress: [shippingAddress?.street, shippingAddress?.ward, shippingAddress?.district, shippingAddress?.city].filter(Boolean).join(', ').slice(0, 255) || undefined,
        items: [{ name: `Don hang ${orderId}`.slice(0, 25), quantity: 1, price: payableAmount }],
      });

      return res.status(201).json({
        id: orderId,
        paymentMethod: normalizedPaymentMethod,
        paymentStatus: 'pending',
        paymentUrl: paymentLink.checkoutUrl,
      });
    }

    return res.status(201).json({ id: orderId, message: 'Order created successfully' });
  } catch (error) {
    return next(error);
  }
});

router.get('/vnpay-return', async (req, res, next) => {
  try {
    const result = await processVNPayReturnQuery(req.query);
    if (result.ok) {
      return res.redirect(buildFrontendReturnUrl({ payment: 'vnpay_success', orderId: result.orderId }));
    }
    return res.redirect(buildFrontendReturnUrl({ payment: 'vnpay_failed', orderId: result.orderId, reason: result.reason, code: result.code }));
  } catch (error) {
    return next(error);
  }
});

router.get('/vnpay-verify', async (req, res, next) => {
  try {
    const result = await processVNPayReturnQuery(req.query);
    if (result.ok) {
      return res.json({ success: true, orderId: result.orderId, code: result.code });
    }
    return res.status(400).json({ success: false, orderId: result.orderId, reason: result.reason, code: result.code, message: result.message });
  } catch (error) {
    return next(error);
  }
});

router.get('/payos-verify', async (req, res, next) => {
  try {
    const result = await processPayOSPaymentStatus({
      orderCode: req.query.orderCode,
      paymentLinkId: req.query.paymentLinkId,
    });

    if (result.ok) {
      return res.json({ success: true, orderId: result.orderId, orderCode: result.orderCode, paymentStatus: result.paymentStatus });
    }

    if (result.pending) {
      return res.status(202).json({
        success: false,
        pending: true,
        orderId: result.orderId,
        orderCode: result.orderCode,
        paymentStatus: result.paymentStatus,
        reason: result.reason,
      });
    }

    return res.status(400).json({
      success: false,
      orderId: result.orderId,
      orderCode: result.orderCode,
      paymentStatus: result.paymentStatus,
      reason: result.reason,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/payos-webhook', async (req, res, next) => {
  try {
    await processPayOSWebhook(req.body);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// Customer cancel pending order
router.post('/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('userId', sql.NVarChar, req.user.userId)
      .query("SELECT TOP 1 id, [status], paymentMethod FROM dbo.orders WHERE id = @id AND userId = @userId");

    const order = result.recordset[0];
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Chỉ có thể hủy đơn hàng đang chờ xác nhận' });
    }

    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query("UPDATE dbo.orders SET [status] = 'cancelled' WHERE id = @id");

    await pool.request()
      .input('orderId', sql.NVarChar, req.params.id)
      .query("INSERT INTO dbo.order_timeline (orderId, status, date, note) VALUES (@orderId, 'cancelled', SYSUTCDATETIME(), N'Khách hàng hủy đơn')");

    if (order.paymentMethod === 'payos') {
      await cancelPayOSPaymentLinkByOrderId(req.params.id, 'Khach hang huy don');
    }

    return res.json({ message: 'Order cancelled' });
  } catch (error) {
    return next(error);
  }
});

// Customer submit return request
router.post('/:id/return-request', authMiddleware, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason is required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('userId', sql.NVarChar, req.user.userId)
      .query("SELECT TOP 1 id, [status], returnRequest FROM dbo.orders WHERE id = @id AND userId = @userId");

    const order = result.recordset[0];
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Chỉ có thể yêu cầu hoàn hàng sau khi đã giao' });
    }
    if (order.returnRequest) {
      return res.status(409).json({ message: 'Đã tồn tại yêu cầu hoàn hàng' });
    }

    const returnRequest = { reason, status: 'pending', createdAt: new Date().toISOString() };
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('returnRequest', sql.NVarChar(sql.MAX), JSON.stringify(returnRequest))
      .query("UPDATE dbo.orders SET returnRequest = @returnRequest WHERE id = @id");

    return res.status(201).json({ message: 'Return request submitted', returnRequest });
  } catch (error) {
    return next(error);
  }
});

// ==================== ADMIN ====================

// Get ALL orders (admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const pool = await getPool();
    const orders = await buildAllOrders(pool, { status, q });
    return res.json(orders);
  } catch (error) {
    return next(error);
  }
});

// Update order status (admin)
router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled', 'returned'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const pool = await getPool();
    const orderResult = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT TOP 1 id, [status], paymentStatus, voucherCode, paymentMethod FROM dbo.orders WHERE id = @id');

    const order = orderResult.recordset[0];
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === status) {
      return res.status(200).json({ message: 'Order status unchanged' });
    }

    const allowedNextStatuses = allowedOrderTransitions[order.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      return res.status(409).json({ message: `Không thể chuyển đơn từ ${order.status} sang ${status}` });
    }

    let nextPaymentStatus = order.paymentStatus;
    if (status === 'cancelled' && order.paymentStatus === 'paid') {
      nextPaymentStatus = 'refunded';
    }

    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('status', sql.NVarChar, status)
      .input('paymentStatus', sql.NVarChar, nextPaymentStatus)
      .query("UPDATE dbo.orders SET [status] = @status, paymentStatus = @paymentStatus WHERE id = @id");

    if (status === 'cancelled' && order.voucherCode) {
      await adjustVoucherUsage(pool, order.voucherCode, 'decrement');
    }

    if (status === 'cancelled' && order.paymentMethod === 'payos') {
      await cancelPayOSPaymentLinkByOrderId(req.params.id, 'Admin huy don');
    }

    await pool.request()
      .input('orderId', sql.NVarChar, req.params.id)
      .input('status', sql.NVarChar, status)
      .input('note', sql.NVarChar, note || null)
      .query("INSERT INTO dbo.order_timeline (orderId, status, date, note) VALUES (@orderId, @status, SYSUTCDATETIME(), @note)");

    return res.json({ message: 'Order status updated', paymentStatus: nextPaymentStatus });
  } catch (error) {
    return next(error);
  }
});

// Approve/reject return request (admin)
router.patch('/:id/return', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { action, note } = req.body; // action: 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approved or rejected' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT TOP 1 returnRequest FROM dbo.orders WHERE id = @id');

    const order = result.recordset[0];
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const returnRequest = safeJsonParse(order.returnRequest, null);
    if (!returnRequest) return res.status(400).json({ message: 'No return request found' });
    if (returnRequest.status !== 'pending') {
      return res.status(409).json({ message: 'Return request already resolved' });
    }

    returnRequest.status = action;
    returnRequest.resolvedAt = new Date().toISOString();
    if (note) returnRequest.note = note;

    const newOrderStatus = action === 'approved' ? 'returned' : 'delivered';
    const paymentStatus = action === 'approved' ? 'refunded' : undefined;

    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('returnRequest', sql.NVarChar(sql.MAX), JSON.stringify(returnRequest))
      .input('status', sql.NVarChar, newOrderStatus)
      .input('paymentStatus', sql.NVarChar, paymentStatus)
      .query(action === 'approved'
        ? "UPDATE dbo.orders SET returnRequest = @returnRequest, [status] = @status, paymentStatus = @paymentStatus WHERE id = @id"
        : "UPDATE dbo.orders SET returnRequest = @returnRequest, [status] = @status WHERE id = @id");

    await pool.request()
      .input('orderId', sql.NVarChar, req.params.id)
      .input('status', sql.NVarChar, newOrderStatus)
      .input('note', sql.NVarChar, note || (action === 'approved' ? 'Đã duyệt hoàn hàng' : 'Từ chối hoàn hàng'))
      .query("INSERT INTO dbo.order_timeline (orderId, status, date, note) VALUES (@orderId, @status, SYSUTCDATETIME(), @note)");

    return res.json({ message: `Return request ${action}` });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
