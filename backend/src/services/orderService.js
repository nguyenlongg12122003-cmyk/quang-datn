const { sql } = require('../libs/db');
const { safeJsonParse } = require('../utils/mapRows');
const { mapProductRow } = require('../utils/mapRows');
const {
  resolvePackagingSelection,
  calculateCustomizationExtra,
  estimateDeliveryDate,
} = require('./priceService');
const { deductStockForOrder } = require('./inventoryService');
const { getBusinessProfileByUserId, getOutstandingCredit } = require('../routes/businessRoute');

async function getCustomerType(request, userId) {
  const result = await request
    .input('userId', sql.NVarChar, userId)
    .query('SELECT TOP 1 customerType, [status] FROM dbo.users WHERE id = @userId');
  const row = result.recordset[0];
  if (!row) throw new Error('Người dùng không tồn tại');
  if (row.status === 'locked') throw new Error('Tài khoản đã bị khóa');
  return row.customerType || 'retail';
}

async function buildValidatedItems(request, userId, rawItems) {
  const customerType = await getCustomerType(request, userId);
  const builtItems = [];
  const productsById = {};

  for (const rawItem of rawItems) {
    const productResult = await request
      .input('productId', sql.NVarChar, rawItem.productId)
      .query('SELECT TOP 1 * FROM dbo.products WHERE id = @productId');

    const product = mapProductRow(productResult.recordset[0]);
    if (!product) {
      throw new Error(`Sản phẩm không tồn tại: ${rawItem.productId}`);
    }
    if (product.status !== 'active') {
      throw new Error(`Sản phẩm không còn bán: ${product.name}`);
    }

    const packaging = resolvePackagingSelection(
      product,
      rawItem.packagingUnit,
      rawItem.packagingQty || rawItem.quantity,
      customerType,
    );

    const { extraPrice, normalized } = calculateCustomizationExtra(product, rawItem.customization);
    const unitPrice = packaging.unitPrice + extraPrice;
    const quantity = packaging.quantity;

    if (product.stock < quantity) {
      throw new Error(`Không đủ tồn kho cho sản phẩm: ${product.name}`);
    }

    const images = product.images || [];
    const productImage = images[0]?.url || rawItem.productImage || '';

    const built = {
      productId: product.id,
      productName: product.name,
      productImage,
      price: unitPrice,
      quantity,
      packagingUnit: packaging.packagingUnit,
      packagingQty: packaging.packagingQty,
      customization: normalized,
      customizationStatus: normalized ? 'pending_review' : null,
      product,
    };

    builtItems.push(built);
    productsById[product.id] = product;
  }

  return { builtItems, productsById, customerType };
}

