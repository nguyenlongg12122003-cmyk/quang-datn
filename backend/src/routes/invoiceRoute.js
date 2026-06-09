const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { safeJsonParse } = require('../utils/mapRows');
const { getBusinessProfileByUserId } = require('./businessRoute');

const router = express.Router();

function mapInvoiceRow(row) {
  return {
    id: row.id,
    orderId: row.orderId,
    invoiceNumber: row.invoiceNumber,
    taxCode: row.taxCode,
    companyName: row.companyName,
    invoiceAddress: row.invoiceAddress,
    subtotal: Number(row.subtotal),
    vatRate: Number(row.vatRate),
    vatAmount: Number(row.vatAmount),
    total: Number(row.total),
    status: row.status,
    issuedAt: row.issuedAt,
    issuedBy: row.issuedBy,
  };
}

async function loadOrderForInvoice(pool, orderId) {
  const orderResult = await pool.request()
    .input('orderId', sql.NVarChar, orderId)
    .query('SELECT TOP 1 * FROM dbo.orders WHERE id = @orderId');

  const order = orderResult.recordset[0];
  if (!order) return null;

  const itemsResult = await pool.request()
    .input('orderId', sql.NVarChar, orderId)
    .query('SELECT * FROM dbo.order_items WHERE orderId = @orderId');

  return {
    ...order,
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    shippingAddress: safeJsonParse(order.shippingAddress, {}),
    invoiceInfo: safeJsonParse(order.invoiceInfo, null),
    items: itemsResult.recordset.map((item) => ({
      productName: item.productName,
      quantity: Number(item.quantity),
      price: Number(item.price),
      customization: safeJsonParse(item.customization, null),
    })),
  };
}

router.get('/order/:orderId', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const order = await loadOrderForInvoice(pool, req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
    if (order.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const invoiceResult = await pool.request()
      .input('orderId', sql.NVarChar, req.params.orderId)
      .query('SELECT TOP 1 * FROM dbo.invoices WHERE orderId = @orderId ORDER BY issuedAt DESC');

    const invoice = mapInvoiceRow(invoiceResult.recordset[0]);
    return res.json({ order, invoice: invoice.id ? invoice : null });
  } catch (error) {
    return next(error);
  }
});

router.post('/order/:orderId', authMiddleware, async (req, res, next) => {
  try {
    const {
      taxCode,
      companyName,
      invoiceAddress,
      vatRate = 10,
      requestInvoice = true,
    } = req.body;

    const pool = await getPool();
    const order = await loadOrderForInvoice(pool, req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
    if (order.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền xuất hóa đơn' });
    }
    if (!['delivered', 'shipping', 'confirmed', 'processing'].includes(order.status)) {
      return res.status(400).json({ message: 'Đơn hàng chưa đủ điều kiện xuất hóa đơn' });
    }

    const existing = await pool.request()
      .input('orderId', sql.NVarChar, req.params.orderId)
      .query('SELECT TOP 1 id FROM dbo.invoices WHERE orderId = @orderId');
    if (existing.recordset[0]) {
      return res.status(409).json({ message: 'Đơn hàng đã có hóa đơn VAT' });
    }

    let resolvedTaxCode = taxCode;
    let resolvedCompanyName = companyName;
    let resolvedInvoiceAddress = invoiceAddress;

    if (!resolvedTaxCode || !resolvedCompanyName) {
      const profile = await getBusinessProfileByUserId(pool, order.userId);
      if (profile && profile.status === 'approved') {
        resolvedTaxCode = resolvedTaxCode || profile.taxCode;
        resolvedCompanyName = resolvedCompanyName || profile.companyName;
        resolvedInvoiceAddress = resolvedInvoiceAddress || profile.invoiceAddress;
      }
    }

    if (requestInvoice && (!resolvedTaxCode || !resolvedCompanyName)) {
      return res.status(400).json({ message: 'Vui lòng cung cấp MST và tên công ty để xuất hóa đơn VAT' });
    }

    const normalizedVatRate = Math.max(0, Number(vatRate || 10));
    const subtotal = Number(order.subtotal);
    const vatAmount = Math.round(subtotal * normalizedVatRate) / 100;
    const total = subtotal + vatAmount;
    const id = `inv-${Date.now()}`;
    const invoiceNumber = `HD-${Date.now().toString().slice(-8)}`;

    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('orderId', sql.NVarChar, order.id)
      .input('invoiceNumber', sql.NVarChar, invoiceNumber)
      .input('taxCode', sql.NVarChar, resolvedTaxCode || null)
      .input('companyName', sql.NVarChar, resolvedCompanyName || null)
      .input('invoiceAddress', sql.NVarChar, resolvedInvoiceAddress || null)
      .input('subtotal', sql.Decimal(18, 2), subtotal)
      .input('vatRate', sql.Decimal(5, 2), normalizedVatRate)
      .input('vatAmount', sql.Decimal(18, 2), vatAmount)
      .input('total', sql.Decimal(18, 2), total)
      .input('issuedBy', sql.NVarChar, req.user.userId)
      .query(`
        INSERT INTO dbo.invoices (
          id, orderId, invoiceNumber, taxCode, companyName, invoiceAddress,
          subtotal, vatRate, vatAmount, total, [status], issuedAt, issuedBy
        )
        VALUES (
          @id, @orderId, @invoiceNumber, @taxCode, @companyName, @invoiceAddress,
          @subtotal, @vatRate, @vatAmount, @total, 'issued', SYSUTCDATETIME(), @issuedBy
        )
      `);

    await pool.request()
      .input('orderId', sql.NVarChar, order.id)
      .input('invoiceInfo', sql.NVarChar(sql.MAX), JSON.stringify({
        taxCode: resolvedTaxCode,
        companyName: resolvedCompanyName,
        invoiceAddress: resolvedInvoiceAddress,
        invoiceNumber,
        vatRate: normalizedVatRate,
      }))
      .query('UPDATE dbo.orders SET invoiceInfo = @invoiceInfo WHERE id = @orderId');

    const invoice = mapInvoiceRow({
      id,
      orderId: order.id,
      invoiceNumber,
      taxCode: resolvedTaxCode,
      companyName: resolvedCompanyName,
      invoiceAddress: resolvedInvoiceAddress,
      subtotal,
      vatRate: normalizedVatRate,
      vatAmount,
      total,
      status: 'issued',
      issuedAt: new Date(),
      issuedBy: req.user.userId,
    });

    return res.status(201).json({ invoice, order, message: 'Xuất hóa đơn VAT thành công' });
  } catch (error) {
    return next(error);
  }
});

router.get('/manage', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT i.*, o.userId, o.total AS orderTotal
      FROM dbo.invoices i
      INNER JOIN dbo.orders o ON o.id = i.orderId
      ORDER BY i.issuedAt DESC
    `);
    return res.json(result.recordset.map(mapInvoiceRow));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;