require('dotenv').config()
const express = require('express')
const cors = require('cors')

const { errorHandler } = require('./middleware/errorHandler')

const authRoutes = require('./routes/auth.routes')
const appointmentsRoutes = require('./routes/appointments.routes')
const counsellorRoutes = require('./routes/counsellor.routes')
const adminRoutes = require('./routes/admin.routes')
const deanRoutes = require('./routes/dean.routes')
const publicRoutes = require('./routes/public.routes')
const contentRoutes = require('./routes/content.routes')
const facultyRoutes = require('./routes/faculty.routes')

const app = express()

// Allowed frontend origins. FRONTEND_ORIGIN (set on Render) is checked first,
// then the deployed Netlify site, then local dev.
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  'https://mnnit-mhc.netlify.app/',
  'http://localhost:5173'
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl, mobile apps, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS: ' + origin))
  },
  credentials: true
}))

app.use(express.json())

app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running' }))

// These paths mirror exactly what src/services/api.js on the frontend calls —
// no frontend changes are needed as long as VITE_API_URL points at /api here.
app.use('/api/auth', authRoutes)
app.use('/api/appointments', appointmentsRoutes)
app.use('/api/counsellor', counsellorRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/dean', deanRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/faculty', facultyRoutes)

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }))
app.use(errorHandler)

module.exports = app