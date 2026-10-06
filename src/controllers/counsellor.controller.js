const { query } = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')
const { encrypt, decrypt } = require('../utils/encryption')

const APPT_SELECT = `
  SELECT
    a.request_id,
    a.booker_id,
    a.appointment_date,
    a.time_slot,
    a.description,
    a.status,
    a.action_performed,
    a.resolution,
    a.prescription,
    u.name AS booker_name,
    u.identifier AS registration_number,
    u.user_type AS booker_type,
    u.email AS booker_email,
    u.branch,
    c.name AS counsellor_name
  FROM appointments a
  JOIN users u ON u.id = a.booker_id
  LEFT JOIN users c ON c.id = a.counsellor_id
`

// GET /counsellor/profile
const getProfile = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, name, email, user_type FROM users WHERE id = ?', [req.user.id])
  res.json({ success: true, data: rows[0] })
})

// PUT /counsellor/profile   body: { name, email, ... }
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body
  await query(
    'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
    [name, email, req.user.id]
  )
  const { rows } = await query('SELECT id, name, email FROM users WHERE id = ?', [req.user.id])
  res.json({ success: true, data: rows[0] })
})

// GET /counsellor/appointments/pending
const getPendingRequests = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `${APPT_SELECT} WHERE a.status = 'PENDING' AND (a.requested_counsellor_id IS NULL OR a.requested_counsellor_id = ?)
     ORDER BY 
       CASE WHEN a.requested_counsellor_id = ? THEN 0 ELSE 1 END ASC,
       a.appointment_date ASC`,
    [req.user.id, req.user.id]
  )
  const decryptedRows = rows.map(r => ({
    ...r,
    action_performed: decrypt(r.action_performed),
    prescription: decrypt(r.prescription)
  }))
  res.json({ success: true, data: decryptedRows })
})

// GET /counsellor/appointments/solved
const getSolvedRequests = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `${APPT_SELECT} WHERE a.counsellor_id = ? AND a.status IN ('COMPLETED','REJECTED','APPROVED')
     ORDER BY a.appointment_date DESC`,
    [req.user.id]
  )
  const decryptedRows = rows.map(r => ({
    ...r,
    action_performed: decrypt(r.action_performed),
    prescription: decrypt(r.prescription)
  }))
  res.json({ success: true, data: decryptedRows })
})

// GET /counsellor/appointments/:id
const getAppointmentById = asyncHandler(async (req, res) => {
  const { rows } = await query(`${APPT_SELECT} WHERE a.request_id = ?`, [req.params.id])
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Appointment not found.' })
  const apt = rows[0]
  apt.action_performed = decrypt(apt.action_performed)
  apt.prescription = decrypt(apt.prescription)
  res.json({ success: true, data: apt })
})

// PUT /counsellor/appointments/:id   body: { status: 'APPROVED' | 'REJECTED' }
const updateAppointment = asyncHandler(async (req, res) => {
  const { status } = req.body
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' })
  }

  try {
    const { rows } = await query(
      `UPDATE appointments SET status = ?, counsellor_id = ?
       WHERE request_id = ? AND status = 'PENDING'`,
      [status, req.user.id, req.params.id]
    )
    if (rows.affectedRows === 0) return res.status(400).json({ success: false, message: 'Failed to update. It may have been taken by someone else or cancelled.' })
    res.json({ success: true, message: status === 'APPROVED' ? 'Request approved! Student has been notified.' : 'Request rejected.' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'You already have an appointment booked at this exact time.' })
    }
    throw err
  }
})

// POST /counsellor/appointments/:id/confirm
const confirmBooking = asyncHandler(async (req, res) => {
  const { action_performed, status, prescription } = req.body
  if (!action_performed || !action_performed.trim()) {
    return res.status(400).json({ success: false, message: 'Please add session notes.' })
  }
  const resolution = ['RESOLVED', 'FOLLOW_UP', 'REFERRED'].includes(status) ? status : 'RESOLVED'

  const encryptedNotes = encrypt(action_performed)
  const encryptedRx = encrypt(prescription)

  const { rows } = await query(
    `UPDATE appointments
     SET status = 'COMPLETED', resolution = ?, action_performed = ?, prescription = COALESCE(?, prescription), counsellor_id = ?
     WHERE request_id = ?`,
    [resolution, encryptedNotes, encryptedRx ?? null, req.user.id, req.params.id]
  )
  if (rows.affectedRows === 0) return res.status(400).json({ success: false, message: 'Failed to complete. Try again.' })

  res.json({ success: true, message: 'Session marked as completed!' })
})

// GET /counsellor/bookers/:bookerId/history
const getBookerHistory = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `${APPT_SELECT} WHERE a.booker_id = ? ORDER BY a.appointment_date DESC, a.request_id DESC`,
    [req.params.bookerId]
  )
  const decryptedRows = rows.map(r => ({
    ...r,
    action_performed: decrypt(r.action_performed),
    prescription: decrypt(r.prescription)
  }))
  res.json({ success: true, data: decryptedRows })
})

// PUT /counsellor/appointments/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  if (!['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' })
  }
  const { rows } = await query(
    `UPDATE appointments SET status = ?, counsellor_id = ?
     WHERE request_id = ?`,
    [status, req.user.id, req.params.id]
  )
  if (rows.affectedRows === 0) return res.status(400).json({ success: false, message: 'Failed to update status.' })
  res.json({ success: true, message: 'Status updated to ' + status + '.' })
})

// PUT /counsellor/appointments/:id/prescription
const savePrescription = asyncHandler(async (req, res) => {
  const { prescription, action_performed } = req.body
  const encryptedRx = encrypt(prescription)
  const encryptedNotes = encrypt(action_performed)

  const { rows } = await query(
    `UPDATE appointments
     SET prescription = COALESCE(?, prescription),
         action_performed = COALESCE(?, action_performed),
         counsellor_id = ?
     WHERE request_id = ?`,
    [encryptedRx ?? null, encryptedNotes ?? null, req.user.id, req.params.id]
  )
  if (rows.affectedRows === 0) return res.status(400).json({ success: false, message: 'Failed to save prescription.' })
  res.json({ success: true, message: 'Prescription saved.' })
})

module.exports = { getProfile, updateProfile, getPendingRequests, getSolvedRequests, getAppointmentById, updateAppointment, confirmBooking, getBookerHistory, updateStatus, savePrescription }
