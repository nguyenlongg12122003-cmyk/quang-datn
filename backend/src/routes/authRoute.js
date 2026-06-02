const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../libs/db');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { handleEvent, EVENT_TYPES } = require('../services/voucherDistributionService');

const router = express.Router();

function buildTokenPayload(user) {
	return { userId: user.id, email: user.email, role: user.role };
}

function signToken(user) {
	return jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN || '7d',
	});
}

async function getAddressesByUserId(userId) {
	const pool = await getPool();
	const result = await pool.request()
		.input('userId', sql.NVarChar, userId)
		.query('SELECT id, name, phone, street, ward, district, city, isDefault FROM dbo.addresses WHERE userId = @userId ORDER BY isDefault DESC, id');
	return result.recordset.map((row) => ({ ...row, isDefault: Boolean(row.isDefault) }));
}

router.post('/login', async (req, res, next) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ message: 'Email and password are required' });
		}

		const pool = await getPool();
		const result = await pool.request()
			.input('email', sql.NVarChar, email)
			.query('SELECT TOP 1 id, email, name, phone, avatar, role, status, passwordHash, createdAt FROM dbo.users WHERE email = @email');

		const user = result.recordset[0];
		if (!user) {
			return res.status(401).json({ message: 'Invalid email or password' });
		}

		const isMatch = await bcrypt.compare(password, user.passwordHash);
		if (!isMatch) {
			return res.status(401).json({ message: 'Invalid email or password' });
		}

		const addresses = await getAddressesByUserId(user.id);
		const token = signToken(user);

		return res.json({
			token,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				phone: user.phone,
				avatar: user.avatar,
				role: user.role,
				status: user.status,
				createdAt: user.createdAt,
				addresses,
			},
		});
	} catch (error) {
		return next(error);
	}
});

router.post('/register', async (req, res, next) => {
	try {
		const { name, email, password, phone } = req.body;
		if (!name || !email || !password) {
			return res.status(400).json({ message: 'Name, email, and password are required' });
		}

		const pool = await getPool();
		const existing = await pool.request()
			.input('email', sql.NVarChar, email)
			.query('SELECT TOP 1 id FROM dbo.users WHERE email = @email');

		if (existing.recordset.length > 0) {
			return res.status(409).json({ message: 'Email already exists' });
		}

		const id = `user-${Date.now()}`;
		const passwordHash = await bcrypt.hash(password, 10);
		const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;

		await pool.request()
			.input('id', sql.NVarChar, id)
			.input('email', sql.NVarChar, email)
			.input('name', sql.NVarChar, name)
			.input('phone', sql.NVarChar, phone || '')
			.input('avatar', sql.NVarChar, avatar)
			.input('role', sql.NVarChar, 'customer')
			.input('status', sql.NVarChar, 'active')
			.input('passwordHash', sql.NVarChar, passwordHash)
			.query(`
				INSERT INTO dbo.users (id, email, name, phone, avatar, role, status, passwordHash, createdAt)
				VALUES (@id, @email, @name, @phone, @avatar, @role, @status, @passwordHash, SYSUTCDATETIME())
			`);

		const createdUser = {
			id,
			email,
			name,
			phone: phone || '',
			avatar,
			role: 'customer',
			status: 'active',
			addresses: [],
			createdAt: new Date().toISOString(),
		};

		// Auto-distribute welcome voucher (non-blocking)
		handleEvent({
			type: EVENT_TYPES.USER_REGISTERED,
			userId: id,
			metadata: { email, name },
		}).catch(err => console.error('[Auth] Failed to distribute welcome voucher:', err));

		const token = signToken(createdUser);
		return res.status(201).json({ token, user: createdUser });
	} catch (error) {
		return next(error);
	}
});

router.get('/me', authMiddleware, async (req, res, next) => {
	try {
		const pool = await getPool();
		const result = await pool.request()
			.input('id', sql.NVarChar, req.user.userId)
			.query('SELECT TOP 1 id, email, name, phone, avatar, role, status, createdAt FROM dbo.users WHERE id = @id');

		const user = result.recordset[0];
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		const addresses = await getAddressesByUserId(user.id);
		return res.json({ user: { ...user, addresses } });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;
