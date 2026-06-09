const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// Simple in-memory rate limiter (production should use Redis)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // 10 attempts per window

function rateLimitMiddleware(req, res, next) {
  const key = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const record = rateLimitStore.get(key);

  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      valid: false,
      message: 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.'
    });
  }

  record.count++;
  return next();
}

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Admin: list all vouchers with search/filter
router.get('/manage', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { q, status, type, sort } = req.query;
    const pool = await getPool();
    const request = pool.request();
    const conditions = [];

    if (q) {
      request.input('q', sql.NVarChar, `%${String(q)}%`);
      conditions.push('(code LIKE @q OR description LIKE @q)');
    }

    if (status && status !== 'all') {
      if (status === 'expired') {
        conditions.push("(endDate < SYSUTCDATETIME() OR [status] = 'expired')");
      } else if (status === 'active') {
        conditions.push("[status] = 'active' AND endDate >= SYSUTCDATETIME()");
      } else if (status === 'inactive') {
        conditions.push("[status] = 'inactive' AND endDate >= SYSUTCDATETIME()");
      }
    }

    if (type && type !== 'all') {
      request.input('typeFilter', sql.NVarChar, type);
      conditions.push('[type] = @typeFilter');
    }

    let orderBy = 'startDate DESC';
    if (sort === 'ending_soon') orderBy = 'endDate ASC';
    if (sort === 'usage_desc') orderBy = 'usedCount DESC, startDate DESC';
    if (sort === 'code_asc') orderBy = 'code ASC';

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await request.query(`
      SELECT *
      FROM dbo.vouchers
      ${where}
      ORDER BY ${orderBy}
    `);

    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
});

