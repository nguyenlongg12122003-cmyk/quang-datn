const { sql } = require('../libs/db');
const { buildValidatedItems } = require('./orderService');
const { deductStockForOrder, maybeRestoreStockForOrder } = require('./inventoryService');

const POS_WALKIN_USER_ID = 'user-pos-walkin';
const VALID_POS_PAYMENTS = ['cash', 'payos'];

async function createPosOrderTransaction(pool, {
  items,
  paymentMethod,
  discount = 0,
  note = null,
  customerName = null,
  customerPhone = null,
  createdByStaffId,
}) {
  const normalizedPayment = String(paymentMethod || '').trim();
  if (!VALID_POS_PAYMENTS.includes(normalizedPayment)) {
    throw new Error('Phương thức thanh toán POS không hợp lệ. Chỉ hỗ trợ tiền mặt hoặc PayOS.');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Giỏ hàng trống');
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const { builtItems } = await buildValidatedItems(
      transaction,
      POS_WALKIN_USER_ID,
      items,
      { pricingMode: 'catalog' },
    );

    const isCash = normalizedPayment === 'cash';
    const orderStatus = isCash ? 'delivered' : 'pending';
    const paymentStatus = isCash ? 'paid' : 'pending';

    const orderId = `ORD-${Date.now().toString().slice(-8)}`;
    const computedSubtotal = builtItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const computedTotal = Math.max(0, computedSubtotal - Number(discount || 0));

    const shippingAddress = {
      type: 'pos_pickup',
      name: customerName?.trim() || 'Khách lẻ',
      phone: customerPhone?.trim() || '',
      street: 'Bán tại quầy',
      ward: '',
      district: '',
      city: '',
    };

    const timelineNote = isCash
      ? 'Thanh toán tiền mặt tại quầy'
      : 'Chờ thanh toán PayOS tại quầy';

    const orderRequest = new sql.Request(transaction);
    await orderRequest
      .input('id', sql.NVarChar, orderId)
      .input('userId', sql.NVarChar, POS_WALKIN_USER_ID)
      .input('subtotal', sql.Decimal(18, 2), computedSubtotal)
      .input('shippingFee', sql.Decimal(18, 2), 0)
      .input('discount', sql.Decimal(18, 2), Number(discount || 0))
      .input('total', sql.Decimal(18, 2), computedTotal)
      .input('status', sql.NVarChar, orderStatus)
      .input('paymentMethod', sql.NVarChar, normalizedPayment)
      .input('paymentStatus', sql.NVarChar, paymentStatus)
      .input('shippingMethod', sql.NVarChar, 'standard')
      .input('shippingAddress', sql.NVarChar(sql.MAX), JSON.stringify(shippingAddress))
      .input('voucherCode', sql.NVarChar, null)
      .input('note', sql.NVarChar(sql.MAX), note || null)
      .input('quotationId', sql.NVarChar, null)
      .input('paymentTermDays', sql.Int, null)
      .input('paymentDueDate', sql.DateTime2, null)
      .input('invoiceInfo', sql.NVarChar(sql.MAX), null)
      .input('estimatedDeliveryDate', sql.DateTime2, null)
      .input('hasCustomItems', sql.Bit, 0)
      .input('salesChannel', sql.NVarChar, 'pos')
      .input('createdByStaffId', sql.NVarChar, createdByStaffId || null)
      .query(`
        INSERT INTO dbo.orders (
          id, userId, subtotal, shippingFee, discount, total, [status], paymentMethod, paymentStatus,
          shippingMethod, shippingAddress, voucherCode, note, createdAt, returnRequest,
          quotationId, paymentTermDays, paymentDueDate, invoiceInfo, estimatedDeliveryDate, hasCustomItems,
          salesChannel, createdByStaffId
        )
        VALUES (
          @id, @userId, @subtotal, @shippingFee, @discount, @total, @status, @paymentMethod, @paymentStatus,
          @shippingMethod, @shippingAddress, @voucherCode, @note, SYSUTCDATETIME(), NULL,
          @quotationId, @paymentTermDays, @paymentDueDate, @invoiceInfo, @estimatedDeliveryDate, @hasCustomItems,
          @salesChannel, @createdByStaffId
        )
      `);

    for (const item of builtItems) {
      const itemRequest = new sql.Request(transaction);
      await itemRequest
        .input('orderId', sql.NVarChar, orderId)
        .input('productId', sql.NVarChar, item.productId)
        .input('productName', sql.NVarChar, item.productName)
        .input('productImage', sql.NVarChar, item.productImage)
        .input('price', sql.Decimal(18, 2), item.price)
        .input('quantity', sql.Int, item.quantity)
        .input('customization', sql.NVarChar(sql.MAX), JSON.stringify(item.customization))
        .input('customizationStatus', sql.NVarChar, item.customizationStatus)
        .input('packagingUnit', sql.NVarChar, item.packagingUnit)
        .input('packagingQty', sql.Int, item.packagingQty)
        .query(`
          INSERT INTO dbo.order_items (
            orderId, productId, productName, productImage, price, quantity,
            customization, customizationStatus, packagingUnit, packagingQty
          )
          VALUES (
            @orderId, @productId, @productName, @productImage, @price, @quantity,
            @customization, @customizationStatus, @packagingUnit, @packagingQty
          )
        `);
    }

    await deductStockForOrder(transaction, builtItems, {
      orderId,
      createdBy: createdByStaffId || POS_WALKIN_USER_ID,
    });

    const timelineRequest = new sql.Request(transaction);
    await timelineRequest
      .input('orderId', sql.NVarChar, orderId)
      .input('timelineStatus', sql.NVarChar, orderStatus)
      .input('timelineNote', sql.NVarChar, timelineNote)
      .query(`
        INSERT INTO dbo.order_timeline (orderId, status, date, note)
        VALUES (@orderId, @timelineStatus, SYSUTCDATETIME(), @timelineNote)
      `);

    await transaction.commit();

    return {
      id: orderId,
      subtotal: computedSubtotal,
      discount: Number(discount || 0),
      total: computedTotal,
      paymentMethod: normalizedPayment,
      paymentStatus,
      status: orderStatus,
      salesChannel: 'pos',
      createdAt: new Date().toISOString(),
      customerName: customerName?.trim() || 'Khách lẻ',
      items: builtItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        price: item.price,
        quantity: item.quantity,
      })),
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function cancelPosPayosOrder(pool, orderId, staffUserId, reason = null) {
  const orderResult = await pool.request()
    .input('id', sql.NVarChar, orderId)
    .query(`
      SELECT TOP 1 id, salesChannel, [status], paymentMethod, paymentStatus
      FROM dbo.orders
      WHERE id = @id
    `);

  const order = orderResult.recordset[0];
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng');
  }
  if (order.salesChannel !== 'pos') {
    throw new Error('Chỉ hủy được đơn bán tại quầy');
  }
  if (order.paymentMethod !== 'payos') {
    throw new Error('Chỉ hủy được đơn thanh toán PayOS');
  }
  if (order.status !== 'pending' || order.paymentStatus !== 'pending') {
    throw new Error('Chỉ hủy được đơn PayOS đang chờ thanh toán');
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    await maybeRestoreStockForOrder(new sql.Request(transaction), orderId, staffUserId);
    await new sql.Request(transaction)
      .input('id', sql.NVarChar, orderId)
      .query("UPDATE dbo.orders SET [status] = 'cancelled', paymentStatus = 'failed' WHERE id = @id");
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const timelineNote = reason?.trim() || 'Nhân viên hủy đơn PayOS tại quầy';
  await pool.request()
    .input('orderId', sql.NVarChar, orderId)
    .input('note', sql.NVarChar, timelineNote)
    .query(`
      INSERT INTO dbo.order_timeline (orderId, status, date, note)
      VALUES (@orderId, 'cancelled', SYSUTCDATETIME(), @note)
    `);

  return { id: orderId, message: 'Đã hủy đơn PayOS tại quầy' };
}

module.exports = {
  POS_WALKIN_USER_ID,
  VALID_POS_PAYMENTS,
  createPosOrderTransaction,
  cancelPosPayosOrder,
};