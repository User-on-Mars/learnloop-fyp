import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'
import LeaderboardService from '../services/LeaderboardService.js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { validateEmail } from '../utils/emailValidator.js'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
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
  if (!user) return res.json({ ok: true }) // do not reveal existence
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' })
  const link = `${process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173'}/reset?token=${token}`

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
    text: `Click to reset: ${link}`,
    html: `<p>Click to reset: <a href="${link}">${link}</a></p>`
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
    const { email, displayName, firebaseUid } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })
    
    // Validate email domain
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return res.status(400).json({ message: emailValidation.message })
    }
    
    const name = displayName || email.split('@')[0]
    
    console.log(`🔄 Syncing profile for ${email} with name: ${name}`)
    
    // Find user by email (NOT by firebaseUid, since auth middleware already created it)
    let user = await User.findOne({ email })
    if (!user) {
      console.log(`📝 Creating new user: ${email}`)
      // Only create user if they've verified their email (Firebase handles this)
      user = await User.create({
        name,
        email,
        firebaseUid: firebaseUid || email,  // Use provided firebaseUid or fallback to email
        passwordHash: 'firebase-auth-user',
        role: 'user',
        accountStatus: 'active',
        emailVerified: true,  // Firebase users are verified through Firebase
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

export default router
