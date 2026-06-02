const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// Get my vouchers
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.NVarChar, req.user.userId)
      .query(`
        SELECT
          uv.id,
          uv.userId,
          uv.voucherId,
          uv.claimedAt,
          uv.expiresAt,
          uv.isUsed,
          uv.usedAt,
          uv.orderId,
          v.id as voucher_id,
          v.code as voucher_code,
          v.[type] as voucher_type,
          v.value as voucher_value,
          v.minOrderValue as voucher_minOrderValue,
          v.maxDiscount as voucher_maxDiscount,
          v.usageLimit as voucher_usageLimit,
          v.usedCount as voucher_usedCount,
          v.startDate as voucher_startDate,
          v.endDate as voucher_endDate,
          v.[status] as voucher_status,
          v.[description] as voucher_description
        FROM dbo.user_vouchers uv
        INNER JOIN dbo.vouchers v ON uv.voucherId = v.id
        WHERE uv.userId = @userId
        ORDER BY uv.claimedAt DESC
      `);

    const userVouchers = result.recordset.map(row => ({
      id: row.id,
      userId: row.userId,
      voucherId: row.voucherId,
      claimedAt: row.claimedAt,
      expiresAt: row.expiresAt,
      isUsed: Boolean(row.isUsed),
      usedAt: row.usedAt,
      orderId: row.orderId,
      voucher: {
        id: row.voucher_id,
        code: row.voucher_code,
        type: row.voucher_type,
        value: Number(row.voucher_value),
        minOrderValue: Number(row.voucher_minOrderValue),
        maxDiscount: row.voucher_maxDiscount ? Number(row.voucher_maxDiscount) : null,
        usageLimit: row.voucher_usageLimit,
        usedCount: row.voucher_usedCount,
        startDate: row.voucher_startDate,
        endDate: row.voucher_endDate,
        status: row.voucher_status,
        description: row.voucher_description,
      },
    }));

    return res.json(userVouchers);
  } catch (error) {
    return next(error);
  }
});

// Claim a public voucher
router.post('/:voucherId/claim', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();

    // Check if voucher exists and is active
    const voucherResult = await pool.request()
      .input('voucherId', sql.NVarChar, req.params.voucherId)
      .query(`
        SELECT * FROM dbo.vouchers
        WHERE id = @voucherId
          AND [status] = 'active'
          AND startDate <= SYSUTCDATETIME()
          AND endDate >= SYSUTCDATETIME()
          AND usedCount < usageLimit
      `);

    const voucher = voucherResult.recordset[0];
    if (!voucher) {
      return res.status(404).json({ message: 'Voucher không khả dụng' });
    }

    // Check if user already claimed this voucher
    const existingResult = await pool.request()
      .input('userId', sql.NVarChar, req.user.userId)
      .input('voucherId', sql.NVarChar, req.params.voucherId)
      .query(`
        SELECT id FROM dbo.user_vouchers
        WHERE userId = @userId AND voucherId = @voucherId
      `);

    if (existingResult.recordset.length > 0) {
      return res.status(409).json({ message: 'Bạn đã nhận voucher này rồi' });
    }

    // Create user voucher
    const userVoucherId = `uv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(voucher.endDate);

    await pool.request()
      .input('id', sql.NVarChar, userVoucherId)
      .input('userId', sql.NVarChar, req.user.userId)
      .input('voucherId', sql.NVarChar, req.params.voucherId)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO dbo.user_vouchers (id, userId, voucherId, expiresAt)
        VALUES (@id, @userId, @voucherId, @expiresAt)
      `);

    return res.status(201).json({
      id: userVoucherId,
      message: 'Đã nhận voucher thành công'
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
