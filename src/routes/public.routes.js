const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/public.controller')

router.get('/services', ctrl.getServices)
router.get('/team', ctrl.getTeamMembers)
router.get('/counsellors', ctrl.getCounsellors)
router.get('/emergency-contacts', ctrl.getEmergencyContacts)
router.get('/resources', ctrl.getResources)

module.exports = router
