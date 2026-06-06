/**
 * Run once to create the admin account:
 *   node src/seed/createAdmin.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../libs/db');
const { initDatabase } = require('../libs/initDb');

async function main() {
  await initDatabase();
  const pool = await getPool();

  const email = 'quang@admin.com';
  const password = '123456';
  const name = 'Quang Admin';

  // Check existing
  const existing = await pool.request()
    .input('email', sql.NVarChar, email)
    .query('SELECT TOP 1 id FROM dbo.users WHERE email = @email');

  if (existing.recordset.length > 0) {
    // Update role to admin if already exists
    await pool.request()
      .input('email', sql.NVarChar, email)
      .query("UPDATE dbo.users SET [role] = 'admin', [status] = 'active' WHERE email = @email");
    console.log('✅ User already exists — updated to admin role.');
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = `user-admin-${Date.now()}`;
    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('email', sql.NVarChar, email)
      .input('name', sql.NVarChar, name)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .query(`
        INSERT INTO dbo.users (id, email, name, phone, avatar, [role], [status], passwordHash, createdAt)
        VALUES (@id, @email, @name, NULL, NULL, 'admin', 'active', @passwordHash, SYSUTCDATETIME())
      `);
    console.log('✅ Admin account created!');
  }

  console.log(`   Email   : ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role    : admin`);
  process.exit(0);
}

main().catch((err) => { console.error('❌ Error:', err.message); process.exit(1); });
