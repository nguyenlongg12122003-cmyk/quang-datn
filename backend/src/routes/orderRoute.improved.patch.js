// Patch for orderRoute.js - Add this at the top after other requires
const { validateAndReserveVoucher, releaseVoucher, recordVoucherUsage } = require('../libs/voucherService');

// Replace the order creation endpoint (router.post('/')) with this improved version:

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      items, shippingFee, voucherCode, note,
      paymentMethod, shippingMethod, shippingAddress,
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
    let computedSubtotal = 0;
    let validatedDiscount = 0;
    let voucherData = null;

    // Step 1: Calculate subtotal from items
    const validatedItems = [];
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

      validatedItems.push({
        productId: item.productId,
        productName: product.name || item.productName || '',
        productImage: productImage || item.productImage || '',
        price: finalUnitPrice,
        quantity: quantityValue,
        customization: normalizedCustomization,
      });
    }

    // Step 2: Validate and reserve voucher (atomic operation with row lock)
    try {
      const voucherResult = await validateAndReserveVoucher(
        pool,
        voucherCode,
        computedSubtotal,
        req.user.userId
      );
      validatedDiscount = voucherResult.discount;
      voucherData = voucherResult.voucherData;
    } catch (voucherError) {
      return res.status(400).json({ message: voucherError.message });
    }

    // Step 3: Create order with validated data
    const computedTotal = Math.max(0, computedSubtotal + normalizedShippingFee - validatedDiscount);

    try {
      await pool.request()
        .input('id', sql.NVarChar, orderId)
        .input('userId', sql.NVarChar, req.user.userId)
        .input('subtotal', sql.Decimal(18, 2), computedSubtotal)
        .input('shippingFee', sql.Decimal(18, 2), normalizedShippingFee)
        .input('discount', sql.Decimal(18, 2), validatedDiscount)
        .input('total', sql.Decimal(18, 2), computedTotal)
        .input('status', sql.NVarChar, 'pending')
        .input('paymentMethod', sql.NVarChar, normalizedPaymentMethod)
        .input('paymentStatus', sql.NVarChar, 'pending')
        .input('shippingMethod', sql.NVarChar, shippingMethod || 'standard')
        .input('shippingAddress', sql.NVarChar(sql.MAX), JSON.stringify(shippingAddress || {}))
        .input('voucherCode', sql.NVarChar, voucherCode ? voucherCode.toUpperCase() : null)
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

      // Insert order items
      for (const item of validatedItems) {
        await pool.request()
          .input('orderId', sql.NVarChar, orderId)
          .input('productId', sql.NVarChar, item.productId)
          .input('productName', sql.NVarChar, item.productName)
          .input('productImage', sql.NVarChar, item.productImage)
          .input('price', sql.Decimal(18, 2), item.price)
          .input('quantity', sql.Int, item.quantity)
          .input('customization', sql.NVarChar(sql.MAX), JSON.stringify(item.customization))
          .query('INSERT INTO dbo.order_items (orderId, productId, productName, productImage, price, quantity, customization) VALUES (@orderId, @productId, @productName, @productImage, @price, @quantity, @customization)');
      }

      // Insert timeline
      await pool.request()
        .input('orderId', sql.NVarChar, orderId)
        .query("INSERT INTO dbo.order_timeline (orderId, status, date, note) VALUES (@orderId, 'pending', SYSUTCDATETIME(), NULL)");

      // Record voucher usage in audit trail
      if (voucherData) {
        await recordVoucherUsage(pool, voucherData.id, req.user.userId, orderId, validatedDiscount);
      }

    } catch (orderError) {
      // Rollback: Release voucher if order creation failed
      if (voucherCode) {
        await releaseVoucher(pool, voucherCode);
      }
      throw orderError;
    }

    // Step 4: Handle payment gateway redirects
    if (normalizedPaymentMethod === 'vnpay') {
      const vnpay = getVNPayGateway();
      if (!vnpay) {
        // Rollback order and voucher
        await pool.request().input('id', sql.NVarChar, orderId).query('DELETE FROM dbo.orders WHERE id = @id');
        await pool.request().input('orderId', sql.NVarChar, orderId).query('DELETE FROM dbo.order_items WHERE orderId = @orderId');
        if (voucherCode) await releaseVoucher(pool, voucherCode);
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
        // Rollback order and voucher
        await pool.request().input('id', sql.NVarChar, orderId).query('DELETE FROM dbo.orders WHERE id = @id');
        await pool.request().input('orderId', sql.NVarChar, orderId).query('DELETE FROM dbo.order_items WHERE orderId = @orderId');
        if (voucherCode) await releaseVoucher(pool, voucherCode);
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

// Replace customer cancel endpoint (router.post('/:id/cancel')) with this improved version:

router.post('/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('userId', sql.NVarChar, req.user.userId)
      .query("SELECT TOP 1 id, [status], paymentMethod, paymentStatus, voucherCode FROM dbo.orders WHERE id = @id AND userId = @userId");

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

    // Release voucher if not yet paid
    if (order.voucherCode && order.paymentStatus !== 'paid') {
      await releaseVoucher(pool, order.voucherCode);
    }

    if (order.paymentMethod === 'payos') {
      await cancelPayOSPaymentLinkByOrderId(req.params.id, 'Khach hang huy don');
    }

    return res.json({ message: 'Order cancelled' });
  } catch (error) {
    return next(error);
  }
});
