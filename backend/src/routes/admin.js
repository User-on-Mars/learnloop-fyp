import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/adminAuth.js'
import User from '../models/User.js'
import Skill from '../models/Skill.js'
import Node from '../models/Node.js'
import Practice from '../models/Practice.js'
import Reflection from '../models/Reflection.js'
import LearningSession from '../models/LearningSession.js'
import ActiveSession from '../models/ActiveSession.js'

const router = Router()

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin)

// ─── Dashboard Stats ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(todayStart)
    monthStart.setDate(weekStart.getDate() - 30)

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      totalSkillMaps,
      totalPractices,
      totalReflections,
      activeSessions,
      practiceToday,
      practiceWeek
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: weekStart } }),
      User.countDocuments({ accountStatus: 'active' }),
      User.countDocuments({ accountStatus: 'suspended' }),
      User.countDocuments({ accountStatus: 'banned' }),
      Skill.countDocuments(),
      Practice.countDocuments(),
      Reflection.countDocuments(),
      ActiveSession.countDocuments(),
      Practice.countDocuments({ createdAt: { $gte: todayStart } }),
      Practice.countDocuments({ createdAt: { $gte: weekStart } })
    ])

    // Practice hours
    const practiceHoursResult = await Practice.aggregate([
      { $group: { _id: null, totalMinutes: { $sum: '$minutesPracticed' } } }
    ])
    const totalPracticeHours = Math.round((practiceHoursResult[0]?.totalMinutes || 0) / 60)

    res.json({
      users: { total: totalUsers, newToday: newUsersToday, newWeek: newUsersWeek, active: activeUsers, suspended: suspendedUsers, banned: bannedUsers },
      content: { skillMaps: totalSkillMaps, practices: totalPractices, reflections: totalReflections, practiceHours: totalPracticeHours },
      activity: { activeSessions, practiceToday, practiceWeek }
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ message: 'Failed to fetch stats' })
  }
})

// ─── User Growth Chart Data ────────────────────────────────────
router.get('/stats/user-growth', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    res.json(growth)
  } catch (error) {
    console.error('User growth error:', error)
    res.status(500).json({ message: 'Failed to fetch user growth' })
  }
})

// ─── Users List ────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
    const search = req.query.search || ''
    const status = req.query.status || ''
    const role = req.query.role || ''
    const sort = req.query.sort || '-createdAt'

    const filter = {}
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    if (status) filter.accountStatus = status
    if (role) filter.role = role

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ])

    // Enrich with activity counts — use firebaseUid since content models store Firebase UIDs
    const enriched = await Promise.all(users.map(async (user) => {
      const uid = user.firebaseUid || user._id.toString()
      const [skillCount, practiceCount, reflectionCount] = await Promise.all([
        Skill.countDocuments({ userId: uid }),
        Practice.countDocuments({ userId: uid }),
        Reflection.countDocuments({ userId: uid })
      ])
      return { ...user, skillCount, practiceCount, reflectionCount }
    }))

    res.json({ users: enriched, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin users error:', error)
    res.status(500).json({ message: 'Failed to fetch users' })
  }
})

// ─── Single User Detail ────────────────────────────────────────
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-passwordHash').lean()
    if (!user) return res.status(404).json({ message: 'User not found' })

    const uid = user.firebaseUid || user._id.toString()
    const [skills, practices, reflections, sessions] = await Promise.all([
      Skill.find({ userId: uid }).lean(),
      Practice.find({ userId: uid }).sort('-date').limit(20).lean(),
      Reflection.find({ userId: uid }).sort('-createdAt').limit(20).lean(),
      LearningSession.find({ userId: uid }).sort('-createdAt').limit(20).lean()
    ])

    res.json({ user, skills, practices, reflections, sessions })
  } catch (error) {
    console.error('Admin user detail error:', error)
    res.status(500).json({ message: 'Failed to fetch user detail' })
  }
})

