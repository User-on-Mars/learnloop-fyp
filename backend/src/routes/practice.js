import { Router } from 'express'
import { z } from 'zod'
import Practice from '../models/Practice.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// All practice routes require authentication
router.use(requireAuth)

// Validation schemas
const createPracticeSchema = z.object({
  skillName: z.string().min(1).max(100).trim(),
  minutesPracticed: z.number().min(1).max(1440),
  tags: z.array(z.string().max(50).trim()).max(10).default([]),
  timerSeconds: z.number().min(0).default(0),
  date: z.string().datetime().optional(),
  notes: z.string().max(1000).trim().optional()
})

const updatePracticeSchema = createPracticeSchema.partial()

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  skillName: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tags: z.string().optional() // comma-separated tags
})

// GET /api/practice - Get user's practice sessions
router.get('/', async (req, res) => {
  try {
    const { page, limit, skillName, startDate, endDate, tags } = querySchema.parse(req.query)
    
    const filter = { userId: req.user.id }
    
    // Add optional filters
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
    res.status(400).json({ message: error.message })
  }
})

// POST /api/practice - Create new practice session
router.post('/', async (req, res) => {
  try {
    const data = createPracticeSchema.parse(req.body)
    
    const practice = await Practice.create({
      ...data,
      userId: req.user.id,
      date: data.date ? new Date(data.date) : new Date()
    })
    
    res.status(201).json(practice)
  } catch (error) {
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
    const practice = await Practice.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    })
    
    if (!practice) {
      return res.status(404).json({ message: 'Practice session not found' })
    }
    
    res.json({ message: 'Practice session deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// GET /api/practice/stats/summary - Get practice statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user.id
    
    // Get date ranges
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
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
      // Total sessions
      Practice.countDocuments({ userId }),
      
      // Total minutes
      Practice.aggregate([
        { $match: { userId: req.user.id } },
        { $group: { _id: null, total: { $sum: '$minutesPracticed' } } }
      ]).then(result => result[0]?.total || 0),
      
      // Weekly minutes
      Practice.aggregate([
        { $match: { userId: req.user.id, date: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$minutesPracticed' } } }
      ]).then(result => result[0]?.total || 0),
      
      // Monthly minutes
      Practice.aggregate([
        { $match: { userId: req.user.id, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$minutesPracticed' } } }
      ]).then(result => result[0]?.total || 0),
      
      // Yearly minutes
      Practice.aggregate([
        { $match: { userId: req.user.id, date: { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: '$minutesPracticed' } } }
      ]).then(result => result[0]?.total || 0),
      
      // Top skills by practice time
      Practice.aggregate([
        { $match: { userId: req.user.id } },
        { $group: { 
          _id: '$skillName', 
          totalMinutes: { $sum: '$minutesPracticed' },
          sessionCount: { $sum: 1 }
        }},
        { $sort: { totalMinutes: -1 } },
        { $limit: 5 }
      ]),
      
      // Recent sessions
      Practice.find({ userId })
        .sort({ date: -1 })
        .limit(5)
        .select('skillName minutesPracticed date tags')
        .lean()
    ])
    
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
    res.status(500).json({ message: error.message })
  }
})

// GET /api/practice/stats/weekly - Get weekly practice data for charts
router.get('/stats/weekly', async (req, res) => {
  try {
    const userId = req.user.id
    const weeksBack = parseInt(req.query.weeks) || 12
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (weeksBack * 7))
    
    const weeklyData = await Practice.aggregate([
      { $match: { userId: req.user.id, date: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            week: { $week: '$date' }
          },
          totalMinutes: { $sum: '$minutesPracticed' },
          sessionCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ])
    
    res.json({ weeklyData })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router