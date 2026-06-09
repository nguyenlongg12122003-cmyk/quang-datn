const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { adjustProductStock, setProductStockAbsolute } = require('../services/inventoryService');
const { mapProductRow } = require('../utils/mapRows');

const router = express.Router();

const VALID_MOVEMENT_TYPES = ['in', 'out', 'adjustment'];

router.get('/movements', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { productId, type, page = '1', limit = '30' } = req.query;
    const pool = await getPool();
    const request = pool.request();
    const conditions = [];

    if (productId) {
      request.input('productId', sql.NVarChar, productId);
      conditions.push('sm.productId = @productId');
    }
    if (type && type !== 'all') {
      request.input('type', sql.NVarChar, type);
      conditions.push('sm.[type] = @type');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 30));
    const offset = (parsedPage - 1) * parsedLimit;

    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, parsedLimit);

    const result = await request.query(`
      SELECT sm.*, p.name AS productName, p.sku, COUNT(*) OVER() AS totalCount
      FROM dbo.stock_movements sm
      INNER JOIN dbo.products p ON p.id = sm.productId
      ${where}
      ORDER BY sm.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const rows = result.recordset;
    const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;
    const items = rows.map(({ totalCount, ...row }) => ({
      ...row,
      quantity: Number(row.quantity),
      stockBefore: Number(row.stockBefore),
      stockAfter: Number(row.stockAfter),
    }));

    return res.json({ items, total });
  } catch (error) {
    return next(error);
  }
});

router.get('/low-stock', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT *
      FROM dbo.products
      WHERE stock <= lowStockThreshold AND [status] = 'active'
      ORDER BY stock ASC, name ASC
    `);
    return res.json(result.recordset.map(mapProductRow));
  } catch (error) {
    return next(error);
  }
});

router.get('/by-barcode/:code', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Mã barcode/SKU không hợp lệ' });

    const pool = await getPool();
    const result = await pool.request()
      .input('code', sql.NVarChar, code)
      .query(`
        SELECT TOP 1 * FROM dbo.products
        WHERE barcode = @code OR sku = @code OR id = @code
      `);

    const row = result.recordset[0];
    if (!row) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    return res.json(mapProductRow(row));
  } catch (error) {
    return next(error);
  }
});

router.post('/adjust', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { productId, type, quantity, targetStock, reason } = req.body;
    if (!productId || !VALID_MOVEMENT_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Thông tin điều chỉnh kho không hợp lệ' });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);
      let result;

      if (type === 'adjustment' && targetStock != null) {
        const target = Number(targetStock);
        if (!Number.isFinite(target) || target < 0) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Số tồn sau kiểm kê không hợp lệ' });
        }
        result = await setProductStockAbsolute(request, {
          productId,
          targetStock: target,
          reason: reason || 'Kiểm kê tồn kho',
          createdBy: req.user.userId,
        });
      } else {
        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Số lượng phải lớn hơn 0' });
        }
        const delta = type === 'out' ? -qty : qty;
        result = await adjustProductStock(request, {
          productId,
          delta,
          type,
          reason: reason || `Điều chỉnh kho (${type})`,
          referenceType: 'manual',
          referenceId: null,
          createdBy: req.user.userId,
        });
      }

      await transaction.commit();
      return res.json({ message: 'Cập nhật tồn kho thành công', ...result });
    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }
  } catch (error) {
    return next(error);
  }
});

module.exports = router;