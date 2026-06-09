const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// ==================== CUSTOMER: PROFILE ====================

router.put('/me', authMiddleware, async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const pool = await getPool();

    await pool.request()
      .input('id', sql.NVarChar, req.user.userId)
      .input('name', sql.NVarChar, name || null)
      .input('phone', sql.NVarChar, phone || null)
      .input('avatar', sql.NVarChar, avatar || null)
      .query(`
        UPDATE dbo.users
        SET
          name = COALESCE(@name, name),
          phone = COALESCE(@phone, phone),
          avatar = COALESCE(@avatar, avatar)
        WHERE id = @id
      `);

    return res.json({ message: 'Profile updated' });
  } catch (error) {
    return next(error);
  }
});

router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old and new passwords are required' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.user.userId)
      .query('SELECT TOP 1 passwordHash FROM dbo.users WHERE id = @id');

    const user = result.recordset[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ message: 'Old password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input('id', sql.NVarChar, req.user.userId)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .query('UPDATE dbo.users SET passwordHash = @passwordHash WHERE id = @id');

    return res.json({ message: 'Password updated' });
  } catch (error) {
    return next(error);
  }
});

// ==================== CUSTOMER: ADDRESSES ====================

router.post('/addresses', authMiddleware, async (req, res, next) => {
  try {
    const { name, phone, street, ward, district, city, isDefault } = req.body;
    if (!name || !phone || !street || !city) {
      return res.status(400).json({ message: 'Missing required address fields' });
    }

    const pool = await getPool();
    const id = `addr-${Date.now()}`;

    if (isDefault) {
      await pool.request()
        .input('userId', sql.NVarChar, req.user.userId)
        .query('UPDATE dbo.addresses SET isDefault = 0 WHERE userId = @userId');
    }

    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('userId', sql.NVarChar, req.user.userId)
      .input('name', sql.NVarChar, name)
      .input('phone', sql.NVarChar, phone)
      .input('street', sql.NVarChar, street)
      .input('ward', sql.NVarChar, ward || '')
      .input('district', sql.NVarChar, district || '')
      .input('city', sql.NVarChar, city)
      .input('isDefault', sql.Bit, Boolean(isDefault))
      .query('INSERT INTO dbo.addresses (id, userId, name, phone, street, ward, district, city, isDefault) VALUES (@id, @userId, @name, @phone, @street, @ward, @district, @city, @isDefault)');

    return res.status(201).json({ id, message: 'Address added' });
  } catch (error) {
    return next(error);
  }
});

router.delete('/addresses/:id', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('userId', sql.NVarChar, req.user.userId)
      .query('DELETE FROM dbo.addresses WHERE id = @id AND userId = @userId');
    return res.json({ message: 'Address deleted' });
  } catch (error) {
    return next(error);
  }
});

router.patch('/addresses/:id/default', authMiddleware, async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.NVarChar, req.user.userId)
      .query('UPDATE dbo.addresses SET isDefault = 0 WHERE userId = @userId');

    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('userId', sql.NVarChar, req.user.userId)
      .query('UPDATE dbo.addresses SET isDefault = 1 WHERE id = @id AND userId = @userId');

    return res.json({ message: 'Default address updated' });
  } catch (error) {
    return next(error);
  }
});

// ==================== ADMIN: USER MANAGEMENT ====================

router.get('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { q, role, status } = req.query;
    const pool = await getPool();
    const request = pool.request();
    const conditions = [];

    if (role && role !== 'all') {
      request.input('role', sql.NVarChar, role);
      conditions.push('[role] = @role');
    }
    if (status && status !== 'all') {
      request.input('status', sql.NVarChar, status);
      conditions.push('[status] = @status');
    }
    if (q) {
      request.input('q', sql.NVarChar, `%${q}%`);
      conditions.push('(name LIKE @q OR email LIKE @q OR phone LIKE @q)');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await request.query(`
      SELECT id, email, name, phone, avatar, [role], [status], createdAt
      FROM dbo.users ${where}
      ORDER BY createdAt DESC
    `);

    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'locked'].includes(status)) {
      return res.status(400).json({ message: 'Status must be active or locked' });
    }

    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('status', sql.NVarChar, status)
      .query('UPDATE dbo.users SET [status] = @status WHERE id = @id');

    return res.json({ message: `User ${status === 'locked' ? 'locked' : 'unlocked'}` });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/role', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'staff', 'customer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('role', sql.NVarChar, role)
      .query('UPDATE dbo.users SET [role] = @role WHERE id = @id');

    return res.json({ message: 'User role updated' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
