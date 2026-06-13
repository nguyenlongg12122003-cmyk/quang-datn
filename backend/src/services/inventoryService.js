const { sql } = require('../libs/db');

function scopedRequest(parentRequest) {
  if (parentRequest instanceof sql.Transaction) {
    return new sql.Request(parentRequest);
  }
  // mssql v11 stores Transaction/Pool on Request.parent (not .transaction).
  const parent = parentRequest.parent ?? parentRequest;
  return new sql.Request(parent);
}

async function recordStockMovement(request, {
  productId,
  type,
  quantity,
  stockBefore,
  stockAfter,
  reason,
  referenceType,
  referenceId,
  createdBy,
}) {
  const id = `stk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await scopedRequest(request)
    .input('id', sql.NVarChar, id)
    .input('productId', sql.NVarChar, productId)
    .input('type', sql.NVarChar, type)
    .input('quantity', sql.Int, quantity)
    .input('stockBefore', sql.Int, stockBefore)
    .input('stockAfter', sql.Int, stockAfter)
    .input('reason', sql.NVarChar, reason || null)
    .input('referenceType', sql.NVarChar, referenceType || null)
    .input('referenceId', sql.NVarChar, referenceId || null)
    .input('createdBy', sql.NVarChar, createdBy)
    .query(`
      INSERT INTO dbo.stock_movements (
        id, productId, [type], quantity, stockBefore, stockAfter,
        reason, referenceType, referenceId, createdBy, createdAt
      )
      VALUES (
        @id, @productId, @type, @quantity, @stockBefore, @stockAfter,
        @reason, @referenceType, @referenceId, @createdBy, SYSUTCDATETIME()
      )
    `);
}

async function adjustProductStock(request, {
  productId,
  delta,
  type,
  reason,
  referenceType,
  referenceId,
  createdBy,
}) {
  const currentResult = await scopedRequest(request)
    .input('productId', sql.NVarChar, productId)
    .query('SELECT TOP 1 stock FROM dbo.products WITH (UPDLOCK, ROWLOCK) WHERE id = @productId');

  const current = currentResult.recordset[0];
  if (!current) {
    throw new Error(`Sản phẩm không tồn tại: ${productId}`);
  }

  const stockBefore = Number(current.stock || 0);
  const stockAfter = stockBefore + Number(delta || 0);
  if (stockAfter < 0) {
    throw new Error(`Không đủ tồn kho cho sản phẩm: ${productId}`);
  }

  await scopedRequest(request)
    .input('stockAfter', sql.Int, stockAfter)
    .input('productId', sql.NVarChar, productId)
    .query('UPDATE dbo.products SET stock = @stockAfter WHERE id = @productId');

  const absDelta = Math.abs(Number(delta));
  if (Number(delta) < 0) {
    await scopedRequest(request)
      .input('soldDelta', sql.Int, absDelta)
      .input('productId', sql.NVarChar, productId)
      .query('UPDATE dbo.products SET sold = sold + @soldDelta WHERE id = @productId');
  } else if (Number(delta) > 0 && type === 'return') {
    await scopedRequest(request)
      .input('soldDelta', sql.Int, absDelta)
      .input('productId', sql.NVarChar, productId)
      .query(`
        UPDATE dbo.products
        SET sold = CASE WHEN sold >= @soldDelta THEN sold - @soldDelta ELSE 0 END
        WHERE id = @productId
      `);
  }

  await recordStockMovement(request, {
    productId,
    type,
    quantity: Math.abs(Number(delta)),
    stockBefore,
    stockAfter,
    reason,
    referenceType,
    referenceId,
    createdBy,
  });

  return { stockBefore, stockAfter };
}

async function deductStockForOrder(request, items, { orderId, createdBy }) {
  const results = [];
  for (const item of items) {
    const result = await adjustProductStock(request, {
      productId: item.productId,
      delta: -Number(item.quantity || 0),
      type: 'sale',
      reason: `Xuất kho cho đơn hàng ${orderId}`,
      referenceType: 'order',
      referenceId: orderId,
      createdBy,
    });
    results.push({ productId: item.productId, ...result });
  }
  return results;
}

async function restoreStockForOrder(request, items, { orderId, createdBy }) {
  const results = [];
  for (const item of items) {
    const result = await adjustProductStock(request, {
      productId: item.productId,
      delta: Number(item.quantity || 0),
      type: 'return',
      reason: `Hoàn tồn kho từ đơn ${orderId}`,
      referenceType: 'order',
      referenceId: orderId,
      createdBy,
    });
    results.push({ productId: item.productId, ...result });
  }
  return results;
}

async function wasOrderStockRestored(request, orderId) {
  const result = await scopedRequest(request)
    .input('orderId', sql.NVarChar, orderId)
    .query(`
      SELECT TOP 1 1 AS ok
      FROM dbo.stock_movements
      WHERE referenceType = 'order' AND referenceId = @orderId AND [type] = 'return'
    `);
  return Boolean(result.recordset[0]);
}

async function maybeRestoreStockForOrder(request, orderId, createdBy) {
  if (await wasOrderStockRestored(request, orderId)) {
    return { restored: false, reason: 'already_restored' };
  }

  const itemsResult = await scopedRequest(request)
    .input('orderId', sql.NVarChar, orderId)
    .query('SELECT productId, quantity FROM dbo.order_items WHERE orderId = @orderId');

  const items = itemsResult.recordset;
  if (items.length === 0) {
    return { restored: false, reason: 'no_items' };
  }

  const results = await restoreStockForOrder(request, items, { orderId, createdBy });
  return { restored: true, results };
}

async function setProductStockAbsolute(request, {
  productId,
  targetStock,
  reason,
  createdBy,
}) {
  const currentResult = await scopedRequest(request)
    .input('productId', sql.NVarChar, productId)
    .query('SELECT TOP 1 stock FROM dbo.products WITH (UPDLOCK, ROWLOCK) WHERE id = @productId');

  const current = currentResult.recordset[0];
  if (!current) {
    throw new Error(`Sản phẩm không tồn tại: ${productId}`);
  }

  const stockBefore = Number(current.stock || 0);
  const target = Number(targetStock);
  if (!Number.isFinite(target) || target < 0) {
    throw new Error('Số tồn kho không hợp lệ');
  }
  if (target === stockBefore) {
    return { stockBefore, stockAfter: stockBefore, changed: false };
  }

  const delta = target - stockBefore;
  const result = await adjustProductStock(request, {
    productId,
    delta,
    type: 'adjustment',
    reason: reason || `Kiểm kê tồn kho (${stockBefore} → ${target})`,
    referenceType: 'manual',
    referenceId: null,
    createdBy,
  });

  return { ...result, changed: true };
}

module.exports = {
  recordStockMovement,
  adjustProductStock,
  deductStockForOrder,
  restoreStockForOrder,
  wasOrderStockRestored,
  maybeRestoreStockForOrder,
  setProductStockAbsolute,
};