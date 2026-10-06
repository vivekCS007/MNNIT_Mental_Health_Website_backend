const express = require('express')
const multer = require('multer')
const router = express.Router()
const ctrl = require('../controllers/admin.controller')
const cmCtrl = require('../controllers/admin_counsellor.controller')
const siCtrl = require('../controllers/student_import.controller')
const fiCtrl = require('../controllers/faculty_import.controller')
const { authenticate, authorize } = require('../middleware/auth')

// Store uploaded files in memory (buffer), not disk — we process immediately
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.xlsx$/i)) cb(null, true)
    else cb(new Error('Only .xlsx files are allowed'), false)
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
})

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

// Student Bulk Import
router.post('/students/import', upload.single('students_file'), siCtrl.importStudents)
router.get('/students/template', siCtrl.downloadTemplate)

// Faculty Bulk Import
router.post('/faculty/import', upload.single('faculty_file'), fiCtrl.importFaculty)
router.get('/faculty/template', fiCtrl.downloadTemplate)

module.exports = router
