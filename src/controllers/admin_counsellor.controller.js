const { query } = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')
const bcrypt = require('bcryptjs')

// GET /admin/counsellors
const getAllCounsellors = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT id, name, email, identifier, branch, user_type, created_at 
    FROM users 
    WHERE user_type = 'counsellor' 
    ORDER BY name ASC
  `)
  res.json({ success: true, data: rows })
})

// POST /admin/counsellors
const createCounsellor = asyncHandler(async (req, res) => {
  const { name, email, identifier, branch, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, identifier, branch, user_type)
       VALUES ($1, $2, $3, $4, $5, 'counsellor')
       RETURNING id, name, email, identifier, branch, user_type, created_at`,
      [name, email, hashedPassword, identifier || email, branch || null]
    )
    res.status(201).json({ success: true, data: rows[0] })
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ success: false, message: 'User with this email or identifier already exists.' })
    }
    throw error
  }
})

// GET /admin/counsellors/:id/schedules
const getCounsellorSchedules = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rows } = await query(
    `SELECT * FROM counsellor_schedules WHERE counsellor_id = $1 ORDER BY day_of_week ASC, start_time ASC`,
    [id]
  )
  res.json({ success: true, data: rows })
})

// POST /admin/counsellors/:id/schedules
const addWeeklySchedule = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { day_of_week, start_time, end_time, slot_duration, mode } = req.body

  if (day_of_week === undefined || !start_time || !end_time) {
    return res.status(400).json({ success: false, message: 'Missing required schedule fields.' })
  }

  const { rows } = await query(
    `INSERT INTO counsellor_schedules (counsellor_id, day_of_week, start_time, end_time, slot_duration, mode)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, day_of_week, start_time, end_time, slot_duration || 30, mode || 'offline']
  )
  res.status(201).json({ success: true, data: rows[0] })
})

// DELETE /admin/counsellors/:id/schedules/:scheduleId
const deleteWeeklySchedule = asyncHandler(async (req, res) => {
  const { id, scheduleId } = req.params
  const { rowCount } = await query(
    `DELETE FROM counsellor_schedules WHERE id = $1 AND counsellor_id = $2`,
    [scheduleId, id]
  )
  
  if (rowCount === 0) {
    return res.status(404).json({ success: false, message: 'Schedule not found or does not belong to this counsellor.' })
  }
  
  res.json({ success: true, message: 'Schedule deleted successfully.' })
})

// POST /admin/counsellors/:id/block-slot
const blockSpecificSlot = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { date, time_slot } = req.body
  const adminId = req.user.id // From JWT auth middleware

  if (!date || !time_slot) {
    return res.status(400).json({ success: false, message: 'Date and time_slot are required.' })
  }

  try {
    const { rows } = await query(
      `INSERT INTO appointments (
         booker_id, requested_counsellor_id, counsellor_id, appointment_date, time_slot, status, description
       ) VALUES ($1, $2, $2, $3, $4, 'APPROVED', 'BLOCKED BY ADMIN')
       RETURNING id, appointment_date, time_slot`,
      [adminId, id, date, time_slot]
    )
    res.status(201).json({ success: true, data: rows[0], message: 'Slot blocked successfully.' })
  } catch (error) {
    if (error.code === '23505') { // Unique violation (slot already taken or blocked)
      return res.status(409).json({ success: false, message: 'This slot is already booked or blocked.' })
    }
    throw error
  }
})

module.exports = {
  getAllCounsellors,
  createCounsellor,
  getCounsellorSchedules,
  addWeeklySchedule,
  deleteWeeklySchedule,
  blockSpecificSlot
}
