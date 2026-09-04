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
    'SELECT * FROM users WHERE identifier = $1 AND user_type = $2',
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

  const { rows } = await query('SELECT id FROM users WHERE identifier = $1 OR email = $1', [email.trim()])
  const user = rows[0]

  // Always respond success (don't reveal whether an email exists), but only
  // actually create a token + "send" an email when the user is real.
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    )
    const resetLink = `${process.env.FRONTEND_ORIGIN}/reset-password?token=${token}`
    try {
      await sendPasswordResetEmail(user.email || email, user.name || 'User', resetLink)
    } catch (mailErr) {
      console.error('Email send failed:', mailErr.message)
      // Still respond success so we don't leak user existence
    }
  }

  res.json({ success: true, message: 'Password reset link sent to your email!' })
})

// POST /auth/reset-password   body: { token, password }
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token and new password are required' })
  }

  const { rows } = await query(
    'SELECT * FROM password_resets WHERE token = $1 AND used = false AND expires_at > now()',
    [token]
  )
  const reset = rows[0]
  if (!reset) {
    return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' })
  }

  const passwordHash = await hashPassword(password)
  await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, reset.user_id])
  await query('UPDATE password_resets SET used = true WHERE id = $1', [reset.id])

  res.json({ success: true, message: 'Password reset successfully!' })
})

// POST /auth/change-password   (authenticated)   body: { currentPassword, newPassword }
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Please fill in all fields' })
  }

  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id])
  const user = rows[0]

  const valid = await comparePassword(currentPassword, user.password_hash)
  if (!valid) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' })
  }

  const passwordHash = await hashPassword(newPassword)
  await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, user.id])

  res.json({ success: true, message: 'Password changed successfully!' })
})

// POST /auth/logout — stateless JWT, nothing to invalidate server-side unless you add a token blocklist
const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out.' })
})

// POST /auth/refresh-token — issues a new token for an already-valid session
const refreshToken = asyncHandler(async (req, res) => {
  const token = signToken({ id: req.user.id, userType: req.user.userType, name: req.user.name })
  res.json({ success: true, token })
})

module.exports = { login, forgotPassword, resetPassword, changePassword, logout, refreshToken }