async function createOrderTransaction(pool, {
  userId,
  items,
  shippingFee = 0,
  discount = 0,
  paymentMethod = 'cod',
  shippingMethod = 'standard',
  shippingAddress = {},
  voucherCode = null,
  note = null,
  quotationId = null,
  invoiceInfo = null,
  createdBy,
}) {
  const normalizedPaymentMethod = paymentMethod || 'cod';
  if (!['cod', 'vnpay', 'payos', 'credit'].includes(normalizedPaymentMethod)) {
    throw new Error('Phương thức thanh toán không hợp lệ');
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const request = new sql.Request(transaction);
    const { builtItems, productsById } = await buildValidatedItems(request, userId, items);

    let paymentTermDays = null;
    let paymentDueDate = null;

    if (normalizedPaymentMethod === 'credit') {
      const profile = await getBusinessProfileByUserId(pool, userId);
      if (!profile || profile.status !== 'approved' || profile.paymentTermDays <= 0) {
        throw new Error('Tài khoản chưa được cấp quyền thanh toán công nợ');
      }

      const outstanding = await getOutstandingCredit(pool, userId);
      const computedSubtotalPreview = builtItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const computedTotalPreview = Math.max(0, computedSubtotalPreview + Number(shippingFee || 0) - Number(discount || 0));

      if (outstanding + computedTotalPreview > profile.creditLimit) {
        throw new Error('Vượt quá hạn mức công nợ cho phép');
      }

      paymentTermDays = profile.paymentTermDays;
      paymentDueDate = new Date();
      paymentDueDate.setUTCDate(paymentDueDate.getUTCDate() + paymentTermDays);
    }

    const orderId = `ORD-${Date.now().toString().slice(-8)}`;
    const computedSubtotal = builtItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const computedTotal = Math.max(0, computedSubtotal + Number(shippingFee || 0) - Number(discount || 0));
    const hasCustomItems = builtItems.some((item) => Boolean(item.customization));
    const estimatedDeliveryDate = estimateDeliveryDate(
      builtItems.map((item) => ({ productId: item.productId, customization: item.customization })),
      productsById,
    );

    await request
      .input('id', sql.NVarChar, orderId)
      .input('userId', sql.NVarChar, userId)
      .input('subtotal', sql.Decimal(18, 2), computedSubtotal)
      .input('shippingFee', sql.Decimal(18, 2), Number(shippingFee || 0))
      .input('discount', sql.Decimal(18, 2), Number(discount || 0))
      .input('total', sql.Decimal(18, 2), computedTotal)
      .input('status', sql.NVarChar, normalizedPaymentMethod === 'credit' ? 'confirmed' : 'pending')
      .input('paymentMethod', sql.NVarChar, normalizedPaymentMethod)
      .input('paymentStatus', sql.NVarChar, normalizedPaymentMethod === 'credit' ? 'pending' : 'pending')
      .input('shippingMethod', sql.NVarChar, shippingMethod || 'standard')
      .input('shippingAddress', sql.NVarChar(sql.MAX), JSON.stringify(shippingAddress || {}))
      .input('voucherCode', sql.NVarChar, voucherCode || null)
      .input('note', sql.NVarChar(sql.MAX), note || null)
      .input('quotationId', sql.NVarChar, quotationId || null)
      .input('paymentTermDays', sql.Int, paymentTermDays)
      .input('paymentDueDate', sql.DateTime2, paymentDueDate)
      .input('invoiceInfo', sql.NVarChar(sql.MAX), invoiceInfo ? JSON.stringify(invoiceInfo) : null)
      .input('estimatedDeliveryDate', sql.DateTime2, estimatedDeliveryDate)
      .input('hasCustomItems', sql.Bit, hasCustomItems)
      .query(`
        INSERT INTO dbo.orders (
          id, userId, subtotal, shippingFee, discount, total, [status], paymentMethod, paymentStatus,
          shippingMethod, shippingAddress, voucherCode, note, createdAt, returnRequest,
          quotationId, paymentTermDays, paymentDueDate, invoiceInfo, estimatedDeliveryDate, hasCustomItems
        )
        VALUES (
          @id, @userId, @subtotal, @shippingFee, @discount, @total, @status, @paymentMethod, @paymentStatus,
          @shippingMethod, @shippingAddress, @voucherCode, @note, SYSUTCDATETIME(), NULL,
          @quotationId, @paymentTermDays, @paymentDueDate, @invoiceInfo, @estimatedDeliveryDate, @hasCustomItems
        )
      `);

    for (const item of builtItems) {
      await request
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

    await deductStockForOrder(request, builtItems, { orderId, createdBy: createdBy || userId });

    const initialStatus = normalizedPaymentMethod === 'credit' ? 'confirmed' : 'pending';
    const initialNote = normalizedPaymentMethod === 'credit' ? 'Đơn hàng công nợ được xác nhận' : null;
    await request
      .input('orderId', sql.NVarChar, orderId)
      .input('timelineStatus', sql.NVarChar, initialStatus)
      .input('timelineNote', sql.NVarChar, initialNote)
      .query(`
        INSERT INTO dbo.order_timeline (orderId, status, date, note)
        VALUES (@orderId, @timelineStatus, SYSUTCDATETIME(), @timelineNote)
      `);

    if (quotationId) {
      await request
        .input('quotationId', sql.NVarChar, quotationId)
        .input('convertedOrderId', sql.NVarChar, orderId)
        .query(`
          UPDATE dbo.quotations
          SET [status] = 'converted', convertedOrderId = @convertedOrderId, updatedAt = SYSUTCDATETIME()
          WHERE id = @quotationId
        `);
    }

    if (voucherCode && normalizedPaymentMethod === 'cod') {
      await request
        .input('code', sql.NVarChar, String(voucherCode).toUpperCase())
        .query('UPDATE dbo.vouchers SET usedCount = usedCount + 1 WHERE code = @code');
    }

    await transaction.commit();

    return {
      id: orderId,
      subtotal: computedSubtotal,
      total: computedTotal,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: 'pending',
      estimatedDeliveryDate,
      hasCustomItems,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  buildValidatedItems,
  createOrderTransaction,
};