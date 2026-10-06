const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

/**
 * Send a password reset email with a 6-digit OTP to a user.
 * @param {string} toEmail - Recipient's email address
 * @param {string} name    - Recipient's name (for personalisation)
 * @param {string} otp     - 6-digit OTP string
 */
const sendPasswordResetEmail = async (toEmail, name, otp) => {
  const mailOptions = {
    from: `"MNNIT Mental Health & Wellbeing" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Password Reset OTP — MNNIT MHWB Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #5b3ba6; margin: 0;">🧠 MNNIT Mental Health & Wellbeing</h2>
          <p style="color: #666; margin: 4px 0 0;">Password Reset Request</p>
        </div>

        <p style="color: #333;">Dear <strong>${name}</strong>,</p>
        <p style="color: #333;">We received a request to reset your password for the MNNIT MHWB Portal. Please use the following 6-digit OTP to reset your password:</p>

        <div style="text-align: center; margin: 32px 0;">
          <span style="
            background-color: #f4f4f4;
            color: #333;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-size: 24px;
            letter-spacing: 4px;
            font-weight: bold;
            display: inline-block;
          ">${otp}</span>
        </div>

        <p style="color: #666; font-size: 0.9rem;">This OTP will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 0.8rem; text-align: center;">
          MNNIT Allahabad — Mental Health & Wellbeing Portal<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
}

module.exports = { sendPasswordResetEmail }
