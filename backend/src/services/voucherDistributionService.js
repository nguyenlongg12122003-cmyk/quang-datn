const { getPool, sql } = require('../libs/db');

/**
 * Voucher Distribution Service
 * Tự động phát voucher dựa trên các sự kiện
 */

const EVENT_TYPES = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_BIRTHDAY: 'USER_BIRTHDAY',
  FIRST_ORDER_COMPLETED: 'FIRST_ORDER_COMPLETED',
  ORDER_MILESTONE_5: 'ORDER_MILESTONE_5',
  ORDER_MILESTONE_10: 'ORDER_MILESTONE_10',
  INACTIVE_USER_30: 'INACTIVE_USER_30',
  CART_ABANDONED: 'CART_ABANDONED',
  SPECIAL_EVENT: 'SPECIAL_EVENT',
};

/**
 * Generate unique voucher code
 */
function generateVoucherCode(prefix = 'AUTO') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Create a voucher from template
 */
async function createVoucherFromTemplate(pool, template, userId) {
  const voucherId = `v-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const code = generateVoucherCode(template.eventType.substring(0, 4));

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + template.validDays);

  await pool.request()
    .input('id', sql.NVarChar, voucherId)
    .input('code', sql.NVarChar, code)
    .input('type', sql.NVarChar, template.type)
    .input('value', sql.Decimal(18, 2), template.value)
    .input('minOrderValue', sql.Decimal(18, 2), template.minOrderValue)
    .input('maxDiscount', sql.Decimal(18, 2), template.maxDiscount)
    .input('usageLimit', sql.Int, 1) // Personal voucher - 1 lần sử dụng
    .input('startDate', sql.DateTime2, startDate)
    .input('endDate', sql.DateTime2, endDate)
    .input('description', sql.NVarChar, template.description)
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

  return { voucherId, code, expiresAt: endDate };
}

/**
 * Assign voucher to user
 */
async function assignVoucherToUser(pool, userId, voucherId, expiresAt) {
  const userVoucherId = `uv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  await pool.request()
    .input('id', sql.NVarChar, userVoucherId)
    .input('userId', sql.NVarChar, userId)
    .input('voucherId', sql.NVarChar, voucherId)
    .input('expiresAt', sql.DateTime2, expiresAt)
    .query(`
      INSERT INTO dbo.user_vouchers (id, userId, voucherId, expiresAt)
      VALUES (@id, @userId, @voucherId, @expiresAt)
    `);

  return userVoucherId;
}

/**
 * Log voucher event
 */
async function logVoucherEvent(pool, userId, eventType, voucherTemplateId, voucherGenerated, userVoucherId, metadata = {}) {
  const eventId = `ve-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  await pool.request()
    .input('id', sql.NVarChar, eventId)
    .input('userId', sql.NVarChar, userId)
    .input('eventType', sql.NVarChar, eventType)
    .input('voucherTemplateId', sql.NVarChar, voucherTemplateId)
    .input('voucherGenerated', sql.NVarChar, voucherGenerated)
    .input('userVoucherId', sql.NVarChar, userVoucherId)
    .input('metadata', sql.NVarChar, JSON.stringify(metadata))
    .query(`
      INSERT INTO dbo.voucher_events (
        id, userId, eventType, voucherTemplateId, voucherGenerated, userVoucherId, metadata
      )
      VALUES (@id, @userId, @eventType, @voucherTemplateId, @voucherGenerated, @userVoucherId, @metadata)
    `);
}

/**
 * Check if user already received voucher for this event
 */
async function hasReceivedEventVoucher(pool, userId, eventType) {
  const result = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .input('eventType', sql.NVarChar, eventType)
    .query(`
      SELECT COUNT(*) as count
      FROM dbo.voucher_events
      WHERE userId = @userId AND eventType = @eventType
    `);

  return result.recordset[0]?.count > 0;
}

/**
 * Main handler: Distribute voucher based on event
 */
async function handleEvent({ type, userId, metadata = {} }) {
  const pool = await getPool();

  try {
    // Check if event type is valid
    if (!Object.values(EVENT_TYPES).includes(type)) {
      console.log(`[VoucherDistribution] Unknown event type: ${type}`);
      return { success: false, message: 'Unknown event type' };
    }

    // Check if user already received voucher for this event (prevent duplicates)
    const alreadyReceived = await hasReceivedEventVoucher(pool, userId, type);
    if (alreadyReceived) {
      console.log(`[VoucherDistribution] User ${userId} already received voucher for ${type}`);
      return { success: false, message: 'Already received' };
    }

    // Find active template for this event type
    const templateResult = await pool.request()
      .input('eventType', sql.NVarChar, type)
      .query(`
        SELECT TOP 1 *
        FROM dbo.voucher_templates
        WHERE eventType = @eventType AND isActive = 1
      `);

    const template = templateResult.recordset[0];
    if (!template) {
      console.log(`[VoucherDistribution] No active template found for ${type}`);
      return { success: false, message: 'No template found' };
    }

    // Create voucher from template
    const { voucherId, code, expiresAt } = await createVoucherFromTemplate(pool, template, userId);

    // Assign to user
    const userVoucherId = await assignVoucherToUser(pool, userId, voucherId, expiresAt);

    // Log event
    await logVoucherEvent(pool, userId, type, template.id, voucherId, userVoucherId, metadata);

    console.log(`[VoucherDistribution] Successfully distributed voucher ${code} to user ${userId} for event ${type}`);

    return {
      success: true,
      voucher: {
        id: voucherId,
        code,
        type: template.type,
        value: template.value,
        description: template.description,
        expiresAt,
      },
    };
  } catch (error) {
    console.error('[VoucherDistribution] Error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get user's order count
 */
async function getUserOrderCount(pool, userId) {
  const result = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
      SELECT COUNT(*) as count
      FROM dbo.orders
      WHERE userId = @userId AND [status] NOT IN ('cancelled')
    `);

  return result.recordset[0]?.count || 0;
}

/**
 * Check and distribute milestone vouchers
 */
async function checkOrderMilestone(userId, orderCount) {
  if (orderCount === 1) {
    // First order completed
    return handleEvent({
      type: EVENT_TYPES.FIRST_ORDER_COMPLETED,
      userId,
      metadata: { orderCount: 1 },
    });
  } else if (orderCount === 5) {
    return handleEvent({
      type: EVENT_TYPES.ORDER_MILESTONE_5,
      userId,
      metadata: { orderCount: 5 },
    });
  } else if (orderCount === 10) {
    return handleEvent({
      type: EVENT_TYPES.ORDER_MILESTONE_10,
      userId,
      metadata: { orderCount: 10 },
    });
  }

  return { success: false, message: 'No milestone reached' };
}

module.exports = {
  EVENT_TYPES,
  handleEvent,
  getUserOrderCount,
  checkOrderMilestone,
};
