const express = require('express')
const router = express.Router()
const { getAssignedStudents, getStudentHistory } = require('../controllers/faculty.controller')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)
router.use(authorize('faculty'))

router.get('/students', getAssignedStudents)
router.get('/students/:studentId/history', getStudentHistory)

module.exports = router
