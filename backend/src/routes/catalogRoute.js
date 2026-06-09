const express = require('express');
const { getPool, sql } = require('../libs/db');
const { mapProductRow } = require('../utils/mapRows');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { setProductStockAbsolute } = require('../services/inventoryService');

const router = express.Router();

// ==================== CATEGORIES & BRANDS ====================

router.get('/categories', async (_req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.icon,
        c.description,
        c.image,
        (
          SELECT COUNT(1)
          FROM dbo.products p
          WHERE p.categoryId = c.id AND p.[status] = 'active'
        ) AS productCount
      FROM dbo.categories c
      ORDER BY c.name
    `);
    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
});

router.post('/categories', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { name, slug, icon = '', description = '' } = req.body;
    if (!name) return res.status(400).json({ message: 'Tên danh mục là bắt buộc' });
    const id = `cat-${Date.now()}`;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, name)
      .input('slug', sql.NVarChar, slug || name.toLowerCase().replace(/\s+/g, '-'))
      .input('icon', sql.NVarChar, icon)
      .input('description', sql.NVarChar, description)
      .query('INSERT INTO dbo.categories (id, name, slug, icon, description) VALUES (@id, @name, @slug, @icon, @description)');
    return res.json({ id });
  } catch (error) { return next(error); }
});

router.put('/categories/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { name, slug, icon = '', description = '' } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('name', sql.NVarChar, name)
      .input('slug', sql.NVarChar, slug || name.toLowerCase().replace(/\s+/g, '-'))
      .input('icon', sql.NVarChar, icon)
      .input('description', sql.NVarChar, description)
      .query('UPDATE dbo.categories SET name=@name, slug=@slug, icon=@icon, description=@description WHERE id=@id');
    return res.json({ ok: true });
  } catch (error) { return next(error); }
});

router.delete('/categories/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.NVarChar, req.params.id).query('DELETE FROM dbo.categories WHERE id=@id');
    return res.json({ ok: true });
  } catch (error) { return next(error); }
});

router.get('/brands', async (_req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM dbo.brands ORDER BY name');
    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
});

router.post('/brands', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { name, logo = '' } = req.body;
    if (!name) return res.status(400).json({ message: 'Tên thương hiệu là bắt buộc' });
    const id = `brand-${Date.now()}`;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, name)
      .input('logo', sql.NVarChar, logo)
      .query('INSERT INTO dbo.brands (id, name, logo) VALUES (@id, @name, @logo)');
    return res.json({ id });
  } catch (error) { return next(error); }
});

router.put('/brands/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { name, logo = '' } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('name', sql.NVarChar, name)
      .input('logo', sql.NVarChar, logo)
      .query('UPDATE dbo.brands SET name=@name, logo=@logo WHERE id=@id');
    return res.json({ ok: true });
  } catch (error) { return next(error); }
});

router.delete('/brands/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.NVarChar, req.params.id).query('DELETE FROM dbo.brands WHERE id=@id');
    return res.json({ ok: true });
  } catch (error) { return next(error); }
});



// ==================== PRODUCTS LIST & SEARCH ====================

router.get('/products', async (req, res, next) => {
  try {
    const {
      categoryId,
      categorySlug,
      brandId,
      q,
      sortBy = 'popular',
      isFlashSale,
      status,
      minPrice,
      maxPrice,
      page = '1',
      limit = '20',
    } = req.query;

    const pool = await getPool();
    const request = pool.request();

    const conditions = [];
    if (categoryId) {
      request.input('categoryId', sql.NVarChar, String(categoryId));
      conditions.push('categoryId = @categoryId');
    }
    if (brandId) {
      request.input('brandId', sql.NVarChar, String(brandId));
      conditions.push('brandId = @brandId');
    }
    if (categorySlug) {
      request.input('categorySlug', sql.NVarChar, String(categorySlug));
      conditions.push('categoryId IN (SELECT id FROM dbo.categories WHERE slug = @categorySlug)');
    }
    if (q) {
      request.input('q', sql.NVarChar, `%${String(q)}%`);
      conditions.push('(name LIKE @q OR sku LIKE @q OR tags LIKE @q OR description LIKE @q)');
    }
    if (minPrice != null && minPrice !== '') {
      const parsedMin = Number(minPrice);
      if (Number.isFinite(parsedMin)) {
        request.input('minPrice', sql.Decimal(18, 2), parsedMin);
        conditions.push('price >= @minPrice');
      }
    }
    if (maxPrice != null && maxPrice !== '') {
      const parsedMax = Number(maxPrice);
      if (Number.isFinite(parsedMax)) {
        request.input('maxPrice', sql.Decimal(18, 2), parsedMax);
        conditions.push('price <= @maxPrice');
      }
    }
    if (isFlashSale === 'true') {
      conditions.push('isFlashSale = 1');
    }
    if (req.query.isCustomizable === 'true') {
      conditions.push('isCustomizable = 1');
    }
    if (req.query.hasWholesale === 'true') {
      conditions.push("wholesalePrice != '[]' AND wholesalePrice IS NOT NULL");
    }
    if (status) {
      request.input('status', sql.NVarChar, String(status));
      conditions.push('[status] = @status');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'sold DESC';
    if (sortBy === 'price-asc') orderBy = 'price ASC';
    if (sortBy === 'price-desc') orderBy = 'price DESC';
    if (sortBy === 'newest') orderBy = 'createdAt DESC';
    if (sortBy === 'rating') orderBy = 'rating DESC';

    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (parsedPage - 1) * parsedLimit;

    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, parsedLimit);

    // Use window function to get total count in one query
    const result = await request.query(`
      SELECT *, COUNT(*) OVER() AS totalCount
      FROM dbo.products
      ${whereClause}
      ORDER BY ${orderBy}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    const rows = result.recordset;
    const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;

    // Remove the totalCount from each row before mapping
    const items = rows.map((row) => {
      const { totalCount, ...rest } = row;
      return mapProductRow(rest);
    });

    return res.json({ items, total });
  } catch (error) {
    return next(error);
  }
});

