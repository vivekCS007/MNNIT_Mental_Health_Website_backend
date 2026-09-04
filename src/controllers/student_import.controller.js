const XLSX = require('xlsx')
const { query } = require('../config/db')
const { hashPassword } = require('../utils/password')
const { asyncHandler } = require('../middleware/errorHandler')

/**
 * POST /admin/students/import
 * Body: multipart/form-data  field: students_file (.xlsx)
 *
 * Expected Excel columns (case-insensitive):
 *   registration_number | name | email | password | branch | course | year
 *
 * Behaviour:
 *   - Creates new student accounts for unknown reg numbers
 *   - Updates existing accounts (upsert on identifier = registration_number)
 *   - Skips rows that are missing required fields
 *   - Returns a summary { imported, updated, skipped, errors }
 */
const importStudents = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded. Please attach an .xlsx file.' })
  }

  // Parse the workbook from the uploaded buffer
  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (rawRows.length === 0) {
    return res.status(400).json({ success: false, message: 'The Excel file is empty or has no data rows.' })
  }

  // Normalize column names to lowercase with underscores
  const normalize = (key) => key.trim().toLowerCase().replace(/\s+/g, '_')

  const rows = rawRows.map(r =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [normalize(k), String(v).trim()]))
  )

  const REQUIRED = ['registration_number', 'name', 'email', 'password']
  const summary = { imported: 0, updated: 0, skipped: 0, errors: [] }

  for (const [idx, row] of rows.entries()) {
    const rowNum = idx + 2 // Excel row number (1=header)

    // Validate required fields
    const missing = REQUIRED.filter(f => !row[f])
    if (missing.length > 0) {
      summary.skipped++
      summary.errors.push(`Row ${rowNum}: Missing required fields: ${missing.join(', ')}`)
      continue
    }

    try {
      const passwordHash = await hashPassword(row.password)

      // Check if student already exists
      const { rows: existing } = await query(
        'SELECT id FROM users WHERE identifier = $1',
        [row.registration_number]
      )

      if (existing.length > 0) {
        // UPDATE existing student
        await query(
          `UPDATE users SET
            name = $1, email = $2, password_hash = $3,
            branch = $4, course = $5, year = $6, updated_at = now()
          WHERE identifier = $7`,
          [
            row.name,
            row.email,
            passwordHash,
            row.branch || null,
            row.course || null,
            row.year || null,
            row.registration_number,
          ]
        )
        summary.updated++
      } else {
        // INSERT new student
        await query(
          `INSERT INTO users (identifier, name, email, user_type, password_hash, branch, course, year)
           VALUES ($1, $2, $3, 'student', $4, $5, $6, $7)`,
          [
            row.registration_number,
            row.name,
            row.email,
            passwordHash,
            row.branch || null,
            row.course || null,
            row.year || null,
          ]
        )
        summary.imported++
      }
    } catch (err) {
      summary.errors.push(`Row ${rowNum} (${row.registration_number}): ${err.message}`)
      summary.skipped++
    }
  }

  res.json({
    success: true,
    message: `Import complete. ${summary.imported} new, ${summary.updated} updated, ${summary.skipped} skipped.`,
    summary,
  })
})

/**
 * GET /admin/students/template
 * Returns a sample .xlsx template for download
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
    },
    {
      registration_number: '21BCS002',
      name: 'Priya Sharma',
      email: 'priya.21bcs002@mnnit.ac.in',
      password: 'Pqr@2024#Def',
      branch: 'Computer Science',
      course: 'B.Tech',
      year: '2nd Year',
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
