// ---------------------------------------------------------------------------
// DATABASE CONNECTION — MySQL connection pool
// Every controller imports `pool` from here and runs pool.query(...).
// ---------------------------------------------------------------------------
require('dotenv').config()
const mysql = require('mysql2/promise')

const useConnectionString = !!process.env.DATABASE_URL

let pool;

if (useConnectionString) {
  pool = mysql.createPool({ uri: process.env.DATABASE_URL, multipleStatements: true });
} else {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'mhc_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  });
}

// Quick helper to mimic the old `pg` query API returning { rows }
// In mysql2, query returns [rows, fields]. We just return { rows } to minimize changes.
const query = async (text, params) => {
  const [rows] = await pool.query(text, params)
  return { rows }
}

module.exports = { pool, query }