router.get('/products/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const pool = await getPool();
    const result = await pool.request()
      .input('idOrSlug', sql.NVarChar, idOrSlug)
      .query('SELECT TOP 1 * FROM dbo.products WHERE id = @idOrSlug OR slug = @idOrSlug');

    const row = result.recordset[0];
    if (!row) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(mapProductRow(row));
  } catch (error) {
    return next(error);
  }
});

router.get('/search-suggestions', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);

    const pool = await getPool();
    const result = await pool.request()
      .input('q', sql.NVarChar, `%${q}%`)
      .query(`
        SELECT TOP 5 name 
        FROM dbo.products 
        WHERE name LIKE @q OR sku LIKE @q OR description LIKE @q OR tags LIKE @q
        ORDER BY sold DESC
      `);
    return res.json(result.recordset.map((r) => r.name));
  } catch (error) {
    return next(error);
  }
});

// ==================== ADMIN: PRODUCT CRUD ====================

router.post('/products', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const {
      name, slug, sku, categoryId, brandId,
      price, originalPrice, discount = 0,
      images = [], description = '', specifications = {},
      stock = 0, colors = [], tags = [],
      isFlashSale = false, flashSaleEnd = null, flashSalePrice = null,
      isCustomizable = false, customizationOptions = [],
      wholesalePrice = [], status = 'active',
      barcode = null, lowStockThreshold = 10, packagingUnits = [],
      groupPrices = {}, customizationLeadDays = 3,
    } = req.body;

    if (!name || !sku || !categoryId || !brandId || !price || !originalPrice) {
      return res.status(400).json({ message: 'Missing required product fields' });
    }

    const id = `prod-${Date.now()}`;
    const autoSlug = slug || name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-');

    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, name)
      .input('slug', sql.NVarChar, autoSlug)
      .input('sku', sql.NVarChar, sku)
      .input('categoryId', sql.NVarChar, categoryId)
      .input('brandId', sql.NVarChar, brandId)
      .input('price', sql.Decimal(18, 2), price)
      .input('originalPrice', sql.Decimal(18, 2), originalPrice)
      .input('discount', sql.Int, discount)
      .input('images', sql.NVarChar(sql.MAX), JSON.stringify(images))
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('specifications', sql.NVarChar(sql.MAX), JSON.stringify(specifications))
      .input('stock', sql.Int, stock)
      .input('colors', sql.NVarChar(sql.MAX), JSON.stringify(colors))
      .input('tags', sql.NVarChar(sql.MAX), JSON.stringify(tags))
      .input('isFlashSale', sql.Bit, Boolean(isFlashSale))
      .input('flashSaleEnd', sql.DateTime2, flashSaleEnd ? new Date(flashSaleEnd) : null)
      .input('flashSalePrice', sql.Decimal(18, 2), flashSalePrice || null)
      .input('isCustomizable', sql.Bit, Boolean(isCustomizable))
      .input('customizationOptions', sql.NVarChar(sql.MAX), JSON.stringify(customizationOptions))
      .input('wholesalePrice', sql.NVarChar(sql.MAX), JSON.stringify(wholesalePrice))
      .input('barcode', sql.NVarChar, barcode || null)
      .input('lowStockThreshold', sql.Int, Number(lowStockThreshold) || 10)
      .input('packagingUnits', sql.NVarChar(sql.MAX), JSON.stringify(packagingUnits))
      .input('groupPrices', sql.NVarChar(sql.MAX), JSON.stringify(groupPrices))
      .input('customizationLeadDays', sql.Int, Number(customizationLeadDays) || 3)
      .input('status', sql.NVarChar, status)
      .query(`
        INSERT INTO dbo.products (
          id, name, slug, sku, categoryId, brandId,
          price, originalPrice, discount, images, description, specifications,
          stock, sold, rating, reviewCount, reviews,
          colors, tags, isFlashSale, flashSaleEnd, flashSalePrice,
          isCustomizable, customizationOptions, wholesalePrice,
          barcode, lowStockThreshold, packagingUnits, groupPrices, customizationLeadDays,
          createdAt, [status]
        )
        VALUES (
          @id, @name, @slug, @sku, @categoryId, @brandId,
          @price, @originalPrice, @discount, @images, @description, @specifications,
          @stock, 0, 0, 0, '[]',
          @colors, @tags, @isFlashSale, @flashSaleEnd, @flashSalePrice,
          @isCustomizable, @customizationOptions, @wholesalePrice,
          @barcode, @lowStockThreshold, @packagingUnits, @groupPrices, @customizationLeadDays,
          SYSUTCDATETIME(), @status
        )
      `);

    return res.status(201).json({ id, message: 'Product created' });
  } catch (error) {
    return next(error);
  }
});

