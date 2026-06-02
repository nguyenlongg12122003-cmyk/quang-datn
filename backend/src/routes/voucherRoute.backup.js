const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public: list active vouchers
router.get('/', async (_req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM dbo.vouchers ORDER BY startDate DESC');
    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
});

// Public: validate voucher
router.post('/validate', async (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code) return res.status(400).json({ message: 'Voucher code is required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('code', sql.NVarChar, String(code).toUpperCase())
      .query('SELECT TOP 1 * FROM dbo.vouchers WHERE code = @code');

    const voucher = result.recordset[0];
    if (!voucher) return res.status(404).json({ valid: false, message: 'Voucher không tồn tại' });

    const now = new Date();
    if (voucher.status !== 'active' || new Date(voucher.startDate) > now || new Date(voucher.endDate) < now) {
      return res.status(400).json({ valid: false, message: 'Voucher không còn hiệu lực' });
    }
    if (Number(subtotal) < Number(voucher.minOrderValue)) {
      return res.status(400).json({ valid: false, message: `Đơn hàng tối thiểu ${voucher.minOrderValue}` });
    }
    if (voucher.usedCount >= voucher.usageLimit) {
      return res.status(400).json({ valid: false, message: 'Voucher đã hết lượt sử dụng' });
    }

    const discount = voucher.type === 'fixed'
      ? Number(voucher.value)
      : Math.min((Number(subtotal) * Number(voucher.value)) / 100, Number(voucher.maxDiscount || Number.MAX_SAFE_INTEGER));

    return res.json({ valid: true, voucher, discount });
  } catch (error) {
    return next(error);
  }
});

// Admin: create voucher
router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { code, type, value, minOrderValue = 0, maxDiscount = null, usageLimit = 100, startDate, endDate, description = '' } = req.body;
    if (!code || !type || !value || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required voucher fields' });
    }
    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ message: 'Type must be percentage or fixed' });
    }

    const pool = await getPool();
    const existing = await pool.request()
      .input('code', sql.NVarChar, code.toUpperCase())
      .query('SELECT TOP 1 id FROM dbo.vouchers WHERE code = @code');
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
      .input('startDate', sql.DateTime2, new Date(startDate))
      .input('endDate', sql.DateTime2, new Date(endDate))
      .input('description', sql.NVarChar, description)
      .query(`
        INSERT INTO dbo.vouchers (id, code, [type], value, minOrderValue, maxDiscount, usageLimit, usedCount, startDate, endDate, [status], description)
        VALUES (@id, @code, @type, @value, @minOrderValue, @maxDiscount, @usageLimit, 0, @startDate, @endDate, 'active', @description)
      `);

    return res.status(201).json({ id, message: 'Voucher created' });
  } catch (error) {
    return next(error);
  }
});

// Admin: update voucher
router.put('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { type, value, minOrderValue, maxDiscount, usageLimit, startDate, endDate, description, status } = req.body;
    const pool = await getPool();

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
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('DELETE FROM dbo.vouchers WHERE id = @id');
    return res.json({ message: 'Voucher deleted' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
