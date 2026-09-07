const { query } = require('../config/db')
const { asyncHandler } = require('../middleware/errorHandler')

// ---------------------------------------------------------------------------
// TEAM MEMBERS
// ---------------------------------------------------------------------------
const getTeamMembers = asyncHandler(async (req, res) => {
  const { category } = req.query
  let sql = 'SELECT * FROM team_members'
  const params = []
  if (category) {
    params.push(category)
    sql += ' WHERE category = $1'
  }
  sql += ' ORDER BY id ASC'
  const { rows } = await query(sql, params)
  res.json({ success: true, data: rows })
})

const addTeamMember = asyncHandler(async (req, res) => {
  const { category, name, role, email, phone, qualification, expertise, image_base64 } = req.body
  const { rows } = await query(`
    INSERT INTO team_members (category, name, role, email, phone, qualification, expertise, image_base64)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
  `, [category, name, role, email, phone, qualification, expertise, image_base64])
  res.json({ success: true, data: rows[0] })
})

const updateTeamMember = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { category, name, role, email, phone, qualification, expertise, image_base64 } = req.body
  const { rows } = await query(`
    UPDATE team_members SET 
      category = $1, name = $2, role = $3, email = $4, phone = $5, qualification = $6, expertise = $7, image_base64 = $8
    WHERE id = $9 RETURNING *
  `, [category, name, role, email, phone, qualification, expertise, image_base64, id])
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' })
  res.json({ success: true, data: rows[0] })
})

const deleteTeamMember = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rowCount } = await query('DELETE FROM team_members WHERE id = $1', [id])
  if (rowCount === 0) return res.status(404).json({ success: false, message: 'Not found' })
  res.json({ success: true, message: 'Deleted successfully' })
})

// ---------------------------------------------------------------------------
// EVENTS
// ---------------------------------------------------------------------------
const getEvents = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM events ORDER BY created_at DESC')
  res.json({ success: true, data: rows })
})

const addEvent = asyncHandler(async (req, res) => {
  const { title, date, description, guest, image_base64 } = req.body
  const { rows } = await query(`
    INSERT INTO events (title, date, description, guest, image_base64)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `, [title, date, description, guest, image_base64])
  res.json({ success: true, data: rows[0] })
})

const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { title, date, description, guest, image_base64 } = req.body
  const { rows } = await query(`
    UPDATE events SET title = $1, date = $2, description = $3, guest = $4, image_base64 = $5
    WHERE id = $6 RETURNING *
  `, [title, date, description, guest, image_base64, id])
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' })
  res.json({ success: true, data: rows[0] })
})

const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rowCount } = await query('DELETE FROM events WHERE id = $1', [id])
  if (rowCount === 0) return res.status(404).json({ success: false, message: 'Not found' })
  res.json({ success: true, message: 'Deleted successfully' })
})

// ---------------------------------------------------------------------------
// ARTICLES
// ---------------------------------------------------------------------------
const getArticles = asyncHandler(async (req, res) => {
  const { status } = req.query
  let sql = 'SELECT * FROM articles'
  const params = []
  if (status) {
    params.push(status)
    sql += ' WHERE status = $1'
  }
  sql += ' ORDER BY submitted_at DESC'
  const { rows } = await query(sql, params)
  res.json({ success: true, data: rows })
})

const submitArticle = asyncHandler(async (req, res) => {
  const { title, author, date, excerpt, color, body, image_base64 } = req.body
  const submittedBy = req.user ? req.user.identifier : 'Anonymous'
  const id = 'user_' + Date.now()

  const { rows } = await query(`
    INSERT INTO articles (id, title, author, date, excerpt, color, body, submitted_by, image_base64)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [id, title, author, date, excerpt, color, JSON.stringify(body), submittedBy, image_base64])
  res.json({ success: true, data: rows[0] })
})

const updateArticleStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' })
  }

  let sql = 'UPDATE articles SET status = $1'
  const params = [status, id]
  
  if (status === 'approved') {
    sql += ', approved_at = now()'
  }

  sql += ' WHERE id = $2 RETURNING *'
  
  const { rows } = await query(sql, params)
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' })
  res.json({ success: true, data: rows[0] })
})

const deleteArticle = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rowCount } = await query('DELETE FROM articles WHERE id = $1', [id])
  if (rowCount === 0) return res.status(404).json({ success: false, message: 'Not found' })
  res.json({ success: true, message: 'Deleted successfully' })
})

module.exports = {
  getTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember,
  getEvents, addEvent, updateEvent, deleteEvent,
  getArticles, submitArticle, updateArticleStatus, deleteArticle
}
