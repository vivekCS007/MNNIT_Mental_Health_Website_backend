const { query } = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')

// GET /dean/statistics
const getRequestStats = asyncHandler(async (req, res) => {
  const totals = await query(`
    SELECT
      COUNT(*) AS totalRequests,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pendingRequests,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) AS approvedRequests,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completedRequests,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) AS rejectedRequests
    FROM appointments
  `)
  const students = await query(`SELECT COUNT(*) AS count FROM users WHERE user_type = 'student'`)
  const counsellors = await query(`SELECT COUNT(*) AS count FROM users WHERE user_type = 'counsellor'`)

  const row = totals.rows[0]
  res.json({
    success: true,
    data: {
      totalRequests: Number(row.totalRequests),
      pendingRequests: Number(row.pendingRequests),
      approvedRequests: Number(row.approvedRequests),
      completedRequests: Number(row.completedRequests),
      rejectedRequests: Number(row.rejectedRequests),
      totalStudents: Number(students.rows[0].count),
      totalCounsellors: Number(counsellors.rows[0].count)
    }
  })
})

// GET /dean/analytics  -> { byBranch, byStatus }
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
      byStatus: byStatus.rows
    }
  })
})

// GET /dean/trends?period=week|month|year
const getTrends = asyncHandler(async (req, res) => {
  const period = req.query.period || 'month'

  let sql
  if (period === 'week') {
    sql = `
      SELECT DATE_FORMAT(appointment_date, '%d %b') AS label, COUNT(*) AS count
      FROM appointments
      WHERE appointment_date >= CURDATE() - INTERVAL 12 WEEK
      GROUP BY label, YEARWEEK(appointment_date)
      ORDER BY YEARWEEK(appointment_date)
    `
  } else if (period === 'year') {
    sql = `
      SELECT DATE_FORMAT(appointment_date, '%Y') AS label, COUNT(*) AS count
      FROM appointments
      WHERE appointment_date >= CURDATE() - INTERVAL 5 YEAR
      GROUP BY label, YEAR(appointment_date)
      ORDER BY YEAR(appointment_date)
    `
  } else {
    sql = `
      SELECT DATE_FORMAT(appointment_date, '%b %Y') AS label, COUNT(*) AS count
      FROM appointments
      WHERE appointment_date >= CURDATE() - INTERVAL 12 MONTH
      GROUP BY label, DATE_FORMAT(appointment_date, '%Y-%m')
      ORDER BY DATE_FORMAT(appointment_date, '%Y-%m')
    `
  }

  const { rows } = await query(sql)
  res.json({ success: true, data: rows })
})

// GET /dean/report?startDate=&endDate=
const generateReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query
  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'startDate and endDate are required.' })
  }

  const { rows } = await query(
    `SELECT a.request_id, a.appointment_date, a.status, u.branch
     FROM appointments a JOIN users u ON u.id = a.booker_id
     WHERE a.appointment_date BETWEEN ? AND ?
     ORDER BY a.appointment_date`,
    [startDate, endDate]
  )

  res.json({ success: true, data: rows })
})

// Generalized appointments select
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

// GET /dean/appointments
const getAllAppointments = asyncHandler(async (req, res) => {
  const { rows } = await query(`${APPT_SELECT} ORDER BY a.appointment_date DESC, a.request_id DESC`)
  const redactedRows = rows.map(r => ({
    ...r,
    action_performed: r.action_performed ? '[REDACTED - PRIVACY]' : null,
    prescription: r.prescription ? '[REDACTED - PRIVACY]' : null
  }))
  res.json({ success: true, data: redactedRows })
})

// GET /dean/export?format=csv
const exportData = asyncHandler(async (req, res) => {
  const format = req.query.format || 'csv'
  const { rows } = await query(`${APPT_SELECT} ORDER BY a.appointment_date DESC`)

  if (format !== 'csv') {
    return res.json({ success: true, data: rows })
  }

  const header = ['request_id', 'booker_name', 'booker_type', 'registration_number', 'branch', 'course', 'year', 'appointment_date', 'time_slot', 'counsellor_name', 'request_status']
  const csvLines = [header.join(',')]
  for (const r of rows) {
    csvLines.push(header.map((h) => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  }

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="dean_appointments_export.csv"')
  res.send(csvLines.join('\n'))
})

module.exports = { getRequestStats, getDashboardAnalytics, getTrends, generateReport, getAllAppointments, exportData }
