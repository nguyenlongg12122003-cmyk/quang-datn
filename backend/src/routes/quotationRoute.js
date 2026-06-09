const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { safeJsonParse } = require('../utils/mapRows');
const { mapProductRow } = require('../utils/mapRows');
const {
  resolvePackagingSelection,
  calculateCustomizationExtra,
} = require('../services/priceService');
const { createOrderTransaction } = require('../services/orderService');
const { getBusinessProfileByUserId } = require('./businessRoute');

const router = express.Router();

const VALID_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'converted', 'expired'];
const EXPIRABLE_STATUSES = ['draft', 'sent', 'accepted'];

async function expireStaleQuotations(pool, rows) {
  if (!rows.length) return rows;

  const now = Date.now();
  const staleIds = rows
    .filter(
      (row) =>
        EXPIRABLE_STATUSES.includes(row.status) &&
        new Date(row.validUntil).getTime() < now,
    )
    .map((row) => row.id);

  if (staleIds.length > 0) {
    const request = pool.request();
    staleIds.forEach((id, index) => request.input(`sid${index}`, sql.NVarChar, id));
    const placeholders = staleIds.map((_, index) => `@sid${index}`).join(', ');
    await request.query(`
      UPDATE dbo.quotations
      SET [status] = 'expired', updatedAt = SYSUTCDATETIME()
      WHERE id IN (${placeholders}) AND [status] IN ('draft', 'sent', 'accepted')
    `);
  }

  const staleSet = new Set(staleIds);
  return rows.map((row) => (staleSet.has(row.id) ? { ...row, status: 'expired' } : row));
}

function mapQuotationRow(row, items = []) {
  return {
    id: row.id,
    userId: row.userId,
    code: row.code,
    status: row.status,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    note: row.note,
    validUntil: row.validUntil,
    convertedOrderId: row.convertedOrderId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userName: row.userName,
    userEmail: row.userEmail,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      sku: item.sku,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      packagingUnit: item.packagingUnit,
      packagingQty: Number(item.packagingQty || 1),
      customization: safeJsonParse(item.customization, null),
    })),
  };
}

async function loadQuotationItems(pool, quotationIds) {
  if (!quotationIds.length) return [];
  const request = pool.request();
  quotationIds.forEach((id, index) => request.input(`qid${index}`, sql.NVarChar, id));
  const placeholders = quotationIds.map((_, index) => `@qid${index}`).join(', ');
  const result = await request.query(`
    SELECT * FROM dbo.quotation_items WHERE quotationId IN (${placeholders})
  `);
  return result.recordset;
}

async function getCustomerType(pool, userId) {
  const result = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query('SELECT TOP 1 customerType FROM dbo.users WHERE id = @userId');
  return result.recordset[0]?.customerType || 'retail';
}

async function buildQuotationItem(pool, userId, rawItem) {
  const productResult = await pool.request()
    .input('productId', sql.NVarChar, rawItem.productId)
    .query('SELECT TOP 1 * FROM dbo.products WHERE id = @productId');

  const product = mapProductRow(productResult.recordset[0]);
  if (!product) {
    throw new Error(`Sản phẩm không tồn tại: ${rawItem.productId}`);
  }

  const customerType = await getCustomerType(pool, userId);
  const packaging = resolvePackagingSelection(
    product,
    rawItem.packagingUnit,
    rawItem.packagingQty || rawItem.quantity,
    customerType,
  );

  const { extraPrice, normalized } = calculateCustomizationExtra(product, rawItem.customization);
  const unitPrice = packaging.unitPrice + extraPrice;
  const images = product.images || [];
  const productImage = images[0]?.url || rawItem.productImage || '';

  return {
    productId: product.id,
    productName: product.name,
    productImage,
    sku: product.sku,
    unitPrice,
    quantity: packaging.quantity,
    packagingUnit: packaging.packagingUnit,
    packagingQty: packaging.packagingQty,
    customization: normalized,
    lineTotal: unitPrice * packaging.quantity,
  };
}

