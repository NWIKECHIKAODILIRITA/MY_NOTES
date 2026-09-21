const { Pool } = require('pg');
require('dotenv').config();

const isLocal = !process.env.VERCEL &&
  (!process.env.DB_HOST || process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  query_timeout: 20000,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
});

async function initDB() {
  const client = await pool.connect();
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