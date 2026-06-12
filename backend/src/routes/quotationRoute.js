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

const VALID_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'converted', 'expired', 'cancelled'];
const EXPIRABLE_STATUSES = ['draft', 'sent', 'accepted']; // cancelled and converted/expired/rejected are terminal and not auto-expired
// NOTE: 'draft' kept in VALID for backward/read compat with seed/legacy data.
// New quotations are always created as 'sent' (no user-facing draft flow). Admin edit may still target legacy draft.

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
    const { items, note, validDays = 7 } = req.body;
    // IMPORTANT: User-provided discount has been removed (Phase 1 improvement).
    // All new quotations start with discount=0. Admin can adjust via the edit PATCH later (negotiation).
    // This prevents abuse and moves pricing power to the B2B review process.
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
    const normalizedDiscount = 0; // server-enforced: no user discount at creation time
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

    // Eager expire before allowing status change
    const loadRes = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`
        SELECT q.*, u.name AS userName, u.email AS userEmail
        FROM dbo.quotations q
        INNER JOIN dbo.users u ON u.id = q.userId
        WHERE q.id = @id
      `);
    let row = loadRes.recordset[0];
    if (!row) return res.status(404).json({ message: 'Báo giá không tồn tại' });
    [row] = await expireStaleQuotations(pool, [row]);

    // If it expired during the check, reflect it
    if (row.status === 'expired' && status !== 'expired') {
      return res.status(400).json({ message: 'Báo giá đã hết hạn, không thể thay đổi trạng thái khác' });
    }

    const updateRes = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('status', sql.NVarChar, status)
      .query('UPDATE dbo.quotations SET [status] = @status, updatedAt = SYSUTCDATETIME() WHERE id = @id');

    if (!updateRes.rowsAffected[0]) {
      return res.status(404).json({ message: 'Báo giá không tồn tại' });
    }

    return res.json({ message: 'Cập nhật trạng thái báo giá thành công' });
  } catch (error) {
    return next(error);
  }
});

// User (or admin) can cancel their own pending 'sent' quotations.
// This is a quick win to give users control before admin review.
router.post('/:id/cancel', authMiddleware, async (req, res, next) => {
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

    [row] = await expireStaleQuotations(pool, [row]);

    const isOwner = row.userId === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Không có quyền hủy báo giá này' });
    }

    if (row.status !== 'sent') {
      return res.status(400).json({ message: 'Chỉ có thể hủy báo giá đang chờ duyệt (Đã gửi)' });
    }

    await pool.request()
      .input('id', sql.NVarChar, row.id)
      .query('UPDATE dbo.quotations SET [status] = \'cancelled\', updatedAt = SYSUTCDATETIME() WHERE id = @id');

    const updatedItems = await loadQuotationItems(pool, [row.id]);
    const updated = { ...row, status: 'cancelled' };
    return res.json({
      message: 'Đã hủy báo giá',
      quotation: mapQuotationRow(updated, updatedItems),
    });
  } catch (error) {
    return next(error);
  }
});

// Admin can edit a pending quotation for B2B negotiation.
// Supports: discount, validUntil, note, and per-item unitPrice overrides.
// Server always recomputes totals from (possibly overridden) item snapshots.
// Only allowed on 'sent' / 'draft' (pre-accept).
router.patch('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { discount, validUntil, note, itemPriceOverrides } = req.body || {};
    const pool = await getPool();

    const loadRes = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`
        SELECT q.*, u.name AS userName, u.email AS userEmail
        FROM dbo.quotations q
        INNER JOIN dbo.users u ON u.id = q.userId
        WHERE q.id = @id
      `);

    let row = loadRes.recordset[0];
    if (!row) return res.status(404).json({ message: 'Báo giá không tồn tại' });

    [row] = await expireStaleQuotations(pool, [row]);

    if (!['sent', 'draft'].includes(row.status)) {
      return res.status(400).json({ message: 'Chỉ chỉnh sửa được báo giá đang chờ duyệt' });
    }

    let items = await loadQuotationItems(pool, [row.id]);

    // Apply item price overrides (immutable copies for safety)
    const overrides = itemPriceOverrides && typeof itemPriceOverrides === 'object' ? itemPriceOverrides : {};
    let hasOverrides = false;

    items = items.map((item) => {
      const override = overrides[item.id] || overrides[String(item.id)];
      if (override && typeof override.unitPrice === 'number' && override.unitPrice >= 0) {
        hasOverrides = true;
        return { ...item, unitPrice: Number(override.unitPrice) };
      }
      return item;
    });

    // Recompute from (possibly overridden) items
    const baseSubtotal = items.reduce((sum, it) => sum + Number(it.unitPrice) * Number(it.quantity), 0);

    const newDiscount = discount != null ? Math.max(0, Number(discount)) : Number(row.discount);
    let newValidUntil = row.validUntil;
    if (validUntil) {
      newValidUntil = new Date(validUntil);
      if (newValidUntil.getTime() < Date.now()) {
        return res.status(400).json({ message: 'Ngày hết hạn phải ở tương lai' });
      }
    }
    const newNote = note !== undefined ? (note || null) : row.note;

    const newTotal = Math.max(0, baseSubtotal - newDiscount);

    // Update quotation header
    await pool.request()
      .input('id', sql.NVarChar, row.id)
      .input('discount', sql.Decimal(18, 2), newDiscount)
      .input('total', sql.Decimal(18, 2), newTotal)
      .input('validUntil', sql.DateTime2, newValidUntil)
      .input('note', sql.NVarChar(sql.MAX), newNote)
      .query(`
        UPDATE dbo.quotations
        SET discount = @discount, total = @total, validUntil = @validUntil, note = @note, updatedAt = SYSUTCDATETIME()
        WHERE id = @id
      `);

    // Persist any per-item price changes (only the overridden ones)
    if (hasOverrides) {
      for (const item of items) {
        const override = overrides[item.id] || overrides[String(item.id)];
        if (override && typeof override.unitPrice === 'number') {
          await pool.request()
            .input('itemId', sql.Int, item.id)
            .input('unitPrice', sql.Decimal(18, 2), Number(override.unitPrice))
            .query('UPDATE dbo.quotation_items SET unitPrice = @unitPrice WHERE id = @itemId');
        }
      }
    }

    // Reload fresh mapped quotation
    const fresh = await pool.request()
      .input('id', sql.NVarChar, row.id)
      .query(`
        SELECT q.*, u.name AS userName, u.email AS userEmail
        FROM dbo.quotations q
        INNER JOIN dbo.users u ON u.id = q.userId
        WHERE q.id = @id
      `);
    const freshRow = fresh.recordset[0];
    const freshItems = await loadQuotationItems(pool, [row.id]);
    return res.json(mapQuotationRow(freshRow, freshItems));
  } catch (error) {
    if (error.message?.includes('không hợp lệ') || error.message?.includes('invalid')) {
      return res.status(400).json({ message: error.message });
    }
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

    let quotation = quotationResult.recordset[0];
    if (!quotation) return res.status(404).json({ message: 'Báo giá không tồn tại' });

    // Eager expire for accurate status/validity before convert decision
    [quotation] = await expireStaleQuotations(pool, [quotation]);

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