const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { safeJsonParse } = require('../utils/mapRows');


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

router.post('/', authMiddleware, async (req, res) => {
  return res.status(410).json({
    message: 'Tính năng báo giá B2B đã ngừng. Vui lòng mua trực tiếp qua giỏ hàng với tài khoản doanh nghiệp đã duyệt.',
  });
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

router.post('/:id/convert', authMiddleware, async (req, res) => {
  return res.status(410).json({
    message: 'Tính năng chuyển báo giá thành đơn đã ngừng. Vui lòng mua trực tiếp qua giỏ hàng.',
  });
});

module.exports = router;