router.put('/products/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, slug, categoryId, brandId,
      price, originalPrice, discount,
      images, description, specifications,
      stock, colors, tags,
      isFlashSale, flashSaleEnd, flashSalePrice,
      isCustomizable, customizationOptions,
      wholesalePrice, status,
      barcode, lowStockThreshold, packagingUnits, groupPrices, customizationLeadDays,
    } = req.body;

    const pool = await getPool();

    if (stock != null) {
      const currentResult = await pool.request()
        .input('id', sql.NVarChar, id)
        .query('SELECT TOP 1 stock FROM dbo.products WHERE id = @id');
      const currentStock = Number(currentResult.recordset[0]?.stock ?? 0);
      const nextStock = Number(stock);
      if (Number.isFinite(nextStock) && nextStock !== currentStock) {
        const stockTransaction = new sql.Transaction(pool);
        await stockTransaction.begin();
        try {
          const stockRequest = new sql.Request(stockTransaction);
          await setProductStockAbsolute(stockRequest, {
            productId: id,
            targetStock: nextStock,
            reason: 'Cập nhật từ form sản phẩm',
            createdBy: req.user.userId,
          });
          await stockTransaction.commit();
        } catch (stockError) {
          await stockTransaction.rollback();
          throw stockError;
        }
      }
    }

    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, name || null)
      .input('slug', sql.NVarChar, slug || null)
      .input('categoryId', sql.NVarChar, categoryId || null)
      .input('brandId', sql.NVarChar, brandId || null)
      .input('price', sql.Decimal(18, 2), price || null)
      .input('originalPrice', sql.Decimal(18, 2), originalPrice || null)
      .input('discount', sql.Int, discount != null ? discount : null)
      .input('images', sql.NVarChar(sql.MAX), images ? JSON.stringify(images) : null)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('specifications', sql.NVarChar(sql.MAX), specifications ? JSON.stringify(specifications) : null)
      .input('stock', sql.Int, stock != null ? stock : null)
      .input('colors', sql.NVarChar(sql.MAX), colors ? JSON.stringify(colors) : null)
      .input('tags', sql.NVarChar(sql.MAX), tags ? JSON.stringify(tags) : null)
      .input('isFlashSale', sql.Bit, isFlashSale != null ? Boolean(isFlashSale) : null)
      .input('flashSaleEnd', sql.DateTime2, flashSaleEnd ? new Date(flashSaleEnd) : null)
      .input('flashSalePrice', sql.Decimal(18, 2), flashSalePrice || null)
      .input('isCustomizable', sql.Bit, isCustomizable != null ? Boolean(isCustomizable) : null)
      .input('customizationOptions', sql.NVarChar(sql.MAX), customizationOptions ? JSON.stringify(customizationOptions) : null)
      .input('wholesalePrice', sql.NVarChar(sql.MAX), wholesalePrice ? JSON.stringify(wholesalePrice) : null)
      .input('barcode', sql.NVarChar, barcode !== undefined ? barcode : null)
      .input('lowStockThreshold', sql.Int, lowStockThreshold != null ? Number(lowStockThreshold) : null)
      .input('packagingUnits', sql.NVarChar(sql.MAX), packagingUnits ? JSON.stringify(packagingUnits) : null)
      .input('groupPrices', sql.NVarChar(sql.MAX), groupPrices ? JSON.stringify(groupPrices) : null)
      .input('customizationLeadDays', sql.Int, customizationLeadDays != null ? Number(customizationLeadDays) : null)
      .input('status', sql.NVarChar, status || null)
      .query(`
        UPDATE dbo.products SET
          name                = COALESCE(@name, name),
          slug                = COALESCE(@slug, slug),
          categoryId          = COALESCE(@categoryId, categoryId),
          brandId             = COALESCE(@brandId, brandId),
          price               = COALESCE(@price, price),
          originalPrice       = COALESCE(@originalPrice, originalPrice),
          discount            = COALESCE(@discount, discount),
          images              = COALESCE(@images, images),
          description         = COALESCE(@description, description),
          specifications      = COALESCE(@specifications, specifications),
          stock               = COALESCE(@stock, stock),
          colors              = COALESCE(@colors, colors),
          tags                = COALESCE(@tags, tags),
          isFlashSale         = COALESCE(@isFlashSale, isFlashSale),
          flashSaleEnd        = COALESCE(@flashSaleEnd, flashSaleEnd),
          flashSalePrice      = COALESCE(@flashSalePrice, flashSalePrice),
          isCustomizable      = COALESCE(@isCustomizable, isCustomizable),
          customizationOptions= COALESCE(@customizationOptions, customizationOptions),
          wholesalePrice      = COALESCE(@wholesalePrice, wholesalePrice),
          barcode             = COALESCE(@barcode, barcode),
          lowStockThreshold   = COALESCE(@lowStockThreshold, lowStockThreshold),
          packagingUnits      = COALESCE(@packagingUnits, packagingUnits),
          groupPrices         = COALESCE(@groupPrices, groupPrices),
          customizationLeadDays = COALESCE(@customizationLeadDays, customizationLeadDays),
          [status]            = COALESCE(@status, [status])
        WHERE id = @id
      `);

    return res.json({ message: 'Product updated' });
  } catch (error) {
    return next(error);
  }
});

