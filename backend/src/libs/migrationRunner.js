const { getPool, sql, formatSqlError } = require('./db');
const fs = require('fs');
const path = require('path');

/**
 * Migration runner - Tự động chạy migrations chưa được apply
 */

async function ensureMigrationsTable(pool) {
  await pool.request().query(`
    IF OBJECT_ID('dbo.migrations', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.migrations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL UNIQUE,
        appliedAt DATETIME2 DEFAULT SYSUTCDATETIME()
      );
      PRINT 'Created migrations tracking table';
    END
  `);
}

async function getAppliedMigrations(pool) {
  const result = await pool.request().query('SELECT name FROM dbo.migrations ORDER BY id');
  return result.recordset.map(row => row.name);
}

async function markMigrationAsApplied(pool, migrationName) {
  await pool.request()
    .input('name', sql.NVarChar, migrationName)
    .query('INSERT INTO dbo.migrations (name) VALUES (@name)');
}

async function runMigration(pool, migrationPath, migrationName) {
  console.log(`[Migration] Running: ${migrationName}`);

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split by GO statements (SQL Server batch separator)
  const batches = migrationSQL
    .split(/^\s*GO\s*$/im)
    .map(batch => batch.trim())
    .filter(batch => batch.length > 0);

  for (const batch of batches) {
    try {
      await pool.request().query(batch);
    } catch (error) {
      console.error(`[Migration] Error in ${migrationName}:\n${formatSqlError(error)}`);
      throw error;
    }
  }

  await markMigrationAsApplied(pool, migrationName);
  console.log(`[Migration] ✓ Completed: ${migrationName}`);
}

async function runMigrations() {
  const pool = await getPool();

  try {
    // Ensure migrations tracking table exists
    await ensureMigrationsTable(pool);

    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations(pool);
    console.log(`[Migration] Applied migrations: ${appliedMigrations.length}`);

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('[Migration] No migrations directory found');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure order

    console.log(`[Migration] Found ${migrationFiles.length} migration files`);

    // Run pending migrations
    let ranCount = 0;
    for (const file of migrationFiles) {
      const migrationName = file;

      if (appliedMigrations.includes(migrationName)) {
        console.log(`[Migration] ⊘ Skipping (already applied): ${migrationName}`);
        continue;
      }

      const migrationPath = path.join(migrationsDir, file);
      await runMigration(pool, migrationPath, migrationName);
      ranCount++;
    }

    if (ranCount === 0) {
      console.log('[Migration] ✓ All migrations up to date');
    } else {
      console.log(`[Migration] ✓ Successfully ran ${ranCount} new migration(s)`);
    }
  } catch (error) {
    console.error(`[Migration] Failed:\n${formatSqlError(error)}`);
    throw error;
  }
}

module.exports = { runMigrations };