router.get('/my', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.NVarChar, req.user.userId)
      .query('SELECT * FROM dbo.quotations WHERE userId = @userId ORDER BY createdAt DESC');

    const rows = await expireStaleQuotations(pool, result.recordset);
    const items = await loadQuotationItems(pool, rows.map((row) => row.id));
    const itemsByQuotation = items.reduce((acc, row) => {
      acc[row.quotationId] = acc[row.quotationId] || [];
      acc[row.quotationId].push(row);
      return acc;
    }, {});

    return res.json(rows.map((row) => mapQuotationRow(row, itemsByQuotation[row.id] || [])));
  } catch (error) {
    return next(error);
  }
});

router.get('/manage', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const pool = await getPool();
    const request = pool.request();
    const conditions = [];

    if (status && status !== 'all') {
      request.input('status', sql.NVarChar, status);
      conditions.push('q.[status] = @status');
    }
    if (q) {
      request.input('q', sql.NVarChar, `%${q}%`);
      conditions.push('(q.code LIKE @q OR u.name LIKE @q OR u.email LIKE @q)');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await request.query(`
      SELECT q.*, u.name AS userName, u.email AS userEmail
      FROM dbo.quotations q
      INNER JOIN dbo.users u ON u.id = q.userId
      ${where}
      ORDER BY q.createdAt DESC
    `);

    const rows = await expireStaleQuotations(pool, result.recordset);
    const items = await loadQuotationItems(pool, rows.map((row) => row.id));
    const itemsByQuotation = items.reduce((acc, row) => {
      acc[row.quotationId] = acc[row.quotationId] || [];
      acc[row.quotationId].push(row);
      return acc;
    }, {});

    return res.json(rows.map((row) => mapQuotationRow(row, itemsByQuotation[row.id] || [])));
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`
        SELECT q.*, u.name AS userName, u.email AS userEmail
        FROM dbo.quotations q
        INNER JOIN dbo.users u ON u.id = q.userId
        WHERE q.id = @id
      `);

    let row = result.recordset[0];
    if (!row) return res.status(404).json({ message: 'Báo giá không tồn tại' });
    if (row.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    [row] = await expireStaleQuotations(pool, [row]);
    const items = await loadQuotationItems(pool, [row.id]);
    return res.json(mapQuotationRow(row, items));
  } catch (error) {
    return next(error);
  }
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { items, note, validDays = 7, discount = 0 } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Danh sách sản phẩm báo giá là bắt buộc' });
    }

    const pool = await getPool();
    const profile = await getBusinessProfileByUserId(pool, req.user.userId);
    if (!profile || profile.status !== 'approved') {
      return res.status(403).json({ message: 'Chỉ khách hàng doanh nghiệp đã duyệt mới tạo được báo giá' });
    }

    const builtItems = [];
    for (const rawItem of items) {
      builtItems.push(await buildQuotationItem(pool, req.user.userId, rawItem));
    }

    const subtotal = builtItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const normalizedDiscount = Math.max(0, Number(discount || 0));
    const total = Math.max(0, subtotal - normalizedDiscount);
    const id = `quo-${Date.now()}`;
    const code = `BG-${Date.now().toString().slice(-8)}`;
    const validUntil = new Date();
    validUntil.setUTCDate(validUntil.getUTCDate() + Math.max(1, Number(validDays) || 7));

    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('userId', sql.NVarChar, req.user.userId)
      .input('code', sql.NVarChar, code)
      .input('status', sql.NVarChar, 'sent')
      .input('subtotal', sql.Decimal(18, 2), subtotal)
      .input('discount', sql.Decimal(18, 2), normalizedDiscount)
      .input('total', sql.Decimal(18, 2), total)
      .input('note', sql.NVarChar(sql.MAX), note || null)
      .input('validUntil', sql.DateTime2, validUntil)
      .query(`
        INSERT INTO dbo.quotations (
          id, userId, code, [status], subtotal, discount, total, note, validUntil, createdAt, updatedAt
        )
        VALUES (
          @id, @userId, @code, @status, @subtotal, @discount, @total, @note, @validUntil,
          SYSUTCDATETIME(), SYSUTCDATETIME()
        )
      `);

    for (const item of builtItems) {
      await pool.request()
        .input('quotationId', sql.NVarChar, id)
        .input('productId', sql.NVarChar, item.productId)
        .input('productName', sql.NVarChar, item.productName)
        .input('productImage', sql.NVarChar, item.productImage)
        .input('sku', sql.NVarChar, item.sku)
        .input('unitPrice', sql.Decimal(18, 2), item.unitPrice)
        .input('quantity', sql.Int, item.quantity)
        .input('packagingUnit', sql.NVarChar, item.packagingUnit)
        .input('packagingQty', sql.Int, item.packagingQty)
        .input('customization', sql.NVarChar(sql.MAX), JSON.stringify(item.customization))
        .query(`
          INSERT INTO dbo.quotation_items (
            quotationId, productId, productName, productImage, sku, unitPrice,
            quantity, packagingUnit, packagingQty, customization
          )
          VALUES (
            @quotationId, @productId, @productName, @productImage, @sku, @unitPrice,
            @quantity, @packagingUnit, @packagingQty, @customization
          )
        `);
    }

    const created = await pool.request()
      .input('id', sql.NVarChar, id)
      .query(`
        SELECT q.*, u.name AS userName, u.email AS userEmail
        FROM dbo.quotations q
        INNER JOIN dbo.users u ON u.id = q.userId
        WHERE q.id = @id
      `);
    const quotationItems = await loadQuotationItems(pool, [id]);
    return res.status(201).json(mapQuotationRow(created.recordset[0], quotationItems));
  } catch (error) {
    if (error.message?.includes('không tồn tại') || error.message?.includes('không hợp lệ')) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái báo giá không hợp lệ' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('status', sql.NVarChar, status)
      .query('UPDATE dbo.quotations SET [status] = @status, updatedAt = SYSUTCDATETIME() WHERE id = @id');

    if (!result.rowsAffected[0]) {
      return res.status(404).json({ message: 'Báo giá không tồn tại' });
    }

    return res.json({ message: 'Cập nhật trạng thái báo giá thành công' });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/convert', authMiddleware, async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod = 'cod', shippingMethod = 'standard', note } = req.body;
    const pool = await getPool();

    const quotationResult = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT TOP 1 * FROM dbo.quotations WHERE id = @id');

    const quotation = quotationResult.recordset[0];
    if (!quotation) return res.status(404).json({ message: 'Báo giá không tồn tại' });
    if (quotation.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền chuyển đổi báo giá' });
    }
    if (quotation.status !== 'accepted') {
      return res.status(400).json({ message: 'Chỉ báo giá đã được duyệt mới có thể chuyển thành đơn hàng' });
    }
    if (new Date(quotation.validUntil).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Báo giá đã hết hạn' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ message: 'Vui lòng chọn địa chỉ giao hàng' });
    }

    const items = await loadQuotationItems(pool, [quotation.id]);
    const created = await createOrderTransaction(pool, {
      userId: quotation.userId,
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        price: Number(item.unitPrice),
        quantity: Number(item.quantity),
        packagingUnit: item.packagingUnit,
        packagingQty: Number(item.packagingQty || 1),
        customization: safeJsonParse(item.customization, null),
      })),
      shippingFee: 0,
      discount: Number(quotation.discount),
      paymentMethod,
      shippingMethod,
      shippingAddress,
      note: note || quotation.note,
      quotationId: quotation.id,
      createdBy: req.user.userId,
    });

    return res.status(201).json({
      message: 'Chuyển báo giá thành đơn hàng thành công',
      orderId: created.id,
      estimatedDeliveryDate: created.estimatedDeliveryDate,
    });
  } catch (error) {
    if (error.message && !error.code) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

module.exports = router;