const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

const VALID_BUSINESS_TYPES = ['company', 'school', 'government', 'other'];
const VALID_BUSINESS_STATUSES = ['pending', 'approved', 'rejected'];

function mapBusinessProfile(row) {
  if (!row) return null;
  const safeJsonParse = (val, def) => {
    if (!val) return def;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : def;
    } catch {
      return def;
    }
  };

  return {
    userId: row.userId,
    companyName: row.companyName,
    taxCode: row.taxCode,
    businessType: row.businessType,
    contactPerson: row.contactPerson,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    invoiceAddress: row.invoiceAddress,
    creditLimit: Number(row.creditLimit || 0),
    paymentTermDays: Number(row.paymentTermDays || 0),
    status: row.status,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    note: row.note,
    createdAt: row.createdAt,
    documents: safeJsonParse(row.documents, []),
    reviewHistory: safeJsonParse(row.reviewHistory, []),
  };
}

async function getBusinessProfileByUserId(pool, userId) {
  const result = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query('SELECT TOP 1 * FROM dbo.business_profiles WHERE userId = @userId');
  return mapBusinessProfile(result.recordset[0]);
}

async function getOutstandingCredit(pool, userId) {
  const result = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
      SELECT ISNULL(SUM(total), 0) AS outstanding
      FROM dbo.orders
      WHERE userId = @userId
        AND paymentMethod = 'credit'
        AND paymentStatus = 'pending'
        AND [status] NOT IN ('cancelled', 'returned')
    `);
  return Number(result.recordset[0]?.outstanding || 0);
}

// Compute lightweight business stats for a list of userIds (used to power "Xem lịch sử đơn hàng" link + context in review cards)
function bindUserIdParams(request, userIds) {
  userIds.forEach((id, i) => {
    request.input(`uid${i}`, sql.NVarChar, id);
  });
}

async function getUserBusinessStats(pool, userIds) {
  if (!userIds || userIds.length === 0) return {};
  const stats = {};
  const inClause = userIds.map((_, i) => `@uid${i}`).join(',');

  const orderRequest = pool.request();
  bindUserIdParams(orderRequest, userIds);
  const orderAgg = await orderRequest.query(`
      SELECT userId, COUNT(1) AS orderCount, ISNULL(SUM(total), 0) AS totalSpent,
             MAX(createdAt) AS lastOrderAt
      FROM dbo.orders
      WHERE userId IN (${inClause})
        AND [status] NOT IN ('cancelled', 'returned')
      GROUP BY userId
    `);

  const creditRequest = pool.request();
  bindUserIdParams(creditRequest, userIds);
  const creditAgg = await creditRequest.query(`
      SELECT userId, COUNT(1) AS creditCount, ISNULL(SUM(total), 0) AS creditTotal
      FROM dbo.orders
      WHERE userId IN (${inClause})
        AND paymentMethod = 'credit'
        AND [status] NOT IN ('cancelled', 'returned')
      GROUP BY userId
    `);

  orderAgg.recordset.forEach(r => {
    stats[r.userId] = {
      orderCount: Number(r.orderCount || 0),
      totalSpent: Number(r.totalSpent || 0),
      lastOrderAt: r.lastOrderAt || null,
      creditOrderCount: 0,
      creditTotal: 0,
    };
  });
  creditAgg.recordset.forEach(r => {
    if (!stats[r.userId]) stats[r.userId] = { orderCount: 0, totalSpent: 0, lastOrderAt: null, creditOrderCount: 0, creditTotal: 0 };
    stats[r.userId].creditOrderCount = Number(r.creditCount || 0);
    stats[r.userId].creditTotal = Number(r.creditTotal || 0);
  });
  return stats;
}

function appendEvent(currentHistory = [], newEvent) {
  // Immutability: always return new array
  return [...(Array.isArray(currentHistory) ? currentHistory : []), { ...newEvent, performedAt: new Date().toISOString() }];
}

async function appendReviewHistory(pool, userId, eventPartial) {
  const current = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query('SELECT reviewHistory FROM dbo.business_profiles WHERE userId = @userId');

  const currentHistory = current.recordset[0] ? (() => {
    try { return JSON.parse(current.recordset[0].reviewHistory || '[]'); } catch { return []; }
  })() : [];

  const newHistory = appendEvent(currentHistory, eventPartial);

  await pool.request()
    .input('userId', sql.NVarChar, userId)
    .input('reviewHistory', sql.NVarChar(sql.MAX), JSON.stringify(newHistory))
    .query('UPDATE dbo.business_profiles SET reviewHistory = @reviewHistory WHERE userId = @userId');
}

// Simple mock MST lookup (for improving review accuracy)
// In production you can replace the body with real gov API call (e.g. https://masothue.com or official service)
router.get('/mst-lookup', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { taxCode } = req.query;
    if (!taxCode || String(taxCode).trim().length < 8) {
      return res.json({ taxCode, valid: false, message: 'Mã số thuế không hợp lệ hoặc quá ngắn' });
    }

    const tc = String(taxCode).trim();

    // Mock data based on seed examples + generic
    const mocks = {
      '0312345678': {
        valid: true,
        companyName: 'Công ty TNHH VPP ABC',
        address: 'Tầng 5, Tòa nhà ABC, 120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
        legalStatus: 'Đang hoạt động',
        taxCode: tc,
        businessType: 'company',
      },
      '0398765432': {
        valid: true,
        companyName: 'Công ty CP Demo Logistics',
        address: '88 Võ Văn Tần, Phường 6, Quận 3, TP. Hồ Chí Minh',
        legalStatus: 'Đang hoạt động',
        taxCode: tc,
        businessType: 'company',
      },
    };

    if (mocks[tc]) {
      return res.json(mocks[tc]);
    }

    // Generic fallback for demo purposes
    if (/^\d{10}$/.test(tc) || /^\d{13}$/.test(tc)) {
      return res.json({
        valid: true,
        companyName: `Doanh nghiệp ${tc.slice(0, 4)}... (demo)`,
        address: 'Địa chỉ theo CSDL quốc gia (demo)',
        legalStatus: 'Đang hoạt động (demo)',
        taxCode: tc,
        businessType: 'company',
        note: 'Đây là dữ liệu mẫu. Tích hợp thật với Cổng thông tin doanh nghiệp quốc gia khi triển khai production.',
      });
    }

    return res.json({ taxCode: tc, valid: false, message: 'Không tìm thấy thông tin MST trong dữ liệu mẫu' });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const profile = await getBusinessProfileByUserId(pool, req.user.userId);
    if (!profile) {
      return res.json({ profile: null });
    }
    return res.json({ profile });
  } catch (error) {
    return next(error);
  }
});

router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const {
      companyName,
      taxCode,
      businessType,
      contactPerson,
      contactPhone,
      contactEmail,
      invoiceAddress,
      documents = [],
    } = req.body;

    if (!companyName || !contactPerson || !businessType) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin doanh nghiệp' });
    }
    if (!VALID_BUSINESS_TYPES.includes(businessType)) {
      return res.status(400).json({ message: 'Loại hình doanh nghiệp không hợp lệ' });
    }

    const pool = await getPool();

    // Defensive check (same as register)
    const userExists = await pool.request()
      .input('userId', sql.NVarChar, req.user.userId)
      .query('SELECT TOP 1 1 FROM dbo.users WHERE id = @userId');

    if (userExists.recordset.length === 0) {
      return res.status(400).json({ 
        message: 'Tài khoản người dùng không tồn tại trong hệ thống. Vui lòng đăng xuất và đăng nhập lại.' 
      });
    }

    const existing = await getBusinessProfileByUserId(pool, req.user.userId);
    if (!existing) {
      return res.status(404).json({ message: 'Chưa có hồ sơ doanh nghiệp' });
    }
    if (existing.status !== 'rejected') {
      return res.status(409).json({ message: 'Chỉ có thể cập nhật hồ sơ đã bị từ chối' });
    }

    const docsJson = JSON.stringify(Array.isArray(documents) ? documents : []);

    await pool.request()
      .input('userId', sql.NVarChar, req.user.userId)
      .input('companyName', sql.NVarChar, companyName)
      .input('taxCode', sql.NVarChar, taxCode || null)
      .input('businessType', sql.NVarChar, businessType)
      .input('contactPerson', sql.NVarChar, contactPerson)
      .input('contactPhone', sql.NVarChar, contactPhone || null)
      .input('contactEmail', sql.NVarChar, contactEmail || null)
      .input('invoiceAddress', sql.NVarChar, invoiceAddress || null)
      .input('documents', sql.NVarChar(sql.MAX), docsJson)
      .query(`
        UPDATE dbo.business_profiles
        SET
          companyName = @companyName,
          taxCode = @taxCode,
          businessType = @businessType,
          contactPerson = @contactPerson,
          contactPhone = @contactPhone,
          contactEmail = @contactEmail,
          invoiceAddress = @invoiceAddress,
          documents = @documents,
          [status] = 'pending',
          creditLimit = 0,
          paymentTermDays = 0,
          note = NULL,
          approvedAt = NULL,
          approvedBy = NULL
        WHERE userId = @userId
      `);

    // Record resubmit event
    await appendReviewHistory(pool, req.user.userId, {
      action: 'resubmitted',
      status: 'pending',
      note: 'User resubmitted after rejection',
      performedBy: req.user.userId,
    });

    const profile = await getBusinessProfileByUserId(pool, req.user.userId);
    return res.json({ profile, message: 'Đã gửi lại hồ sơ doanh nghiệp, chờ admin duyệt' });
  } catch (error) {
    return next(error);
  }
});

router.post('/register', authMiddleware, async (req, res, next) => {
  try {
    const {
      companyName,
      taxCode,
      businessType,
      contactPerson,
      contactPhone,
      contactEmail,
      invoiceAddress,
      documents = [],
    } = req.body;

    if (!companyName || !contactPerson || !businessType) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin doanh nghiệp' });
    }
    if (!VALID_BUSINESS_TYPES.includes(businessType)) {
      return res.status(400).json({ message: 'Loại hình doanh nghiệp không hợp lệ' });
    }

    const pool = await getPool();

    // Defensive check: ensure the authenticated user actually exists in dbo.users
    // (prevents cryptic FK constraint errors if the token references a non-existent user)
    const userExists = await pool.request()
      .input('userId', sql.NVarChar, req.user.userId)
      .query('SELECT TOP 1 1 FROM dbo.users WHERE id = @userId');

    if (userExists.recordset.length === 0) {
      return res.status(400).json({ 
        message: 'Tài khoản người dùng không tồn tại trong hệ thống. Vui lòng đăng xuất và đăng nhập lại, hoặc liên hệ quản trị viên.' 
      });
    }

    const existing = await getBusinessProfileByUserId(pool, req.user.userId);
    if (existing) {
      return res.status(409).json({ message: 'Bạn đã đăng ký tài khoản doanh nghiệp' });
    }

    const docsJson = JSON.stringify(Array.isArray(documents) ? documents : []);

    await pool.request()
      .input('userId', sql.NVarChar, req.user.userId)
      .input('companyName', sql.NVarChar, companyName)
      .input('taxCode', sql.NVarChar, taxCode || null)
      .input('businessType', sql.NVarChar, businessType)
      .input('contactPerson', sql.NVarChar, contactPerson)
      .input('contactPhone', sql.NVarChar, contactPhone || null)
      .input('contactEmail', sql.NVarChar, contactEmail || null)
      .input('invoiceAddress', sql.NVarChar, invoiceAddress || null)
      .input('documents', sql.NVarChar(sql.MAX), docsJson)
      .query(`
        INSERT INTO dbo.business_profiles (
          userId, companyName, taxCode, businessType, contactPerson,
          contactPhone, contactEmail, invoiceAddress, documents, [status], createdAt
        )
        VALUES (
          @userId, @companyName, @taxCode, @businessType, @contactPerson,
          @contactPhone, @contactEmail, @invoiceAddress, @documents, 'pending', SYSUTCDATETIME()
        )
      `);

    // Record submission in history for clear audit trail
    await appendReviewHistory(pool, req.user.userId, {
      action: 'submitted',
      status: 'pending',
      note: 'User submitted new business registration',
      performedBy: req.user.userId,
    });

    const profile = await getBusinessProfileByUserId(pool, req.user.userId);
    return res.status(201).json({ profile, message: 'Đăng ký doanh nghiệp thành công, chờ admin duyệt' });
  } catch (error) {
    // Catch FK or other DB constraint errors and turn them into friendly messages
    if (error.code === 'EREQUEST' && error.message && error.message.includes('FOREIGN KEY')) {
      return res.status(400).json({ 
        message: 'Không thể tạo hồ sơ doanh nghiệp vì tài khoản người dùng không hợp lệ. Vui lòng đăng xuất và thử lại.' 
      });
    }
    return next(error);
  }
});

router.get('/manage', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const pool = await getPool();
    const request = pool.request();
    const conditions = [];

    if (status && status !== 'all') {
      request.input('status', sql.NVarChar, status);
      conditions.push('bp.[status] = @status');
    }
    if (q) {
      request.input('q', sql.NVarChar, `%${q}%`);
      conditions.push('(bp.companyName LIKE @q OR bp.taxCode LIKE @q OR u.email LIKE @q OR u.name LIKE @q)');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await request.query(`
      SELECT bp.*, u.email, u.name AS userName, u.phone AS userPhone, u.customerType
      FROM dbo.business_profiles bp
      INNER JOIN dbo.users u ON u.id = bp.userId
      ${where}
      ORDER BY bp.createdAt DESC
    `);

    const baseProfiles = result.recordset.map((row) => ({
      ...mapBusinessProfile(row),
      email: row.email,
      userName: row.userName,
      userPhone: row.userPhone,
      customerType: row.customerType,
    }));

    // Attach user stats for "Xem lịch sử đơn hàng" + context during review
    const userIds = baseProfiles.map(p => p.userId);
    const statsMap = await getUserBusinessStats(pool, userIds);

    const enriched = baseProfiles.map(p => ({
      ...p,
      stats: statsMap[p.userId] || { orderCount: 0, totalSpent: 0, lastOrderAt: null, creditOrderCount: 0, creditTotal: 0 },
    }));

    return res.json(enriched);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:userId/review', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { status, customerType, note } = req.body;
    if (!VALID_BUSINESS_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái duyệt không hợp lệ' });
    }

    const pool = await getPool();
    const profile = await getBusinessProfileByUserId(pool, req.params.userId);
    if (!profile) {
      return res.status(404).json({ message: 'Hồ sơ doanh nghiệp không tồn tại' });
    }

    const resolvedCreditLimit = 0;
    const resolvedPaymentTermDays = 0;

    // Record the review action in immutable history BEFORE or during the update
    await appendReviewHistory(pool, req.params.userId, {
      action: status === 'approved' ? 'approved' : 'rejected',
      status,
      creditLimit: resolvedCreditLimit,
      paymentTermDays: resolvedPaymentTermDays,
      customerType: customerType || undefined,
      note: note || null,
      performedBy: req.user.userId,
    });

    await pool.request()
      .input('userId', sql.NVarChar, req.params.userId)
      .input('status', sql.NVarChar, status)
      .input('creditLimit', sql.Decimal(18, 2), resolvedCreditLimit)
      .input('paymentTermDays', sql.Int, resolvedPaymentTermDays)
      .input('note', sql.NVarChar, note || null)
      .input('approvedBy', sql.NVarChar, status === 'approved' ? req.user.userId : null)
      .query(`
        UPDATE dbo.business_profiles
        SET
          [status] = @status,
          creditLimit = @creditLimit,
          paymentTermDays = @paymentTermDays,
          note = @note,
          approvedAt = CASE WHEN @status = 'approved' THEN SYSUTCDATETIME() ELSE approvedAt END,
          approvedBy = CASE WHEN @status = 'approved' THEN @approvedBy ELSE approvedBy END
        WHERE userId = @userId
      `);

    if (status === 'approved' && customerType) {
      await pool.request()
        .input('userId', sql.NVarChar, req.params.userId)
        .input('customerType', sql.NVarChar, customerType)
        .query('UPDATE dbo.users SET customerType = @customerType WHERE id = @userId');
    }

    if (status === 'approved') {
      const userRow = await pool.request()
        .input('userId', sql.NVarChar, req.params.userId)
        .query('SELECT TOP 1 email, name FROM dbo.users WHERE id = @userId');
      const user = userRow.recordset[0];
      const notifyEmail = profile.contactEmail || user?.email;
      if (notifyEmail) {
        const { sendBusinessApprovedEmail } = require('../services/emailService');
        sendBusinessApprovedEmail({
          email: notifyEmail,
          name: user?.name,
          companyName: profile.companyName,
          customerType: customerType || 'wholesale',
        }).catch((err) => {
          console.error('[email] business approval notification failed:', err.message);
        });
      }
    }

    const updated = await getBusinessProfileByUserId(pool, req.params.userId);
    return res.json({ profile: updated, message: 'Cập nhật hồ sơ doanh nghiệp thành công' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.getBusinessProfileByUserId = getBusinessProfileByUserId;
module.exports.getOutstandingCredit = getOutstandingCredit;