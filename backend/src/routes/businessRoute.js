const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

const VALID_BUSINESS_TYPES = ['company', 'school', 'government', 'other'];
const VALID_BUSINESS_STATUSES = ['pending', 'approved', 'rejected'];

function mapBusinessProfile(row) {
  if (!row) return null;
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

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    const profile = await getBusinessProfileByUserId(pool, req.user.userId);
    if (!profile) {
      return res.json({ profile: null });
    }
    const outstandingCredit = await getOutstandingCredit(pool, req.user.userId);
    return res.json({
      profile,
      outstandingCredit,
      availableCredit: Math.max(0, profile.creditLimit - outstandingCredit),
    });
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
    } = req.body;

    if (!companyName || !contactPerson || !businessType) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin doanh nghiệp' });
    }
    if (!VALID_BUSINESS_TYPES.includes(businessType)) {
      return res.status(400).json({ message: 'Loại hình doanh nghiệp không hợp lệ' });
    }

    const pool = await getPool();
    const existing = await getBusinessProfileByUserId(pool, req.user.userId);
    if (!existing) {
      return res.status(404).json({ message: 'Chưa có hồ sơ doanh nghiệp' });
    }
    if (existing.status !== 'rejected') {
      return res.status(409).json({ message: 'Chỉ có thể cập nhật hồ sơ đã bị từ chối' });
    }

    await pool.request()
      .input('userId', sql.NVarChar, req.user.userId)
      .input('companyName', sql.NVarChar, companyName)
      .input('taxCode', sql.NVarChar, taxCode || null)
      .input('businessType', sql.NVarChar, businessType)
      .input('contactPerson', sql.NVarChar, contactPerson)
      .input('contactPhone', sql.NVarChar, contactPhone || null)
      .input('contactEmail', sql.NVarChar, contactEmail || null)
      .input('invoiceAddress', sql.NVarChar, invoiceAddress || null)
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
          [status] = 'pending',
          creditLimit = 0,
          paymentTermDays = 0,
          note = NULL,
          approvedAt = NULL,
          approvedBy = NULL
        WHERE userId = @userId
      `);

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
    } = req.body;

    if (!companyName || !contactPerson || !businessType) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin doanh nghiệp' });
    }
    if (!VALID_BUSINESS_TYPES.includes(businessType)) {
      return res.status(400).json({ message: 'Loại hình doanh nghiệp không hợp lệ' });
    }

    const pool = await getPool();
    const existing = await getBusinessProfileByUserId(pool, req.user.userId);
    if (existing) {
      return res.status(409).json({ message: 'Bạn đã đăng ký tài khoản doanh nghiệp' });
    }

    await pool.request()
      .input('userId', sql.NVarChar, req.user.userId)
      .input('companyName', sql.NVarChar, companyName)
      .input('taxCode', sql.NVarChar, taxCode || null)
      .input('businessType', sql.NVarChar, businessType)
      .input('contactPerson', sql.NVarChar, contactPerson)
      .input('contactPhone', sql.NVarChar, contactPhone || null)
      .input('contactEmail', sql.NVarChar, contactEmail || null)
      .input('invoiceAddress', sql.NVarChar, invoiceAddress || null)
      .query(`
        INSERT INTO dbo.business_profiles (
          userId, companyName, taxCode, businessType, contactPerson,
          contactPhone, contactEmail, invoiceAddress, [status], createdAt
        )
        VALUES (
          @userId, @companyName, @taxCode, @businessType, @contactPerson,
          @contactPhone, @contactEmail, @invoiceAddress, 'pending', SYSUTCDATETIME()
        )
      `);

    const profile = await getBusinessProfileByUserId(pool, req.user.userId);
    return res.status(201).json({ profile, message: 'Đăng ký doanh nghiệp thành công, chờ admin duyệt' });
  } catch (error) {
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

    return res.json(result.recordset.map((row) => ({
      ...mapBusinessProfile(row),
      email: row.email,
      userName: row.userName,
      userPhone: row.userPhone,
      customerType: row.customerType,
    })));
  } catch (error) {
    return next(error);
  }
});

router.patch('/:userId/review', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { status, customerType, creditLimit, paymentTermDays, note } = req.body;
    if (!VALID_BUSINESS_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái duyệt không hợp lệ' });
    }

    const pool = await getPool();
    const profile = await getBusinessProfileByUserId(pool, req.params.userId);
    if (!profile) {
      return res.status(404).json({ message: 'Hồ sơ doanh nghiệp không tồn tại' });
    }

    await pool.request()
      .input('userId', sql.NVarChar, req.params.userId)
      .input('status', sql.NVarChar, status)
      .input('creditLimit', sql.Decimal(18, 2), creditLimit != null ? Number(creditLimit) : profile.creditLimit)
      .input('paymentTermDays', sql.Int, paymentTermDays != null ? Number(paymentTermDays) : profile.paymentTermDays)
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

    const updated = await getBusinessProfileByUserId(pool, req.params.userId);
    return res.json({ profile: updated, message: 'Cập nhật hồ sơ doanh nghiệp thành công' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.getBusinessProfileByUserId = getBusinessProfileByUserId;
module.exports.getOutstandingCredit = getOutstandingCredit;