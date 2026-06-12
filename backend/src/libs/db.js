const sql = require('mssql');

let poolPromise;

const DB_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function getConfig(overrides = {}) {
	return {
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		server: process.env.DB_SERVER,
		port: Number(process.env.DB_PORT || 1433),
		database: process.env.DB_NAME,
		options: {
			encrypt: String(process.env.DB_ENCRYPT || 'false') === 'true',
			trustServerCertificate: String(process.env.DB_TRUST_SERVER_CERT || 'true') === 'true',
		},
		pool: {
			max: 10,
			min: 0,
			idleTimeoutMillis: 30000,
		},
		...overrides,
	};
}

function validateDbEnv() {
	const missing = ['DB_SERVER', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
		.filter((key) => !String(process.env[key] || '').trim());

	if (missing.length > 0) {
		throw new Error(`Missing database environment variables: ${missing.join(', ')}`);
	}

	const dbName = process.env.DB_NAME.trim();
	if (!DB_NAME_PATTERN.test(dbName)) {
		throw new Error(
			`Invalid DB_NAME "${dbName}". Use letters, numbers, and underscores only (example: VanPhongPham_DB).`,
		);
	}
}

function formatSqlError(error) {
	const lines = [error.message];
	if (Array.isArray(error.precedingErrors)) {
		for (const precedingError of error.precedingErrors) {
			lines.push(`  -> ${precedingError.message}`);
		}
	}
	return lines.join('\n');
}

async function ensureDatabase() {
	validateDbEnv();

	const dbName = process.env.DB_NAME.trim();
	const masterPool = new sql.ConnectionPool(getConfig({ database: 'master' }));

	try {
		await masterPool.connect();
		const result = await masterPool
			.request()
			.input('dbName', sql.NVarChar, dbName)
			.query('SELECT DB_ID(@dbName) AS dbId');

		if (result.recordset[0]?.dbId == null) {
			await masterPool.request().query(`CREATE DATABASE [${dbName}]`);
			console.log(`[db] Created database "${dbName}"`);
			return;
		}

		console.log(`[db] Using existing database "${dbName}"`);
	} finally {
		await masterPool.close();
	}
}

function getPool() {
	if (!poolPromise) {
		poolPromise = ensureDatabase().then(() => sql.connect(getConfig()));
	}
	return poolPromise;
}

async function closePool() {
	if (poolPromise) {
		const pool = await poolPromise;
		await pool.close();
		poolPromise = null;
	}
}

module.exports = {
	sql,
	getPool,
	closePool,
	ensureDatabase,
	formatSqlError,
};
