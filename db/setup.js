// Runs schema.sql then seed.sql against the DB configured in .env
// Usage: npm run db:setup
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { pool } = require('../src/config/db')

async function run() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8')

    console.log('Applying schema.sql ...')
    await pool.query(schema)

    console.log('Applying seed.sql ...')
    await pool.query(seed)

    console.log('✅ Database setup complete.')
  } catch (err) {
    console.error('❌ Database setup failed:', err.stack || err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

run()
