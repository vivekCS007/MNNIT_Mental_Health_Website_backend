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
    sql += ' WHERE category = ?'
  }
  sql += ' ORDER BY id ASC'
  const { rows } = await query(sql, params)
  res.json({ success: true, data: rows })
})

const addTeamMember = asyncHandler(async (req, res) => {
  const { category, name, role, email, phone, qualification, expertise, image_base64 } = req.body
  const { rows } = await query(`
    INSERT INTO team_members (category, name, role, email, phone, qualification, expertise, image_base64)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [category, name, role, email, phone, qualification, expertise, image_base64])
  
  const { rows: newlyCreated } = await query('SELECT * FROM team_members WHERE id = ?', [rows.insertId])
  res.json({ success: true, data: newlyCreated[0] })
})

const updateTeamMember = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { category, name, role, email, phone, qualification, expertise, image_base64 } = req.body
  const { rows } = await query(`
    UPDATE team_members SET 
      category = ?, name = ?, role = ?, email = ?, phone = ?, qualification = ?, expertise = ?, image_base64 = ?
    WHERE id = ?
  `, [category, name, role, email, phone, qualification, expertise, image_base64, id])
  
  if (rows.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' })
  
  const { rows: updated } = await query('SELECT * FROM team_members WHERE id = ?', [id])
  res.json({ success: true, data: updated[0] })
})

const deleteTeamMember = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rows } = await query('DELETE FROM team_members WHERE id = ?', [id])
  if (rows.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' })
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
    VALUES (?, ?, ?, ?, ?)
  `, [title, date, description, guest, image_base64])
  
  const { rows: newlyCreated } = await query('SELECT * FROM events WHERE id = ?', [rows.insertId])
  res.json({ success: true, data: newlyCreated[0] })
})

const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { title, date, description, guest, image_base64 } = req.body
  const { rows } = await query(`
    UPDATE events SET title = ?, date = ?, description = ?, guest = ?, image_base64 = ?
    WHERE id = ?
  `, [title, date, description, guest, image_base64, id])
  
  if (rows.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' })
  
  const { rows: updated } = await query('SELECT * FROM events WHERE id = ?', [id])
  res.json({ success: true, data: updated[0] })
})

const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rows } = await query('DELETE FROM events WHERE id = ?', [id])
  if (rows.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' })
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
    sql += ' WHERE status = ?'
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, title, author, date, excerpt, color, JSON.stringify(body), submittedBy, image_base64])
  
  const { rows: newlyCreated } = await query('SELECT * FROM articles WHERE id = ?', [id])
  res.json({ success: true, data: newlyCreated[0] })
})

const updateArticleStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' })
  }

  let sql = 'UPDATE articles SET status = ?'
  const params = [status]
  
  if (status === 'approved') {
    sql += ', approved_at = CURRENT_TIMESTAMP'
  }

  sql += ' WHERE id = ?'
  params.push(id)
  
  const { rows } = await query(sql, params)
  if (rows.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' })
  
  const { rows: updated } = await query('SELECT * FROM articles WHERE id = ?', [id])
  res.json({ success: true, data: updated[0] })
})

const deleteArticle = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rows } = await query('DELETE FROM articles WHERE id = ?', [id])
  if (rows.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found' })
  res.json({ success: true, message: 'Deleted successfully' })
})

module.exports = {
  getTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember,
  getEvents, addEvent, updateEvent, deleteEvent,
  getArticles, submitArticle, updateArticleStatus, deleteArticle
}
