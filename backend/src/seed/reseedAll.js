require('dotenv').config();

const { initDatabase } = require('../libs/initDb');
const { getPool, sql } = require('../libs/db');
const { seedData } = require('./mockSeed');

async function run() {
  await initDatabase();
  const pool = await getPool();
  await seedData(pool, sql);
  console.log('[seed] Reset and reseeded catalog data successfully.');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[seed] Failed to reseed data:', error);
    process.exit(1);
  });
