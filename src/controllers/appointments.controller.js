const { query } = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')
const { encrypt, decrypt } = require('../utils/encryption')

// Shape returned to the frontend's bookerAPI (fields the dashboard tables read)
const APPT_SELECT = `
  SELECT
    a.request_id,
    a.appointment_date,
    a.time_slot,
    a.description,
    a.status,
    a.action_performed,
    a.resolution,
    a.prescription,
    u.name AS student_name,
    u.identifier AS registration_number,
    u.branch,
    c.name AS counsellor_name
  FROM appointments a
  JOIN users u ON u.id = a.booker_id
  LEFT JOIN users c ON c.id = a.counsellor_id
`

// GET /appointments/profile
const getProfile = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, email, identifier AS registration_number, branch, user_type FROM users WHERE id = $1',
    [req.user.id]
  )
  res.json({ success: true, data: rows[0] })
})

// GET /appointments/counsellors
const getActiveCounsellors = asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT id, name FROM users WHERE user_type = 'counsellor' ORDER BY name ASC`);
  res.json({ success: true, data: rows })
})

// GET /appointments/availability?counsellorId=...&month=...&year=...
const getAvailability = asyncHandler(async (req, res) => {
  const { counsellorId, date } = req.query; // simplified: pass ?date=YYYY-MM-DD or get all
  // For now, this just returns all active schedules for the requested counsellor
  // and a list of taken slots on specific dates.
  
  if (!counsellorId || counsellorId === 'general') {
    // If general, get all active schedules
    const schedules = await query(`SELECT * FROM counsellor_schedules WHERE is_active = true`);
    const taken = await query(`SELECT appointment_date, time_slot FROM appointments WHERE status IN ('PENDING', 'APPROVED')`);
    return res.json({ success: true, data: { schedules: schedules.rows, taken: taken.rows } })
  }

  const schedules = await query(`SELECT * FROM counsellor_schedules WHERE counsellor_id = $1 AND is_active = true`, [counsellorId]);
  const taken = await query(
    `SELECT appointment_date, time_slot FROM appointments 
     WHERE counsellor_id = $1 AND status IN ('PENDING', 'APPROVED')`, 
    [counsellorId]
  );
  
  res.json({ success: true, data: { schedules: schedules.rows, taken: taken.rows } })
})

// POST /appointments   body: { appointment_date, time_slot, description, requested_counsellor_id }
const bookAppointment = asyncHandler(async (req, res) => {
  const { appointment_date, time_slot, description, requested_counsellor_id } = req.body
  if (!appointment_date || !time_slot) {
    return res.status(400).json({ success: false, message: 'Please select date and time slot.' })
  }

  // Prevent double-booking the same slot on the same day (any booker, since one counsellor pool)
  const clash = await query(
    `SELECT 1 FROM appointments
     WHERE appointment_date = $1 AND time_slot = $2 AND booker_id = $3 AND status IN ('PENDING','APPROVED')`,
    [appointment_date, time_slot, req.user.id]
  )
  if (clash.rows.length > 0) {
    return res.status(409).json({ success: false, message: 'You already have a request for that date/time.' })
  }

  const cid = requested_counsellor_id || null;

  try {
    const { rows } = await query(
      `INSERT INTO appointments (booker_id, requested_counsellor_id, counsellor_id, appointment_date, time_slot, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING') RETURNING request_id`,
      [req.user.id, cid, cid, appointment_date, time_slot, description || null]
    )
    res.status(201).json({ success: true, message: 'Appointment booked successfully!', request_id: rows[0].request_id })
  } catch (err) {
    if (err.code === '23505') { // Postgres unique constraint violation
      return res.status(409).json({ success: false, message: 'This slot was just taken by someone else! Please choose another.' })
    }
    throw err
  }
})

// GET /appointments  — only the logged-in user's own appointments
const getAppointments = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `${APPT_SELECT} WHERE a.booker_id = $1 ORDER BY a.appointment_date DESC, a.request_id DESC`,
    [req.user.id]
  )
  const decryptedRows = rows.map(r => ({
    ...r,
    action_performed: decrypt(r.action_performed),
    prescription: decrypt(r.prescription)
  }))
  res.json({ success: true, data: decryptedRows })
})

// GET /appointments/:id
const getAppointmentById = asyncHandler(async (req, res) => {
  const { rows } = await query(`${APPT_SELECT} WHERE a.request_id = $1 AND a.booker_id = $2`, [req.params.id, req.user.id])
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Appointment not found.' })
  const apt = rows[0]
  apt.action_performed = decrypt(apt.action_performed)
  apt.prescription = decrypt(apt.prescription)
  res.json({ success: true, data: apt })
})

// PUT /appointments/:id/cancel — only the owner, only while PENDING
const cancelAppointment = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `UPDATE appointments SET status = 'REJECTED', updated_at = now()
     WHERE request_id = $1 AND booker_id = $2 AND status = 'PENDING'
     RETURNING request_id`,
    [req.params.id, req.user.id]
  )
  if (!rows[0]) {
    return res.status(400).json({ success: false, message: 'Could not cancel. Try again.' })
  }
  res.json({ success: true, message: 'Appointment cancelled.' })
})

module.exports = { getProfile, bookAppointment, getAppointments, getAppointmentById, cancelAppointment, getAvailability, getActiveCounsellors }
