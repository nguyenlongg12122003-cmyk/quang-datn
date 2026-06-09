const express = require('express');
const { getPool } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// ==================== STATS (used by AdminDashboard) ====================

router.get('/stats', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const pool = await getPool();

    const [revenue, orders, products, customers, pendingOrders, lowStockProducts, ordersByStatus, topProducts, revenueByMonth, newCustomers] = await Promise.all([
      pool.request().query("SELECT ISNULL(SUM(total),0) AS totalRevenue FROM dbo.orders WHERE status IN ('delivered','shipping','confirmed')"),
      pool.request().query('SELECT COUNT(1) AS totalOrders FROM dbo.orders'),
      pool.request().query('SELECT COUNT(1) AS totalProducts FROM dbo.products'),
      pool.request().query("SELECT COUNT(1) AS totalCustomers FROM dbo.users WHERE role = 'customer'"),
      pool.request().query("SELECT COUNT(1) AS pendingOrders FROM dbo.orders WHERE status = 'pending'"),
      pool.request().query('SELECT COUNT(1) AS lowStockProducts FROM dbo.products WHERE stock <= lowStockThreshold AND [status] = \'active\''),
      // Orders by status for pie chart
      pool.request().query(`
        SELECT [status], COUNT(1) AS [count]
        FROM dbo.orders
        GROUP BY [status]
      `),
      // Top 5 products by revenue
      pool.request().query(`
        SELECT TOP 5 p.name, SUM(oi.quantity) AS sold, SUM(oi.price * oi.quantity) AS revenue
        FROM dbo.order_items oi
        INNER JOIN dbo.products p ON p.id = oi.productId
        INNER JOIN dbo.orders o ON o.id = oi.orderId
        WHERE o.[status] IN ('delivered', 'shipping', 'confirmed')
        GROUP BY p.name
        ORDER BY revenue DESC
      `),
      // Revenue by month (last 12 months)
      pool.request().query(`
        SELECT FORMAT(createdAt, 'MM/yyyy') AS month,
               ISNULL(SUM(total), 0) AS revenue,
               COUNT(1) AS orders
        FROM dbo.orders
        WHERE [status] IN ('delivered', 'shipping', 'confirmed')
          AND createdAt >= DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1))
        GROUP BY FORMAT(createdAt, 'MM/yyyy'), YEAR(createdAt), MONTH(createdAt)
        ORDER BY YEAR(createdAt), MONTH(createdAt)
      `),
      // New customers this month
      pool.request().query(`
        SELECT COUNT(1) AS newCustomersThisMonth
        FROM dbo.users
        WHERE [role] = 'customer'
          AND YEAR(createdAt) = YEAR(GETUTCDATE())
          AND MONTH(createdAt) = MONTH(GETUTCDATE())
      `),
    ]);

    // Return rate = orders with returnRequest / total delivered
    const deliveredCount = ordersByStatus.recordset.find(r => r.status === 'delivered')?.count || 0;
    const returnedCount = ordersByStatus.recordset.find(r => r.status === 'returned')?.count || 0;
    const returnRate = deliveredCount > 0 ? ((returnedCount / deliveredCount) * 100).toFixed(1) : 0;

    return res.json({
      totalRevenue: Number(revenue.recordset[0].totalRevenue),
      totalOrders: orders.recordset[0].totalOrders,
      totalProducts: products.recordset[0].totalProducts,
      totalCustomers: customers.recordset[0].totalCustomers,
      pendingOrders: pendingOrders.recordset[0].pendingOrders,
      lowStockProducts: lowStockProducts.recordset[0].lowStockProducts,
      newCustomersThisMonth: newCustomers.recordset[0].newCustomersThisMonth,
      returnRate: Number(returnRate),
      ordersByStatus: ordersByStatus.recordset.map(r => ({ status: r.status, count: r.count })),
      topProducts: topProducts.recordset.map(r => ({
        name: r.name,
        sold: r.sold,
        revenue: Number(r.revenue),
      })),
      revenueByMonth: revenueByMonth.recordset.map(r => ({
        month: r.month,
        revenue: Number(r.revenue),
        orders: r.orders,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// ==================== REPORTS ====================

// Revenue report (for AdminReports)
router.get('/reports/revenue', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();

    const [monthlyRevenue, categoryRevenue] = await Promise.all([
      pool.request().query(`
        SELECT FORMAT(createdAt, 'MM/yyyy') AS month,
               ISNULL(SUM(total), 0) AS revenue,
               COUNT(1) AS orders
        FROM dbo.orders
        WHERE [status] IN ('delivered', 'shipping', 'confirmed')
          AND createdAt >= DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1))
        GROUP BY FORMAT(createdAt, 'MM/yyyy'), YEAR(createdAt), MONTH(createdAt)
        ORDER BY YEAR(createdAt), MONTH(createdAt)
      `),
      pool.request().query(`
        SELECT c.name, ISNULL(SUM(oi.price * oi.quantity), 0) AS revenue, COUNT(DISTINCT oi.orderId) AS orders
        FROM dbo.order_items oi
        INNER JOIN dbo.products p ON p.id = oi.productId
        INNER JOIN dbo.categories c ON c.id = p.categoryId
        INNER JOIN dbo.orders o ON o.id = oi.orderId
        WHERE o.[status] IN ('delivered', 'shipping', 'confirmed')
        GROUP BY c.name
        ORDER BY revenue DESC
      `),
    ]);

    return res.json({
      monthly: monthlyRevenue.recordset.map(r => ({ month: r.month, revenue: Number(r.revenue), orders: r.orders })),
      byCategory: categoryRevenue.recordset.map(r => ({ name: r.name, revenue: Number(r.revenue), orders: r.orders })),
    });
  } catch (error) {
    return next(error);
  }
});

// Customer growth report
router.get('/reports/customers', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT FORMAT(createdAt, 'MM/yyyy') AS month,
             COUNT(1) AS newCustomers
      FROM dbo.users
      WHERE [role] = 'customer'
        AND createdAt >= DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1))
      GROUP BY FORMAT(createdAt, 'MM/yyyy'), YEAR(createdAt), MONTH(createdAt)
      ORDER BY YEAR(createdAt), MONTH(createdAt)
    `);

    // Build cumulative total
    let total = 0;
    const data = result.recordset.map(r => {
      total += r.newCustomers;
      return { month: r.month, newCustomers: r.newCustomers, totalCustomers: total };
    });

    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
