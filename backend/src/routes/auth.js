import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'
import LeaderboardService from '../services/LeaderboardService.js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { validateEmail } from '../utils/emailValidator.js'
import { requireAuth } from '../middleware/auth.js'
import admin from '../config/firebase.js'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body)

    // Validate email domain
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return res.status(400).json({ message: emailValidation.message })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      // Check if user is banned
      if (existing.accountStatus === 'banned') {
        return res.status(403).json({
          message: 'This account has been banned and cannot be used.',
          accountStatus: 'banned'
        })
      }
      // If user exists, update their name if provided
      if (name && !existing.name) {
        await User.updateOne({ email }, { name })
      }
      return res.status(409).json({ message: 'Email already registered' })
    }

    // Note: We don't create the user in our database yet
    // Firebase will handle account creation and email verification
    // User will be created in our DB only after email verification via sync-profile
    return res.status(201).json({
      message: 'Please verify your email to complete registration. Check your inbox for the verification link.'
    })
  } catch (e){
    return res.status(400).json({ message: e.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    // Check if user is banned before validating password
    if (user.accountStatus === 'banned') {
      return res.status(403).json({
        message: 'This account has been banned and cannot access the platform.',
        accountStatus: 'banned'
      })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

    // Update lastLoginAt
    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    return res.json({ token })
  } catch (e){
    return res.status(400).json({ message: e.message })
  }
})

// Very simple reset token using JWT for demo; in production use a separate token store
router.post('/forgot', async (req, res) => {
  const email = req.body.email
  const user = await User.findOne({ email })
  if (user?.accountStatus === 'banned' || user?.accountStatus === 'deleted') {
    return res.json({ ok: true }) // do not reveal account state
  }
  const clientUrl = (process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173').replace(/\/$/, '')
  let link = `${clientUrl}/forgot`

  try {
    const firebaseResetLink = await admin.auth().generatePasswordResetLink(email)
    const resetUrl = new URL(firebaseResetLink)
    const oobCode = resetUrl.searchParams.get('oobCode')
    if (!oobCode) throw new Error('Firebase reset link did not include an oobCode')
    link = `${clientUrl}/reset?oobCode=${encodeURIComponent(oobCode)}&email=${encodeURIComponent(email)}`
  } catch (error) {
    console.error('Failed to generate Firebase password reset link:', error.message)
    return res.json({ ok: true })
  }

  // Transport (dev-friendly: log to console if SMTP not set)
  if (!process.env.SMTP_HOST){
    console.log('[DEV] Password reset link:', link)
    return res.json({ ok: true, devLink: link })
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@learnloop.local',
    to: email,
    subject: 'Reset your password',
    text: `Reset your LearnLoop password using this link: ${link}`,
    html: `
      <div style="margin:0;padding:28px;background:#f4f7f2;font-family:Inter,Arial,sans-serif;color:#1c1f1a;">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e6dc;border-radius:16px;overflow:hidden;">
          <div style="background:#4f7942;color:#ffffff;padding:22px 26px;">
            <h1 style="margin:0;font-size:22px;line-height:1.25;">Reset your LearnLoop password</h1>
          </div>
          <div style="padding:26px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3d4a38;">We received a request to reset your password. This link expires soon, so use it when you're ready.</p>
            <a href="${link}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#2e5023;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:12px;">Reset password</a>
            <p style="margin:22px 0 8px;font-size:12px;line-height:1.5;color:#565c52;">If the button does not open, copy and paste this link into your browser:</p>
            <p style="word-break:break-all;margin:0;font-size:12px;line-height:1.5;"><a href="${link}" target="_blank" rel="noopener noreferrer" style="color:#2e5023;">${link}</a></p>
          </div>
        </div>
      </div>
    `
  })
  return res.json({ ok: true })
})

router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ message: 'Missing token or password' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const hash = await bcrypt.hash(password, 10)
    await User.findByIdAndUpdate(decoded.id, { passwordHash: hash })
    return res.json({ ok: true })
  } catch (e){
    return res.status(400).json({ message: 'Invalid or expired token' })
  }
})

