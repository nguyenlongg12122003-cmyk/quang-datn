const { sql } = require('../libs/db');
const { safeJsonParse } = require('../utils/mapRows');
const { mapProductRow } = require('../utils/mapRows');
const {
  resolvePackagingSelection,
  calculateCustomizationExtra,
  estimateDeliveryDate,
} = require('./priceService');
const { deductStockForOrder } = require('./inventoryService');


async function getCustomerType(request, userId) {
  const result = await request
    .input('userId', sql.NVarChar, userId)
    .query('SELECT TOP 1 customerType, [status] FROM dbo.users WHERE id = @userId');
  const row = result.recordset[0];
  if (!row) throw new Error('Người dùng không tồn tại');
  if (row.status === 'locked') throw new Error('Tài khoản đã bị khóa');
  return row.customerType || 'retail';
}

async function buildValidatedItems(transaction, userId, rawItems, { pricingMode = 'catalog' } = {}) {
  const typeRequest = new sql.Request(transaction);
  const customerType = await getCustomerType(typeRequest, userId);
  const builtItems = [];
  const productsById = {};
  const useSnapshot = pricingMode === 'snapshot';

  for (const rawItem of rawItems) {
    const itemRequest = new sql.Request(transaction);
    const productResult = await itemRequest
      .input('productId', sql.NVarChar, rawItem.productId)
      .query('SELECT TOP 1 * FROM dbo.products WHERE id = @productId');

    const product = mapProductRow(productResult.recordset[0]);
    if (!product) {
      throw new Error(`Sản phẩm không tồn tại: ${rawItem.productId}`);
    }
    if (product.status !== 'active') {
      throw new Error(`Sản phẩm không còn bán: ${product.name}`);
    }

    let unitPrice;
    let quantity;
    let packagingUnit;
    let packagingQty;
    let normalized;
    let customizationStatus;

    if (useSnapshot) {
      unitPrice = Number(rawItem.price);
      quantity = Number(rawItem.quantity);
      packagingUnit = rawItem.packagingUnit ?? null;
      packagingQty = Number(rawItem.packagingQty || 1);
      normalized = rawItem.customization ?? null;
      customizationStatus = normalized ? 'pending_review' : null;
    } else {
      const packaging = resolvePackagingSelection(
        product,
        rawItem.packagingUnit,
        rawItem.packagingQty || rawItem.quantity,
        customerType,
      );

      const { extraPrice, normalized: normalizedCustomization } = calculateCustomizationExtra(
        product,
        rawItem.customization,
      );
      unitPrice = packaging.unitPrice + extraPrice;
      quantity = packaging.quantity;
      packagingUnit = packaging.packagingUnit;
      packagingQty = packaging.packagingQty;
      normalized = normalizedCustomization;
      customizationStatus = normalized ? 'pending_review' : null;
    }

    if (product.stock < quantity) {
      throw new Error(`Không đủ tồn kho cho sản phẩm: ${product.name}`);
    }

    const images = product.images || [];
    const productImage = rawItem.productImage || images[0]?.url || '';

    const built = {
      productId: product.id,
      productName: rawItem.productName || product.name,
      productImage,
      price: unitPrice,
      quantity,
      packagingUnit,
      packagingQty,
      customization: normalized,
      customizationStatus,
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
  pricingMode = 'catalog',
}) {
  const normalizedPaymentMethod = paymentMethod || 'cod';
  if (!['cod', 'vnpay', 'payos'].includes(normalizedPaymentMethod)) {
    throw new Error('Phương thức thanh toán không hợp lệ');
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const { builtItems, productsById } = await buildValidatedItems(transaction, userId, items, { pricingMode });

    const paymentTermDays = null;
    const paymentDueDate = null;

    const orderId = `ORD-${Date.now().toString().slice(-8)}`;
    const computedSubtotal = builtItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const computedTotal = Math.max(0, computedSubtotal + Number(shippingFee || 0) - Number(discount || 0));
    const hasCustomItems = builtItems.some((item) => Boolean(item.customization));
    const estimatedDeliveryDate = estimateDeliveryDate(
      builtItems.map((item) => ({ productId: item.productId, customization: item.customization })),
      productsById,
    );

    const orderRequest = new sql.Request(transaction);
    await orderRequest
      .input('id', sql.NVarChar, orderId)
      .input('userId', sql.NVarChar, userId)
      .input('subtotal', sql.Decimal(18, 2), computedSubtotal)
      .input('shippingFee', sql.Decimal(18, 2), Number(shippingFee || 0))
      .input('discount', sql.Decimal(18, 2), Number(discount || 0))
      .input('total', sql.Decimal(18, 2), computedTotal)
      .input('status', sql.NVarChar, 'pending')
      .input('paymentMethod', sql.NVarChar, normalizedPaymentMethod)
      .input('paymentStatus', sql.NVarChar, 'pending')
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

    await deductStockForOrder(transaction, builtItems, { orderId, createdBy: createdBy || userId });

    const initialStatus = 'pending';
    const initialNote = null;
    const timelineRequest = new sql.Request(transaction);
    await timelineRequest
      .input('orderId', sql.NVarChar, orderId)
      .input('timelineStatus', sql.NVarChar, initialStatus)
      .input('timelineNote', sql.NVarChar, initialNote)
      .query(`
        INSERT INTO dbo.order_timeline (orderId, status, date, note)
        VALUES (@orderId, @timelineStatus, SYSUTCDATETIME(), @timelineNote)
      `);

    if (quotationId) {
      const quotationRequest = new sql.Request(transaction);
      await quotationRequest
        .input('quotationId', sql.NVarChar, quotationId)
        .input('convertedOrderId', sql.NVarChar, orderId)
        .query(`
          UPDATE dbo.quotations
          SET [status] = 'converted', convertedOrderId = @convertedOrderId, updatedAt = SYSUTCDATETIME()
          WHERE id = @quotationId
        `);
    }

    if (voucherCode && normalizedPaymentMethod === 'cod') {
      const voucherRequest = new sql.Request(transaction);
      await voucherRequest
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