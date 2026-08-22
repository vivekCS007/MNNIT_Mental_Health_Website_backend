const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/dean.controller')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate, authorize('dean'))

router.get('/analytics', ctrl.getDashboardAnalytics)
router.get('/statistics', ctrl.getRequestStats)
router.get('/trends', ctrl.getTrends)
router.get('/report', ctrl.generateReport)
router.get('/export', ctrl.exportData)
router.get('/appointments', ctrl.getAllAppointments)

module.exports = router