// Sync Firebase user profile (display name, email) to backend
// Called after Firebase auth to ensure user record has correct display name
// This is where we create the user in our database AFTER email verification
router.post('/sync-profile', async (req, res) => {
  try {
    const { email, displayName, firebaseUid, emailVerified } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })

    // Validate email domain
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return res.status(400).json({ message: emailValidation.message })
    }

    const name = displayName || email.split('@')[0]

    console.log(`🔄 Syncing profile for ${email} with name: ${name}, emailVerified: ${emailVerified}`)

    // Find user by email (NOT by firebaseUid, since auth middleware already created it)
    let user = await User.findOne({ email })
    if (!user) {
      // Only create user if they've verified their email
      if (!emailVerified) {
        console.log(`❌ Cannot create user ${email} - email not verified`)
        return res.status(403).json({
          message: 'Please verify your email before accessing the platform. Check your inbox for the verification link.',
          emailVerified: false
        })
      }

      console.log(`📝 Creating new user: ${email}`)
      user = await User.create({
        name,
        email,
        firebaseUid: firebaseUid || email,  // Use provided firebaseUid or fallback to email
        passwordHash: 'firebase-auth-user',
        role: 'user',
        accountStatus: 'active',
        emailVerified: true,  // Only create if verified
        lastLoginAt: new Date()
      })
      console.log(`✅ User created: ${user._id} with firebaseUid: ${user.firebaseUid}`)
    } else {
      // Check if user is banned
      if (user.accountStatus === 'banned') {
        console.log(`🚫 Banned user attempted to sync profile: ${email}`)
        return res.status(403).json({
          message: 'This account has been banned and cannot access the platform.',
          accountStatus: 'banned'
        })
      }

      console.log(`👤 User exists: ${user._id}, current name: ${user.name}, current firebaseUid: ${user.firebaseUid}`)
      // Always update name if displayName is provided and different
      const updateData = { lastLoginAt: new Date() }
      if (displayName && user.name !== displayName) {
        console.log(`🔄 Updating name from "${user.name}" to "${displayName}"`)
        updateData.name = displayName
      }
      // Only update firebaseUid if it's not set and we have one
      if (!user.firebaseUid && firebaseUid) {
        console.log(`🔄 Setting firebaseUid to ${firebaseUid}`)
        updateData.firebaseUid = firebaseUid
      }
      // Ensure emailVerified is true for Firebase users
      if (!user.emailVerified) {
        updateData.emailVerified = true
      }
      if (Object.keys(updateData).length > 0) {
        await User.updateOne({ email }, updateData)
        user = { ...user, ...updateData }
      }
    }

    // Clear leaderboard cache so new name appears immediately
    await LeaderboardService.clearCache()
    console.log(`✅ Leaderboard cache cleared`)

    console.log(`✅ Profile sync complete for ${email}`)
    const freshUser = await User.findOne({ email })
    return res.json({ ok: true, user: { email: freshUser.email, name: freshUser.name, firebaseUid: freshUser.firebaseUid, avatar: freshUser.avatar } })
  } catch (e) {
    console.error(`❌ Profile sync failed: ${e.message}`)
    return res.status(400).json({ message: e.message })
  }
})

// Update user avatar
router.post('/update-avatar', async (req, res) => {
  try {
    const { email, avatar } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })
    if (!avatar && avatar !== null) return res.status(400).json({ message: 'Avatar is required' })

    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (user.accountStatus === 'banned') {
      return res.status(403).json({ message: 'This account has been banned.' })
    }

    await User.updateOne({ email }, { avatar })
    return res.json({ ok: true, avatar })
  } catch (e) {
    return res.status(400).json({ message: e.message })
  }
})

// Get user avatar by email
router.get('/avatar', async (req, res) => {
  try {
    const { email } = req.query
    if (!email) return res.status(400).json({ message: 'Email is required' })

    const user = await User.findOne({ email }).select('avatar')
    if (!user) return res.status(404).json({ message: 'User not found' })

    return res.json({ avatar: user.avatar })
  } catch (e) {
    return res.status(400).json({ message: e.message })
  }
})

// DELETE /api/auth/delete-account - Soft delete user account (keeps data for admin)
router.delete('/delete-account', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    // Find user by firebaseUid or email
    const user = await User.findOne({
      $or: [
        { firebaseUid: userId },
        { email: email }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.accountStatus === 'deleted') {
      return res.status(400).json({ message: 'Account already deleted' });
    }

    // Soft delete: mark as deleted, keep all data
    user.accountStatus = 'deleted';
    user.deletedAt = new Date();
    user.statusReason = 'User requested account deletion';
    await user.save();

    console.log(`🗑️ Account soft-deleted for user: ${email} (${userId})`);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

export default router
