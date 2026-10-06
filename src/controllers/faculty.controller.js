const { query } = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')

// GET /faculty/students
const getAssignedStudents = asyncHandler(async (req, res) => {
  const facultyEmail = req.user.identifier // using identifier which is official email
  
  // Get all students assigned to this faculty mentor
  const { rows: students } = await query(
    `SELECT id, name, identifier AS registration_number, email, branch, course, year 
     FROM users 
     WHERE user_type = 'student' AND mentor_email = ?`,
    [facultyEmail]
  )

  // Get appointment counts for each student
  const { rows: stats } = await query(
    `SELECT booker_id, 
            COUNT(*) AS totalAppointments,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completedAppointments,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pendingAppointments
     FROM appointments 
     GROUP BY booker_id`
  )

  // Map stats to students
  const studentsWithStats = students.map(student => {
    const studentStats = stats.find(s => s.booker_id === student.id) || {
      totalAppointments: 0,
      completedAppointments: 0,
      pendingAppointments: 0
    }
    return {
      ...student,
      stats: {
        total: Number(studentStats.totalAppointments),
        completed: Number(studentStats.completedAppointments),
        pending: Number(studentStats.pendingAppointments)
      }
    }
  })

  res.json({ success: true, data: studentsWithStats })
})

// GET /faculty/students/:studentId/history
const getStudentHistory = asyncHandler(async (req, res) => {
  const { studentId } = req.params
  const facultyEmail = req.user.identifier

  // Ensure this student is actually assigned to this faculty
  const { rows: check } = await query(
    `SELECT id FROM users WHERE id = ? AND mentor_email = ?`,
    [studentId, facultyEmail]
  )
  if (check.length === 0) {
    return res.status(403).json({ success: false, message: 'Not authorized to view this student.' })
  }

  const { rows } = await query(
    `SELECT a.request_id, a.appointment_date, a.time_slot, a.status, a.resolution, c.name AS counsellor_name
     FROM appointments a
     LEFT JOIN users c ON c.id = a.counsellor_id
     WHERE a.booker_id = ?
     ORDER BY a.appointment_date DESC`,
    [studentId]
  )

  res.json({ success: true, data: rows })
})

module.exports = { getAssignedStudents, getStudentHistory }
