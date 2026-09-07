const express = require('express')
const { protect, restrictTo } = require('../middleware/auth')
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
router.post('/team', protect, restrictTo('administrator'), addTeamMember)
router.put('/team/:id', protect, restrictTo('administrator'), updateTeamMember)
router.delete('/team/:id', protect, restrictTo('administrator'), deleteTeamMember)

// Protected admin routes for Events
router.post('/events', protect, restrictTo('administrator'), addEvent)
router.put('/events/:id', protect, restrictTo('administrator'), updateEvent)
router.delete('/events/:id', protect, restrictTo('administrator'), deleteEvent)

// Protected routes for Articles
// Anyone logged in can submit an article
router.post('/articles', protect, submitArticle)

// Only admins can approve/reject or delete articles
router.put('/articles/:id/status', protect, restrictTo('administrator'), updateArticleStatus)
router.delete('/articles/:id', protect, restrictTo('administrator'), deleteArticle)

module.exports = router
