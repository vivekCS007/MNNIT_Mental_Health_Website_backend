const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const {
  getTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember,
  getEvents, addEvent, updateEvent, deleteEvent,
  getArticles, submitArticle, updateArticleStatus, deleteArticle
} = require('../controllers/content.controller')

const router = express.Router()

// Public read routes
router.get('/team', getTeamMembers)
router.get('/events', getEvents)
router.get('/articles', getArticles) // optionally pass ?status=approved

// Protected admin routes for Team
router.post('/team', authenticate, authorize('administrator'), addTeamMember)
router.put('/team/:id', authenticate, authorize('administrator'), updateTeamMember)
router.delete('/team/:id', authenticate, authorize('administrator'), deleteTeamMember)

// Protected admin routes for Events
router.post('/events', authenticate, authorize('administrator'), addEvent)
router.put('/events/:id', authenticate, authorize('administrator'), updateEvent)
router.delete('/events/:id', authenticate, authorize('administrator'), deleteEvent)

// Protected routes for Articles
// Anyone logged in can submit an article
router.post('/articles', authenticate, submitArticle)

// Only admins can approve/reject or delete articles
router.put('/articles/:id/status', authenticate, authorize('administrator'), updateArticleStatus)
router.delete('/articles/:id', authenticate, authorize('administrator'), deleteArticle)

module.exports = router
