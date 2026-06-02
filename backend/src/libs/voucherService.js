const { sql } = require('./db');

/**
 * Validate and reserve a voucher atomically
 * Returns the validated discount amount or throws an error
 */
async function validateAndReserveVoucher(pool, voucherCode, subtotal, userId) {
  if (!voucherCode) {
    return { discount: 0, voucherData: null };
  }

  const normalizedCode = String(voucherCode).toUpperCase();

  // Start transaction for atomic operation
  const transaction = pool.transaction();
  await transaction.begin();

  try {
    // Lock the voucher row for update
    const voucherResult = await transaction.request()
      .input('code', sql.NVarChar, normalizedCode)
      .query(`
        SELECT * FROM dbo.vouchers WITH (UPDLOCK, ROWLOCK)
        WHERE code = @code
      `);

    const voucher = voucherResult.recordset[0];
    if (!voucher) {
      await transaction.rollback();
      throw new Error('Voucher không tồn tại');
    }

    // Validate voucher status
    const now = new Date();
    if (voucher.status !== 'active') {
      await transaction.rollback();
      throw new Error('Voucher không còn hiệu lực');
    }

    if (new Date(voucher.startDate) > now) {
      await transaction.rollback();
      throw new Error('Voucher chưa có hiệu lực');
    }

    if (new Date(voucher.endDate) < now) {
      await transaction.rollback();
      throw new Error('Voucher đã hết hạn');
    }

    // Validate usage limit (with lock, this is race-condition safe)
    if (voucher.usedCount >= voucher.usageLimit) {
      await transaction.rollback();
      throw new Error('Voucher đã hết lượt sử dụng');
    }

    // Validate minimum order value
    if (Number(subtotal) < Number(voucher.minOrderValue)) {
      await transaction.rollback();
      throw new Error(`Đơn hàng tối thiểu ${Number(voucher.minOrderValue).toLocaleString('vi-VN')} VNĐ`);
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

    // Reserve the voucher by incrementing usedCount
    const updateResult = await transaction.request()
      .input('code', sql.NVarChar, normalizedCode)
      .query(`
        UPDATE dbo.vouchers
        SET usedCount = usedCount + 1
        WHERE code = @code AND usedCount < usageLimit
        OUTPUT INSERTED.usedCount
      `);

    if (updateResult.recordset.length === 0) {
      await transaction.rollback();
      throw new Error('Voucher đã hết lượt sử dụng');
    }

    await transaction.commit();

    return {
      discount: Math.round(discount),
      voucherData: {
        id: voucher.id,
        code: voucher.code,
        type: voucher.type,
        value: Number(voucher.value),
      }
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Release a voucher (decrement usage count)
 * Used when order is cancelled or payment fails
 */
async function releaseVoucher(pool, voucherCode) {
  if (!voucherCode) return;

  const normalizedCode = String(voucherCode).toUpperCase();

  await pool.request()
    .input('code', sql.NVarChar, normalizedCode)
    .query(`
      UPDATE dbo.vouchers
      SET usedCount = CASE WHEN usedCount > 0 THEN usedCount - 1 ELSE 0 END
      WHERE code = @code
    `);
}

/**
 * Record voucher usage in audit trail
 */
async function recordVoucherUsage(pool, voucherId, userId, orderId, discountAmount) {
  try {
    await pool.request()
      .input('voucherId', sql.NVarChar, voucherId)
      .input('userId', sql.NVarChar, userId)
      .input('orderId', sql.NVarChar, orderId)
      .input('discountAmount', sql.Decimal(18, 2), discountAmount)
      .query(`
        INSERT INTO dbo.voucher_usage (voucherId, userId, orderId, discountAmount, usedAt)
        VALUES (@voucherId, @userId, @orderId, @discountAmount, SYSUTCDATETIME())
      `);
  } catch (error) {
    // Log error but don't fail the order
    console.error('[voucherService] Failed to record voucher usage:', error.message);
  }
}

/**
 * Check if user has already used a voucher
 */
async function hasUserUsedVoucher(pool, voucherId, userId) {
  const result = await pool.request()
    .input('voucherId', sql.NVarChar, voucherId)
    .input('userId', sql.NVarChar, userId)
    .query(`
      SELECT COUNT(*) as usageCount
      FROM dbo.voucher_usage
      WHERE voucherId = @voucherId AND userId = @userId
    `);

  return result.recordset[0]?.usageCount > 0;
}

module.exports = {
  validateAndReserveVoucher,
  releaseVoucher,
  recordVoucherUsage,
  hasUserUsedVoucher,
};