router.delete('/products/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('DELETE FROM dbo.products WHERE id = @id');
    return res.json({ message: 'Product deleted' });
  } catch (error) {
    return next(error);
  }
});

router.patch('/products/:id/stock', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { stock } = req.body;
    if (stock == null || stock < 0) {
      return res.status(400).json({ message: 'Valid stock value required' });
    }
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);
      const result = await setProductStockAbsolute(request, {
        productId: req.params.id,
        targetStock: Number(stock),
        reason: 'Cập nhật tồn kho trực tiếp',
        createdBy: req.user.userId,
      });
      await transaction.commit();
      return res.json({ message: 'Stock updated', ...result });
    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }
  } catch (error) {
    return next(error);
  }
});

// ==================== REVIEWS ====================

router.get('/products/:id/reviews', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('productId', sql.NVarChar, req.params.id)
      .query(`
        SELECT id, userId, userName, userAvatar, rating, comment, helpful, isVerifiedPurchase, createdAt
        FROM dbo.reviews
        WHERE productId = @productId
        ORDER BY createdAt DESC
      `);
    return res.json(result.recordset.map(r => ({ ...r, isVerifiedPurchase: Boolean(r.isVerifiedPurchase) })));
  } catch (error) {
    return next(error);
  }
});

router.post('/products/:id/reviews', authMiddleware, async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const pool = await getPool();
    const productId = req.params.id;
    const userId = req.user.userId;

    // Check for duplicate review
    const existing = await pool.request()
      .input('productId', sql.NVarChar, productId)
      .input('userId', sql.NVarChar, userId)
      .query('SELECT TOP 1 id FROM dbo.reviews WHERE productId = @productId AND userId = @userId');
    if (existing.recordset.length > 0) {
      return res.status(409).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' });
    }

    // Check verified purchase (has delivered order containing this product)
    const purchaseCheck = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('productId', sql.NVarChar, productId)
      .query(`
        SELECT TOP 1 oi.orderId
        FROM dbo.order_items oi
        INNER JOIN dbo.orders o ON o.id = oi.orderId
        WHERE o.userId = @userId AND oi.productId = @productId AND o.[status] = 'delivered'
      `);
    const isVerifiedPurchase = purchaseCheck.recordset.length > 0;

    // Get user info
    const userResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT TOP 1 name, avatar FROM dbo.users WHERE id = @userId');
    const user = userResult.recordset[0] || { name: 'Khách hàng', avatar: '' };

    const reviewId = `rev-${Date.now()}`;
    await pool.request()
      .input('id', sql.NVarChar, reviewId)
      .input('productId', sql.NVarChar, productId)
      .input('userId', sql.NVarChar, userId)
      .input('userName', sql.NVarChar, user.name)
      .input('userAvatar', sql.NVarChar, user.avatar || '')
      .input('rating', sql.Int, Number(rating))
      .input('comment', sql.NVarChar(sql.MAX), comment || '')
      .input('isVerifiedPurchase', sql.Bit, isVerifiedPurchase)
      .query(`
        INSERT INTO dbo.reviews (id, productId, userId, userName, userAvatar, rating, comment, isVerifiedPurchase)
        VALUES (@id, @productId, @userId, @userName, @userAvatar, @rating, @comment, @isVerifiedPurchase)
      `);

    // Update product rating and reviewCount
    await pool.request()
      .input('productId', sql.NVarChar, productId)
      .query(`
        UPDATE dbo.products SET
          rating = (SELECT AVG(CAST(rating AS DECIMAL(3,2))) FROM dbo.reviews WHERE productId = @productId),
          reviewCount = (SELECT COUNT(1) FROM dbo.reviews WHERE productId = @productId)
        WHERE id = @productId
      `);

    return res.status(201).json({ id: reviewId, isVerifiedPurchase, message: 'Review submitted' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
