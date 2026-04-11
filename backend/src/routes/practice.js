import { Router } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import Practice from '../models/Practice.js'
import Reflection from '../models/Reflection.js'
import StreakService from '../services/StreakService.js'
import XpService from '../services/XpService.js'
import XpSettings from '../models/XpSettings.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// All practice routes require authentication
router.use(requireAuth)

// Validation schemas
const createPracticeSchema = z.object({
  skillName: z.string().min(1).max(20).trim(),
  minutesPracticed: z.number().min(1).max(1440),
  tags: z.array(z.string().max(10).trim()).max(10).default([]),
  timerSeconds: z.number().min(0).default(0),
  date: z.string().datetime().optional(),
  notes: z.string().max(200).trim().optional(),
  confidence: z.number().int().min(1).max(5).optional().nullable(),
  blockers: z.string().max(200).trim().optional().default(''),
  nextStep: z.string().max(200).trim().optional().default('')
})

const updatePracticeSchema = createPracticeSchema.partial()

const querySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val) || 1),
  limit: z.string().optional().transform(val => Math.min(parseInt(val) || 20, 100)),
  skillName: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tags: z.string().optional() // comma-separated tags
})

// ============================================
// STATS ROUTES (must be before /:id routes!)
// ============================================

// GET /api/practice/stats/summary - Get practice statistics
router.get('/stats/summary', async (req, res) => {
  try {
    console.log('📊 Getting stats summary for user:', req.user.id)
    const userId = req.user.id
    
    // Get date ranges
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    
    const [
      totalSessions,
      totalMinutes,
      weeklyMinutes,
      monthlyMinutes,
      yearlyMinutes,
      topSkills,
      recentSessions
    ] = await Promise.all([
      Practice.countDocuments({ userId }),
      
      Practice.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$minutesPracticed' } } }
      ]).then(result => result[0]?.total || 0),
      
      Practice.aggregate([
        { $match: { userId, date: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$minutesPracticed' } } }
      ]).then(result => result[0]?.total || 0),
      
      Practice.aggregate([
        { $match: { userId, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$minutesPracticed' } } }
      ]).then(result => result[0]?.total || 0),
      
      Practice.aggregate([
        { $match: { userId, date: { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: '$minutesPracticed' } } }
      ]).then(result => result[0]?.total || 0),
      
      Practice.aggregate([
        { $match: { userId } },
        { $group: { 
          _id: '$skillName', 
          totalMinutes: { $sum: '$minutesPracticed' },
          sessionCount: { $sum: 1 }
        }},
        { $sort: { totalMinutes: -1 } },
        { $limit: 5 }
      ]),
      
      Practice.find({ userId })
        .sort({ date: -1 })
        .limit(5)
        .select('skillName minutesPracticed date tags')
        .lean()
    ])
    
    console.log('✅ Stats summary retrieved')
    
    res.json({
      summary: {
        totalSessions,
        totalMinutes,
        weeklyMinutes,
        monthlyMinutes,
        yearlyMinutes
      },
      topSkills: topSkills.map(skill => ({
        skillName: skill._id,
        totalMinutes: skill.totalMinutes,
        sessionCount: skill.sessionCount
      })),
      recentSessions
    })
  } catch (error) {
    console.error('❌ Error getting stats:', error.message)
    res.status(500).json({ message: error.message })
  }
})

// GET /api/practice/stats/weekly - Get weekly practice data for charts
router.get('/stats/weekly', async (req, res) => {
  try {
    console.log('📈 Getting weekly stats for user:', req.user.id)
    const userId = req.user.id
    
    // Get start of current week (Monday)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ...
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Days since Monday
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysFromMonday)
    weekStart.setHours(0, 0, 0, 0)
    
    // Get practices for current week
    const practices = await Practice.find({
      userId,
      date: { $gte: weekStart }
    }).lean()
    
    // Get reflections for current week
    const reflections = await Reflection.find({
      userId,
      createdAt: { $gte: weekStart }
    }).lean()
    
    // Initialize weekly data for 7 days
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const weeklyData = dayNames.map((day, index) => ({
      day,
      practice: 0, // hours
      reflections: 0,
      blockers: 0
    }))
    
    // Aggregate practice data by day
    practices.forEach(p => {
      const practiceDate = new Date(p.date)
      const dayIndex = practiceDate.getDay() === 0 ? 6 : practiceDate.getDay() - 1 // Convert to Mon=0, Sun=6
      if (dayIndex >= 0 && dayIndex < 7) {
        weeklyData[dayIndex].practice += (p.minutesPracticed || 0) / 60 // Convert to hours
        if (p.blockers && p.blockers.trim()) {
          weeklyData[dayIndex].blockers += 1
        }
      }
    })
    
    // Aggregate reflection data by day
    reflections.forEach(r => {
      const reflectionDate = new Date(r.createdAt)
      const dayIndex = reflectionDate.getDay() === 0 ? 6 : reflectionDate.getDay() - 1
      if (dayIndex >= 0 && dayIndex < 7) {
        weeklyData[dayIndex].reflections += 1
      }
    })
    
    // Round practice hours to 1 decimal place
    weeklyData.forEach(day => {
      day.practice = Math.round(day.practice * 10) / 10
    })
    
    console.log('✅ Weekly stats retrieved')
    res.json({ weeklyData })
  } catch (error) {
    console.error('❌ Error getting weekly stats:', error.message)
    res.status(500).json({ message: error.message })
  }
})

// ============================================
// CRUD ROUTES
// ============================================

// GET /api/practice - Get user's practice sessions
router.get('/', async (req, res) => {
  try {
    console.log('📋 Getting practices for user:', req.user.id)
    const { page, limit, skillName, startDate, endDate, tags } = querySchema.parse(req.query)
    
    const filter = { userId: req.user.id }
    
    if (skillName) {
      filter.skillName = { $regex: skillName, $options: 'i' }
    }
    
    if (startDate || endDate) {
      filter.date = {}
      if (startDate) filter.date.$gte = new Date(startDate)
      if (endDate) filter.date.$lte = new Date(endDate)
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim())
      filter.tags = { $in: tagArray }
    }
    
    const skip = (page - 1) * limit
    
    const [practices, total] = await Promise.all([
      Practice.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Practice.countDocuments(filter)
    ])
    
    const totalPages = Math.ceil(total / limit)
    
    console.log(`✅ Found ${practices.length} practices for user ${req.user.id}`)
    
    res.json({
      practices,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('❌ Error getting practices:', error.message)
    res.status(400).json({ message: error.message })
  }
})

// POST /api/practice - Create new practice session
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating practice for user:', req.user.id, 'data:', req.body)
    const data = createPracticeSchema.parse(req.body)
    
    const practiceDate = data.date ? new Date(data.date) : new Date()
    
    const practice = await Practice.create({
      ...data,
      userId: req.user.id,
      date: practiceDate
    })
    
    // Process streak for log practice session (no minimum duration)
    try {
      await StreakService.processSession(req.user.id, practiceDate)
    } catch (streakError) {
      console.error('⚠️ Error processing streak for practice:', streakError.message)
      // Don't fail the request if streak processing fails
    }
    
    // Award XP for practice time (XP per minute)
    let xpAwarded = null;
    try {
      const settings = await XpSettings.getSettings();
      const baseXp = Math.floor(data.minutesPracticed * settings.practiceXpPerMinute);
      
      if (baseXp > 0) {
        const xpTransaction = await XpService.awardXp(
          req.user.id, 
          'practice', 
          baseXp,
          { 
            practiceId: practice._id.toString(),
            minutesPracticed: data.minutesPracticed,
            skillName: data.skillName
          }
        );
        
        if (xpTransaction) {
          xpAwarded = {
            baseAmount: xpTransaction.baseAmount,
            multiplier: xpTransaction.multiplier,
            finalAmount: xpTransaction.finalAmount
          };
          console.log(`✅ Awarded ${xpTransaction.finalAmount} XP for ${data.minutesPracticed} minutes practice`);
        }
      }
    } catch (xpError) {
      console.error('⚠️ Error awarding XP for practice:', xpError.message)
      // Don't fail the request if XP award fails
    }
    
    console.log('✅ Practice created:', practice._id)
    res.status(201).json({ 
      ...practice.toObject(),
      xpAwarded 
    })
  } catch (error) {
    console.error('❌ Error creating practice:', error.message)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message })
    }
    res.status(400).json({ message: error.message })
  }
})

// GET /api/practice/:id - Get specific practice session
router.get('/:id', async (req, res) => {
  try {
    const practice = await Practice.findOne({
      _id: req.params.id,
      userId: req.user.id
    })
    
    if (!practice) {
      return res.status(404).json({ message: 'Practice session not found' })
    }
    
    res.json(practice)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// PUT /api/practice/:id - Update practice session
router.put('/:id', async (req, res) => {
  try {
    const data = updatePracticeSchema.parse(req.body)
    
    const practice = await Practice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { 
        ...data,
        ...(data.date && { date: new Date(data.date) })
      },
      { new: true, runValidators: true }
    )
    
    if (!practice) {
      return res.status(404).json({ message: 'Practice session not found' })
    }
    
    res.json(practice)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// DELETE /api/practice/:id - Delete practice session
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ Deleting practice:', req.params.id, 'for user:', req.user.id)
    const practice = await Practice.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    })
    
    if (!practice) {
      return res.status(404).json({ message: 'Practice session not found' })
    }
    
    console.log('✅ Practice deleted:', req.params.id)
    res.json({ message: 'Practice session deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting practice:', error.message)
    res.status(400).json({ message: error.message })
  }
})

export default router
