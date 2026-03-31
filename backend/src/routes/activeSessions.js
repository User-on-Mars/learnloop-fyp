import { Router } from 'express'
import { z } from 'zod'
import ActiveSession from '../models/ActiveSession.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// All active session routes require authentication
router.use(requireAuth)

// Validation schemas
const createActiveSessionSchema = z.object({
  skillName: z.string().min(1).max(100).trim(),
  tags: z.array(z.string().max(50).trim()).max(10).default([]),
  notes: z.string().max(1000).trim().optional(),
  timer: z.number().min(0).default(0),
  targetTime: z.number().min(0).default(0),
  isCountdown: z.boolean().default(true),
  isRunning: z.boolean().default(false),
  nodeId: z.string().trim().optional(),
  skillId: z.string().trim().optional()
})

const updateActiveSessionSchema = createActiveSessionSchema.partial()

// GET /api/active-sessions - Get all active sessions for user
router.get('/', async (req, res) => {
  try {
    console.log('📋 Getting active sessions for user:', req.user.id)
    
    const sessions = await ActiveSession.find({ userId: req.user.id })
      .sort({ startedAt: -1 })
      .lean()
    
    console.log(`✅ Found ${sessions.length} active sessions`)
    
    res.json({
      activeSessions: sessions
    })
  } catch (error) {
    console.error('❌ Error getting active sessions:', error.message)
    res.status(400).json({ message: error.message })
  }
})

// POST /api/active-sessions - Create or save active session
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating active session for user:', req.user.id, 'data:', req.body)
    const data = createActiveSessionSchema.parse(req.body)
    
    const session = await ActiveSession.create({
      ...data,
      userId: req.user.id,
      startedAt: new Date(),
      lastUpdated: new Date()
    })
    
    console.log('✅ Active session created:', session._id)
    res.status(201).json(session)
  } catch (error) {
    console.error('❌ Error creating active session:', error.message)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message })
    }
    res.status(400).json({ message: error.message })
  }
})

// PUT /api/active-sessions/:id - Update active session
router.put('/:id', async (req, res) => {
  try {
    console.log('✏️ Updating active session:', req.params.id)
    const data = updateActiveSessionSchema.parse(req.body)
    
    const session = await ActiveSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { 
        ...data,
        lastUpdated: new Date()
      },
      { new: true, runValidators: true }
    )
    
    if (!session) {
      return res.status(404).json({ message: 'Active session not found' })
    }
    
    console.log('✅ Active session updated:', req.params.id)
    res.json(session)
  } catch (error) {
    console.error('❌ Error updating active session:', error.message)
    res.status(400).json({ message: error.message })
  }
})

// DELETE /api/active-sessions/:id - Delete active session
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ Deleting active session:', req.params.id)
    const session = await ActiveSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    })
    
    if (!session) {
      return res.status(404).json({ message: 'Active session not found' })
    }
    
    console.log('✅ Active session deleted:', req.params.id)
    res.json({ message: 'Active session deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting active session:', error.message)
    res.status(400).json({ message: error.message })
  }
})

// DELETE /api/active-sessions - Delete all active sessions for user
router.delete('/', async (req, res) => {
  try {
    console.log('🗑️ Deleting all active sessions for user:', req.user.id)
    const result = await ActiveSession.deleteMany({ userId: req.user.id })
    
    console.log('✅ Deleted', result.deletedCount, 'active sessions')
    res.json({ message: `Deleted ${result.deletedCount} active sessions` })
  } catch (error) {
    console.error('❌ Error deleting active sessions:', error.message)
    res.status(400).json({ message: error.message })
  }
})

export default router
