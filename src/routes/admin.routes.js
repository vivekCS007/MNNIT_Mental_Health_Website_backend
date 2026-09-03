const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/admin.controller')
const cmCtrl = require('../controllers/admin_counsellor.controller')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate, authorize('administrator'))

router.get('/appointments/search', ctrl.searchByRegNo) // must come before /:id
router.get('/appointments/:id', ctrl.getRequestById)
router.get('/appointments', ctrl.getAllRequests)
router.get('/statistics', ctrl.getStatistics)
router.get('/analytics', ctrl.getDashboardAnalytics)
router.get('/export', ctrl.exportData)

// Counsellor Management
router.get('/counsellors', cmCtrl.getAllCounsellors)
router.post('/counsellors', cmCtrl.createCounsellor)

// Schedule Management
router.get('/counsellors/:id/schedules', cmCtrl.getCounsellorSchedules)
router.post('/counsellors/:id/schedules', cmCtrl.addWeeklySchedule)
router.delete('/counsellors/:id/schedules/:scheduleId', cmCtrl.deleteWeeklySchedule)
router.post('/counsellors/:id/block-slot', cmCtrl.blockSpecificSlot)

module.exports = router
