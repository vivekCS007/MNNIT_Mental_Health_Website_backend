const XLSX = require('xlsx')
const { query } = require('../config/db')
const { hashPassword } = require('../utils/password')
const { asyncHandler } = require('../middleware/errorHandler')

/**
 * POST /admin/students/import
 * Handles large sheets (6000+ rows) without timing out by:
 *  1. Pre-hashing unique passwords in parallel (bcrypt is slow — batch it once per unique password)
 *  2. Processing DB upserts in parallel chunks of 50
 */
const importStudents = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded. Please attach an .xlsx file.' })
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (rawRows.length === 0) {
    return res.status(400).json({ success: false, message: 'The Excel file is empty or has no data rows.' })
  }

  const normalize = (key) => key.trim().toLowerCase().replace(/\s+/g, '_')
  const rows = rawRows.map(r =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [normalize(k), String(v).trim()]))
  )

  const REQUIRED = ['registration_number', 'name', 'email', 'password']
  const summary = { imported: 0, updated: 0, skipped: 0, errors: [] }

  // --- Step 1: Pre-hash all unique passwords in parallel ---
  // This is the critical optimisation — bcrypt.hash takes ~100ms each.
  // Without this, 6000 rows × 100ms = 10 minutes. With this, we hash once per unique password.
  const uniquePasswords = [...new Set(rows.map(r => r.password).filter(Boolean))]
  const hashCache = {}
  await Promise.all(
    uniquePasswords.map(async (pwd) => {
      hashCache[pwd] = await hashPassword(pwd)
    })
  )

  // --- Step 2: Process rows in parallel chunks of 50 ---
  const CHUNK_SIZE = 50
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    await Promise.all(chunk.map(async (row, chunkIdx) => {
      const rowNum = i + chunkIdx + 2

      const missing = REQUIRED.filter(f => !row[f])
      if (missing.length > 0) {
        summary.skipped++
        summary.errors.push(`Row ${rowNum}: Missing required fields: ${missing.join(', ')}`)
        return
      }

      try {
        const passwordHash = hashCache[row.password]
        const mentorEmail = row.mentor || null

        const { rows: existing } = await query(
          'SELECT id FROM users WHERE identifier = ?',
          [row.registration_number]
        )

        if (existing.length > 0) {
          await query(
            `UPDATE users SET
              name = ?, email = ?, password_hash = ?,
              branch = ?, course = ?, year = ?, mentor_email = ?
            WHERE identifier = ?`,
            [
              row.name,
              row.email,
              passwordHash,
              row.branch || null,
              row.course || null,
              row.year || null,
              mentorEmail,
              row.registration_number,
            ]
          )
          summary.updated++
        } else {
          await query(
            `INSERT INTO users (identifier, name, email, user_type, password_hash, branch, course, year, mentor_email)
             VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?)`,
            [
              row.registration_number,
              row.name,
              row.email,
              passwordHash,
              row.branch || null,
              row.course || null,
              row.year || null,
              mentorEmail
            ]
          )
          summary.imported++
        }
      } catch (err) {
        summary.errors.push(`Row ${rowNum} (${row.registration_number}): ${err.message}`)
        summary.skipped++
      }
    }))
  }

  res.json({
    success: true,
    message: `Import complete. ${summary.imported} new, ${summary.updated} updated, ${summary.skipped} skipped.`,
    summary,
  })
})


/**
 * GET /admin/students/template
 */
const downloadTemplate = asyncHandler(async (req, res) => {
  const sampleData = [
    {
      registration_number: '21BCS001',
      name: 'Rahul Verma',
      email: 'rahul.21bcs001@mnnit.ac.in',
      password: 'Xyz@2024#Abc',
      branch: 'Computer Science',
      course: 'B.Tech',
      year: '2nd Year',
      mentor: 'faculty.demo@mnnit.ac.in'
    },
    {
      registration_number: '21BCS002',
      name: 'Priya Sharma',
      email: 'priya.21bcs002@mnnit.ac.in',
      password: 'Pqr@2024#Def',
      branch: 'Computer Science',
      course: 'B.Tech',
      year: '2nd Year',
      mentor: 'faculty.demo@mnnit.ac.in'
    },
  ]

  const ws = XLSX.utils.json_to_sheet(sampleData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.xlsx"')
  res.send(buffer)
})

module.exports = { importStudents, downloadTemplate }
