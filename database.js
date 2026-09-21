const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  query_timeout: 20000,
};

const DATABASE_URL = process.env.DATABASE_URL;
const useSsl = process.env.DB_SSL === 'true' ||
  (DATABASE_URL && /(^|[?&])sslmode=(require|verify-ca|verify-full)/i.test(DATABASE_URL));

if (useSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

if (DATABASE_URL) {
  poolConfig.connectionString = DATABASE_URL;
} else {
  poolConfig.host = process.env.DB_HOST;
  poolConfig.port = process.env.DB_PORT;
  poolConfig.database = process.env.DB_NAME;
  poolConfig.user = process.env.DB_USER;
  poolConfig.password = process.env.DB_PASSWORD;
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
});

function getConnectionErrorHint(err) {
  if (err && (err.code === 'ECONNREFUSED' || String(err.message).includes('ECONNREFUSED'))) {
    return 'Connection refused. Check: (1) DB_HOST/DB_PORT (or DATABASE_URL) are set in Vercel env, (2) the host is ' +
      'reachable from the internet (not "localhost"), (3) the port is correct (Supabase pooler=6543, Neon/Render=5432), ' +
      'and (4) your DB firewall/whitelist allows Vercel IPs.';
  }
  if (err && String(err.message).includes('no pg_hba.conf') || String(err.message).includes('SSL')) {
    return 'Your database requires or rejects SSL. Try setting DB_SSL=true (or remove it) in your Vercel env vars.';
  }
  return null;
}

async function initDB() {
  let client;
  try {
    client = await pool.connect();
  } catch (error) {
    const hint = getConnectionErrorHint(error);
    console.error('Database connection error:', error.message);
    if (hint) console.error(hint);
    throw error;
  }
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(20) DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        tags TEXT[] DEFAULT '{}',
        pinned BOOLEAN DEFAULT FALSE,
        color VARCHAR(20) DEFAULT '#ffffff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category_id);
      CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);

      ALTER TABLE notes ALTER COLUMN title TYPE TEXT;
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };