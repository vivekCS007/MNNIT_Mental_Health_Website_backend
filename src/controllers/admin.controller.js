const { query } = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')

const APPT_SELECT = `
  SELECT
    a.request_id,
    a.appointment_date,
    a.time_slot,
    a.description,
    a.status AS request_status,
    a.action_performed,
    a.resolution,
    a.prescription,
    u.name AS booker_name,
    u.identifier AS registration_number,
    u.user_type AS booker_type,
    u.email AS booker_email,
    u.branch,
    u.course,
    u.year,
    c.name AS counsellor_name
  FROM appointments a
  JOIN users u ON u.id = a.booker_id
  LEFT JOIN users c ON c.id = a.counsellor_id
`

// GET /admin/appointments?status=PENDING
const getAllRequests = asyncHandler(async (req, res) => {
  const { status } = req.query
  const params = []
  let sql = APPT_SELECT
  if (status) {
    params.push(status)
    sql += ` WHERE a.status = ?`
  }
  sql += ' ORDER BY a.appointment_date DESC'

  const { rows } = await query(sql, params)
  const redactedRows = rows.map(r => ({
    ...r,
    action_performed: r.action_performed ? '[REDACTED - SENSITIVE]' : null,
    prescription: r.prescription ? '[REDACTED - SENSITIVE]' : null
  }))
  res.json({ success: true, data: redactedRows })
})

// GET /admin/appointments/:id
const getRequestById = asyncHandler(async (req, res) => {
  const { rows } = await query(`${APPT_SELECT} WHERE a.request_id = ?`, [req.params.id])
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found.' })
  const apt = rows[0]
  apt.action_performed = apt.action_performed ? '[REDACTED - SENSITIVE]' : null
  apt.prescription = apt.prescription ? '[REDACTED - SENSITIVE]' : null
  res.json({ success: true, data: apt })
})

// GET /admin/appointments/search?regNo=20BCS001
const searchByRegNo = asyncHandler(async (req, res) => {
  const { regNo } = req.query
  if (!regNo) return res.status(400).json({ success: false, message: 'regNo query param is required.' })

  const { rows } = await query(`${APPT_SELECT} WHERE u.identifier LIKE ? ORDER BY a.appointment_date DESC`, [`%${regNo}%`])
  const redactedRows = rows.map(r => ({
    ...r,
    action_performed: r.action_performed ? '[REDACTED - SENSITIVE]' : null,
    prescription: r.prescription ? '[REDACTED - SENSITIVE]' : null
  }))
  res.json({ success: true, data: redactedRows })
})

// GET /admin/statistics
const getStatistics = asyncHandler(async (req, res) => {
  const totals = await query(`
    SELECT
      COUNT(*) AS totalRequests,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pendingRequests,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completedRequests
    FROM appointments
  `)
  const userStats = await query(`
    SELECT
      COUNT(CASE WHEN user_type = 'student' THEN 1 END) AS totalStudents,
      COUNT(CASE WHEN user_type = 'faculty' THEN 1 END) AS totalFaculty,
      COUNT(CASE WHEN user_type = 'staff' THEN 1 END)   AS totalStaff
    FROM users
  `)

  const row = totals.rows[0]
  const users = userStats.rows[0]
  res.json({
    success: true,
    data: {
      totalRequests: Number(row.totalRequests),
      pendingRequests: Number(row.pendingRequests),
      completedRequests: Number(row.completedRequests),
      totalStudents: Number(users.totalStudents),
      totalFaculty: Number(users.totalFaculty),
      totalStaff: Number(users.totalStaff)
    }
  })
})

// GET /admin/export?format=csv
const exportData = asyncHandler(async (req, res) => {
  const format = req.query.format || 'csv'
  const { rows } = await query(`${APPT_SELECT} ORDER BY a.appointment_date DESC`)

  if (format !== 'csv') {
    return res.json({ success: true, data: rows })
  }

  const columns = [
    { label: 'Request ID',       key: 'request_id' },
    { label: 'Booker Name',      key: 'booker_name' },
    { label: 'Booker Email',     key: 'booker_email' },
    { label: 'User Type',        key: 'booker_type' },
    { label: 'Reg No / Emp ID',  key: 'registration_number' },
    { label: 'Branch / Dept',    key: 'branch' },
    { label: 'Course',           key: 'course' },
    { label: 'Year',             key: 'year' },
    { label: 'Appointment Date', key: 'appointment_date' },
    { label: 'Time Slot',        key: 'time_slot' },
    { label: 'Counsellor',       key: 'counsellor_name' },
    { label: 'Status',           key: 'request_status' },
    { label: 'Description',      key: 'description' },
    { label: 'Session Notes',    key: 'action_performed' },
    { label: 'Resolution',       key: 'resolution' },
    { label: 'Prescription',     key: 'prescription' },
  ]

  const escape = (val) => `"${(val ?? '').toString().replace(/"/g, '""')}"`

  const csvLines = [columns.map(c => escape(c.label)).join(',')]
  for (const r of rows) {
    const row = columns.map(c => {
      if (c.key === 'appointment_date' && r[c.key]) {
        return escape(new Date(r[c.key]).toLocaleDateString('en-IN'))
      }
      return escape(r[c.key])
    })
    csvLines.push(row.join(','))
  }

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="appointments_export.csv"')
  res.send(csvLines.join('\n'))
})

// GET /admin/analytics
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const userType = req.query.userType || 'all'

  let branchSql = `
    SELECT COALESCE(u.branch, 'Unspecified') AS branch,
           u.user_type AS booker_type,
           COUNT(*) AS count
    FROM appointments a JOIN users u ON u.id = a.booker_id
  `
  let statusSql = `
    SELECT a.status, COUNT(*) AS count 
    FROM appointments a JOIN users u ON u.id = a.booker_id
  `
  const params = []

  if (userType !== 'all') {
    params.push(userType)
    branchSql += ` WHERE u.user_type = ?`
    statusSql += ` WHERE u.user_type = ?`
  }

  branchSql += ` GROUP BY u.branch, u.user_type ORDER BY branch`
  statusSql += ` GROUP BY a.status`

  const byBranch = await query(branchSql, params)
  const byStatus = await query(statusSql, params)

  res.json({
    success: true,
    data: {
      byBranch: byBranch.rows,
      byStatus: byStatus.rows,
    }
  })
})

module.exports = { getAllRequests, getRequestById, searchByRegNo, getStatistics, exportData, getDashboardAnalytics }
