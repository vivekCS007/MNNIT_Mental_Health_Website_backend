const crypto = require('crypto')
const { query } = require('../config/db')
const { hashPassword, comparePassword } = require('../utils/password')
const { signToken } = require('../utils/jwt')
const { asyncHandler } = require('../middleware/errorHandler')
const { sendPasswordResetEmail } = require('../utils/mailer')

// POST /auth/login   body: { userType, userId, password }
const login = asyncHandler(async (req, res) => {
  const { userType, userId, password } = req.body

  if (!userType || !userId || !password) {
    return res.status(400).json({ success: false, message: 'Please fill in all fields' })
  }

  const { rows } = await query(
    'SELECT * FROM users WHERE identifier = ? AND user_type = ?',
    [userId.trim(), userType]
  )
  const user = rows[0]

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your ID and password.' })
  }

  const valid = await comparePassword(password.trim(), user.password_hash)
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your ID and password.' })
  }

  const token = signToken({ id: user.id, userType: user.user_type, name: user.name })

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      registration_number: user.user_type === 'student' ? user.identifier : undefined,
      branch: user.branch
    }
  })
})

// POST /auth/forgot-password   body: { email }
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' })

  const { rows } = await query('SELECT id, name, email FROM users WHERE identifier = ? OR email = ?', [email.trim(), email.trim()])
  const user = rows[0]

  // Always respond success (don't reveal whether an email exists)
  if (user) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

    await query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, otp, expiresAt]
    )
    
    try {
      await sendPasswordResetEmail(user.email || email, user.name || 'User', otp)
    } catch (mailErr) {
      console.error('Email send failed:', mailErr.message)
    }
  }

  res.json({ success: true, message: 'Password reset OTP sent to your email!' })
})

// POST /auth/reset-password   body: { token, password }
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'OTP and new password are required' })
  }

  const { rows } = await query(
    'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > now()',
    [token]
  )
  const reset = rows[0]
  if (!reset) {
    return res.status(400).json({ success: false, message: 'OTP is invalid or has expired.' })
  }

  const passwordHash = await hashPassword(password)
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, reset.user_id])
  await query('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id])

  res.json({ success: true, message: 'Password reset successfully!' })
})

// POST /auth/change-password   (authenticated)   body: { currentPassword, newPassword }
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Please fill in all fields' })
  }

  const { rows } = await query('SELECT * FROM users WHERE id = ?', [req.user.id])
  const user = rows[0]

  const valid = await comparePassword(currentPassword, user.password_hash)
  if (!valid) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' })
  }

  const passwordHash = await hashPassword(newPassword)
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id])

  res.json({ success: true, message: 'Password changed successfully!' })
})

// POST /auth/logout
const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out.' })
})

// POST /auth/refresh-token
const refreshToken = asyncHandler(async (req, res) => {
  const token = signToken({ id: req.user.id, userType: req.user.userType, name: req.user.name })
  res.json({ success: true, token })
})

module.exports = { login, forgotPassword, resetPassword, changePassword, logout, refreshToken }
