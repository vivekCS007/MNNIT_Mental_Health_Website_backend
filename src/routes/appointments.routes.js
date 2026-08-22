const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/appointments.controller')
const { authenticate, authorize } = require('../middleware/auth')

// Every route here requires a logged-in student, faculty, or staff user
router.use(authenticate, authorize('student', 'faculty', 'staff'))

router.get('/profile', ctrl.getProfile)
router.get('/counsellors', ctrl.getActiveCounsellors)
router.get('/availability', ctrl.getAvailability) // must come before /:id
router.post('/', ctrl.bookAppointment)
router.get('/', ctrl.getAppointments)
router.get('/:id', ctrl.getAppointmentById)
router.put('/:id/cancel', ctrl.cancelAppointment)

module.exports = router
