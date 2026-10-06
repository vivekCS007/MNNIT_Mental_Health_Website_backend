const XLSX = require('xlsx')
const { query } = require('../config/db')
const { hashPassword } = require('../utils/password')
const { asyncHandler } = require('../middleware/errorHandler')

/**
 * POST /admin/faculty/import
 */
const importFaculty = asyncHandler(async (req, res) => {
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

  const REQUIRED = ['employee_id', 'name', 'email', 'password']
  const summary = { imported: 0, updated: 0, skipped: 0, errors: [] }

  for (const [idx, row] of rows.entries()) {
    const rowNum = idx + 2 

    const missing = REQUIRED.filter(f => !row[f])
    if (missing.length > 0) {
      summary.skipped++
      summary.errors.push(`Row ${rowNum}: Missing required fields: ${missing.join(', ')}`)
      continue
    }

    try {
      const passwordHash = await hashPassword(row.password)

      const { rows: existing } = await query(
        'SELECT id FROM users WHERE identifier = ?',
        [row.employee_id]
      )

      if (existing.length > 0) {
        await query(
          `UPDATE users SET
            name = ?, email = ?, password_hash = ?, branch = ?
          WHERE identifier = ?`,
          [
            row.name,
            row.email,
            passwordHash,
            row.department || null,
            row.employee_id,
          ]
        )
        summary.updated++
      } else {
        await query(
          `INSERT INTO users (identifier, name, email, user_type, password_hash, branch)
           VALUES (?, ?, ?, 'faculty', ?, ?)`,
          [
            row.employee_id,
            row.name,
            row.email,
            passwordHash,
            row.department || null
          ]
        )
        summary.imported++
      }
    } catch (err) {
      summary.errors.push(`Row ${rowNum} (${row.employee_id}): ${err.message}`)
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
 * GET /admin/faculty/template
 */
const downloadTemplate = asyncHandler(async (req, res) => {
  const sampleData = [
    {
      employee_id: 'FAC001',
      name: 'Dr. Ravi Sharma',
      email: 'dr.ravi@mnnit.ac.in',
      password: 'Xyz@2024#Abc',
      department: 'Computer Science',
    },
    {
      employee_id: 'FAC002',
      name: 'Dr. Anita Desai',
      email: 'dr.anita@mnnit.ac.in',
      password: 'Pqr@2024#Def',
      department: 'Electrical Engineering',
    },
  ]

  const ws = XLSX.utils.json_to_sheet(sampleData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Faculty')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="faculty_import_template.xlsx"')
  res.send(buffer)
})

module.exports = { importFaculty, downloadTemplate }
