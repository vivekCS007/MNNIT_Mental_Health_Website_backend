const { query } = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')

// GET /public/team
const getTeamMembers = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM team_members ORDER BY category, name')
  res.json({ success: true, data: rows })
})

// GET /public/counsellors
// Returns all counsellors listed in the system (safe, no sensitive data).
const getCounsellors = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT id, name, email, branch
    FROM users
    WHERE user_type = 'counsellor'
    ORDER BY name ASC
  `)
  res.json({ success: true, data: rows })
})

// GET /public/emergency-contacts
const getEmergencyContacts = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM emergency_contacts ORDER BY category')
  res.json({ success: true, data: rows })
})

// GET /public/services — not backed by a table yet; the frontend still uses
// a static list in src/components/Services.jsx. Wire this up the same way
// as getTeamMembers (add a `services` table) if you want it editable later.
const getServices = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [], message: 'Not yet migrated from static frontend content.' })
})

// GET /public/resources — same note as above (FAQs/articles/events currently
// live in src/data/*.js on the frontend).
const getResources = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [], message: 'Not yet migrated from static frontend content.' })
})

module.exports = { getTeamMembers, getCounsellors, getEmergencyContacts, getServices, getResources }