// Public: list active vouchers only
router.get('/', async (_req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT * FROM dbo.vouchers
        WHERE [status] = 'active'
          AND startDate <= SYSUTCDATETIME()
          AND endDate >= SYSUTCDATETIME()
        ORDER BY startDate DESC
      `);
    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
});

// Public: validate voucher with rate limiting
router.post('/validate', rateLimitMiddleware, async (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code) return res.status(400).json({ valid: false, message: 'Voucher code is required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('code', sql.NVarChar, String(code).toUpperCase())
      .query('SELECT TOP 1 * FROM dbo.vouchers WHERE code = @code');

    const voucher = result.recordset[0];
    if (!voucher) {
      return res.status(404).json({ valid: false, message: 'Voucher không tồn tại' });
    }

    const now = new Date();
    if (voucher.status !== 'active') {
      return res.status(400).json({ valid: false, message: 'Voucher không còn hiệu lực' });
    }

    if (new Date(voucher.startDate) > now) {
      return res.status(400).json({ valid: false, message: 'Voucher chưa có hiệu lực' });
    }

    if (new Date(voucher.endDate) < now) {
      return res.status(400).json({ valid: false, message: 'Voucher đã hết hạn' });
    }

    if (Number(subtotal) < Number(voucher.minOrderValue)) {
      return res.status(400).json({
        valid: false,
        message: `Đơn hàng tối thiểu ${Number(voucher.minOrderValue).toLocaleString('vi-VN')} VNĐ`
      });
    }

    if (voucher.usedCount >= voucher.usageLimit) {
      return res.status(400).json({ valid: false, message: 'Voucher đã hết lượt sử dụng' });
    }

    // Calculate discount
    let discount;
    if (voucher.type === 'fixed') {
      discount = Number(voucher.value);
    } else {
      const percentageDiscount = (Number(subtotal) * Number(voucher.value)) / 100;
      discount = voucher.maxDiscount
        ? Math.min(percentageDiscount, Number(voucher.maxDiscount))
        : percentageDiscount;
    }

    return res.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        type: voucher.type,
        value: Number(voucher.value),
        minOrderValue: Number(voucher.minOrderValue),
        maxDiscount: voucher.maxDiscount ? Number(voucher.maxDiscount) : null,
        description: voucher.description,
      },
      discount: Math.round(discount)
    });
  } catch (error) {
    return next(error);
  }
});

// Admin: create voucher with comprehensive validation
router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const {
      code, type, value, minOrderValue = 0, maxDiscount = null,
      usageLimit = 100, startDate, endDate, description = ''
    } = req.body;

    // Required fields validation
    if (!code || !type || !value || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required voucher fields' });
    }

    // Type validation
    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ message: 'Type must be percentage or fixed' });
    }

    // Value validation
    if (Number(value) <= 0) {
      return res.status(400).json({ message: 'Value must be greater than 0' });
    }

    if (type === 'percentage' && Number(value) > 100) {
      return res.status(400).json({ message: 'Percentage value cannot exceed 100' });
    }

    // Usage limit validation
    if (Number(usageLimit) <= 0) {
      return res.status(400).json({ message: 'Usage limit must be greater than 0' });
    }

    // Date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Min order value validation
    if (Number(minOrderValue) < 0) {
      return res.status(400).json({ message: 'Minimum order value cannot be negative' });
    }

    // Max discount validation
    if (maxDiscount && Number(maxDiscount) <= 0) {
      return res.status(400).json({ message: 'Max discount must be greater than 0' });
    }

    const pool = await getPool();

    // Check for duplicate code (case-insensitive)
    const existing = await pool.request()
      .input('code', sql.NVarChar, code.toUpperCase())
      .query('SELECT TOP 1 id FROM dbo.vouchers WHERE UPPER(code) = @code');

    if (existing.recordset.length > 0) {
      return res.status(409).json({ message: 'Voucher code already exists' });
    }

    const id = `v-${Date.now()}`;
    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('code', sql.NVarChar, code.toUpperCase())
      .input('type', sql.NVarChar, type)
      .input('value', sql.Decimal(18, 2), value)
      .input('minOrderValue', sql.Decimal(18, 2), minOrderValue)
      .input('maxDiscount', sql.Decimal(18, 2), maxDiscount)
      .input('usageLimit', sql.Int, usageLimit)
      .input('startDate', sql.DateTime2, start)
      .input('endDate', sql.DateTime2, end)
      .input('description', sql.NVarChar, description)
      .query(`
        INSERT INTO dbo.vouchers (
          id, code, [type], value, minOrderValue, maxDiscount,
          usageLimit, usedCount, startDate, endDate, [status], description
        )
        VALUES (
          @id, @code, @type, @value, @minOrderValue, @maxDiscount,
          @usageLimit, 0, @startDate, @endDate, 'active', @description
        )
      `);

    return res.status(201).json({ id, message: 'Voucher created' });
  } catch (error) {
    return next(error);
  }
});

// Admin: update voucher (code cannot be changed)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const {
      type, value, minOrderValue, maxDiscount, usageLimit,
      startDate, endDate, description, status
    } = req.body;

    // Validate if provided
    if (type && !['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ message: 'Type must be percentage or fixed' });
    }

    if (value && Number(value) <= 0) {
      return res.status(400).json({ message: 'Value must be greater than 0' });
    }

    if (type === 'percentage' && value && Number(value) > 100) {
      return res.status(400).json({ message: 'Percentage value cannot exceed 100' });
    }

    if (usageLimit && Number(usageLimit) <= 0) {
      return res.status(400).json({ message: 'Usage limit must be greater than 0' });
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    }

    if (status && !['active', 'inactive', 'expired'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const pool = await getPool();

    // Check if voucher exists
    const existing = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT TOP 1 id FROM dbo.vouchers WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('type', sql.NVarChar, type || null)
      .input('value', sql.Decimal(18, 2), value || null)
      .input('minOrderValue', sql.Decimal(18, 2), minOrderValue != null ? minOrderValue : null)
      .input('maxDiscount', sql.Decimal(18, 2), maxDiscount || null)
      .input('usageLimit', sql.Int, usageLimit || null)
      .input('startDate', sql.DateTime2, startDate ? new Date(startDate) : null)
      .input('endDate', sql.DateTime2, endDate ? new Date(endDate) : null)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status || null)
      .query(`
        UPDATE dbo.vouchers SET
          [type]        = COALESCE(@type, [type]),
          value         = COALESCE(@value, value),
          minOrderValue = COALESCE(@minOrderValue, minOrderValue),
          maxDiscount   = COALESCE(@maxDiscount, maxDiscount),
          usageLimit    = COALESCE(@usageLimit, usageLimit),
          startDate     = COALESCE(@startDate, startDate),
          endDate       = COALESCE(@endDate, endDate),
          description   = COALESCE(@description, description),
          [status]      = COALESCE(@status, [status])
        WHERE id = @id
      `);

    return res.json({ message: 'Voucher updated' });
  } catch (error) {
    return next(error);
  }
});

// Admin: delete voucher
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();

    // Check if voucher is used in any orders
    const usageCheck = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`
        SELECT COUNT(*) as orderCount
        FROM dbo.orders o
        INNER JOIN dbo.vouchers v ON v.code = o.voucherCode
        WHERE v.id = @id
      `);

    if (usageCheck.recordset[0]?.orderCount > 0) {
      return res.status(409).json({
        message: 'Cannot delete voucher that has been used in orders. Consider deactivating it instead.'
      });
    }

    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('DELETE FROM dbo.vouchers WHERE id = @id');

    return res.json({ message: 'Voucher deleted' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