// ─── Suspend User ──────────────────────────────────────────────
router.post('/users/:userId/suspend', async (req, res) => {
  try {
    const { reason } = req.body
    const user = await User.findById(req.params.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot suspend an admin' })
    if (user.accountStatus === 'suspended') return res.status(400).json({ message: 'User is already suspended' })

    user.accountStatus = 'suspended'
    user.suspendedAt = new Date()
    user.statusReason = reason || 'Suspended by admin'
    await user.save()

    console.log(`⚠️ Admin suspended user ${user.email} - Reason: ${user.statusReason}`)
    res.json({ message: 'User suspended', user: { _id: user._id, email: user.email, accountStatus: user.accountStatus } })
  } catch (error) {
    console.error('Suspend user error:', error)
    res.status(500).json({ message: 'Failed to suspend user' })
  }
})

// ─── Ban User ──────────────────────────────────────────────────
router.post('/users/:userId/ban', async (req, res) => {
  try {
    const { reason } = req.body
    const user = await User.findById(req.params.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot ban an admin' })
    if (user.accountStatus === 'banned') return res.status(400).json({ message: 'User is already banned' })

    user.accountStatus = 'banned'
    user.bannedAt = new Date()
    user.statusReason = reason || 'Banned by admin'
    await user.save()

    console.log(`🚫 Admin banned user ${user.email} - Reason: ${user.statusReason}`)
    res.json({ message: 'User banned', user: { _id: user._id, email: user.email, accountStatus: user.accountStatus } })
  } catch (error) {
    console.error('Ban user error:', error)
    res.status(500).json({ message: 'Failed to ban user' })
  }
})

// ─── Unban / Unsuspend (Reactivate) ───────────────────────────
router.post('/users/:userId/reactivate', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (user.accountStatus === 'active') return res.status(400).json({ message: 'User is already active' })

    user.accountStatus = 'active'
    user.suspendedAt = null
    user.bannedAt = null
    user.statusReason = ''
    await user.save()

    console.log(`✅ Admin reactivated user ${user.email}`)
    res.json({ message: 'User reactivated', user: { _id: user._id, email: user.email, accountStatus: user.accountStatus } })
  } catch (error) {
    console.error('Reactivate user error:', error)
    res.status(500).json({ message: 'Failed to reactivate user' })
  }
})

// ─── Change User Role ──────────────────────────────────────────
router.post('/users/:userId/role', async (req, res) => {
  try {
    const { role } = req.body
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' })

    const user = await User.findById(req.params.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.role = role
    await user.save()

    console.log(`🔑 Admin changed role of ${user.email} to ${role}`)
    res.json({ message: `Role updated to ${role}`, user: { _id: user._id, email: user.email, role: user.role } })
  } catch (error) {
    console.error('Change role error:', error)
    res.status(500).json({ message: 'Failed to change role' })
  }
})

// ─── Recent Activity (all users) ──────────────────────────────
router.get('/activity', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
    const skip = (page - 1) * limit

    const [practices, reflections, totalPractices, totalReflections] = await Promise.all([
      Practice.find().sort('-createdAt').skip(0).limit(200).lean(),
      Reflection.find().sort('-createdAt').skip(0).limit(200).lean(),
      Practice.countDocuments(),
      Reflection.countDocuments()
    ])

    // Merge and sort by date
    const allActivity = [
      ...practices.map(p => ({ type: 'practice', ...p, sortDate: p.createdAt })),
      ...reflections.map(r => ({ type: 'reflection', ...r, sortDate: r.createdAt }))
    ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate))

    const total = allActivity.length
    const paged = allActivity.slice(skip, skip + limit)

    // Resolve user names from firebaseUid
    const userIds = [...new Set(paged.map(a => a.userId))]
    const users = await User.find({ firebaseUid: { $in: userIds } }).select('firebaseUid name email').lean()
    const userMap = {}
    for (const u of users) {
      userMap[u.firebaseUid] = { name: u.name, email: u.email }
    }

    const enriched = paged.map(a => ({
      ...a,
      userName: userMap[a.userId]?.name || 'Unknown',
      userEmail: userMap[a.userId]?.email || a.userId
    }))

    res.json({ activity: enriched, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin activity error:', error)
    res.status(500).json({ message: 'Failed to fetch activity' })
  }
})

// ─── Delete Content (practice or reflection) ──────────────────
router.delete('/content/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params
    if (type === 'practice') {
      await Practice.findByIdAndDelete(id)
    } else if (type === 'reflection') {
      await Reflection.findByIdAndDelete(id)
    } else {
      return res.status(400).json({ message: 'Invalid content type' })
    }
    res.json({ message: `${type} deleted` })
  } catch (error) {
    console.error('Delete content error:', error)
    res.status(500).json({ message: 'Failed to delete content' })
  }
})

export default router
