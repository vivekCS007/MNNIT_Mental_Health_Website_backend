const { query } = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')

// GET /dean/statistics
const getRequestStats = asyncHandler(async (req, res) => {
  const totals = await query(`
    SELECT
      COUNT(*) FILTER (WHERE true)                  AS "totalRequests",
      COUNT(*) FILTER (WHERE status = 'PENDING')    AS "pendingRequests",
      COUNT(*) FILTER (WHERE status = 'APPROVED')   AS "approvedRequests",
      COUNT(*) FILTER (WHERE status = 'COMPLETED')  AS "completedRequests",
      COUNT(*) FILTER (WHERE status = 'REJECTED')   AS "rejectedRequests"
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
    branchSql += ` WHERE u.user_type = $1`
    statusSql += ` WHERE u.user_type = $1`
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
      SELECT to_char(date_trunc('week', appointment_date), 'DD Mon') AS label, COUNT(*) AS count
      FROM appointments
      WHERE appointment_date >= CURRENT_DATE - INTERVAL '12 weeks'
      GROUP BY 1, date_trunc('week', appointment_date)
      ORDER BY date_trunc('week', appointment_date)
    `
  } else if (period === 'year') {
    sql = `
      SELECT to_char(date_trunc('year', appointment_date), 'YYYY') AS label, COUNT(*) AS count
      FROM appointments
      WHERE appointment_date >= CURRENT_DATE - INTERVAL '5 years'
      GROUP BY 1, date_trunc('year', appointment_date)
      ORDER BY date_trunc('year', appointment_date)
    `
  } else {
    sql = `
      SELECT to_char(date_trunc('month', appointment_date), 'Mon YYYY') AS label, COUNT(*) AS count
      FROM appointments
      WHERE appointment_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY 1, date_trunc('month', appointment_date)
      ORDER BY date_trunc('month', appointment_date)
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
     WHERE a.appointment_date BETWEEN $1 AND $2
     ORDER BY a.appointment_date`,
    [startDate, endDate]
  )

  res.json({ success: true, data: rows })
})

// Generalized appointments select (same shape the admin/counsellor use)
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

// GET /dean/appointments  -> full list for the monitoring table (read-only)
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
