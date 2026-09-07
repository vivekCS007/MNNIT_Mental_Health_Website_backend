require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { pool } = require('../src/config/db')

async function run() {
  try {
    const patch = fs.readFileSync(path.join(__dirname, 'patch.sql'), 'utf8')
    console.log('Applying patch.sql ...')
    await pool.query(patch)
    console.log('✅ Database patch complete.')
  } catch (err) {
    console.error('❌ Database patch failed:', err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

run()
