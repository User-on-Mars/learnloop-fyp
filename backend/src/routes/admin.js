import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/adminAuth.js'
import AdminService from '../services/AdminService.js'
import FlagService from '../services/FlagService.js'
import AdminAuditLog from '../models/AdminAuditLog.js'
import AdminFlag from '../models/AdminFlag.js'
import User from '../models/User.js'
import Practice from '../models/Practice.js'
import Reflection from '../models/Reflection.js'

const router = Router()

// ─── Dashboard Stats (requires admin role) ───────────────
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await AdminService.getDashboardStats()
    res.json(stats)
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ message: 'Failed to fetch stats' })
  }
})

// All other admin routes require auth + admin role
router.use(requireAuth, requireAdmin)

// ─── Users List ────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
    const search = req.query.search || ''
    const status = req.query.status || ''
    const role = req.query.role || ''

    const filter = {}
    if (search) filter.search = search
    if (status) filter.status = status
    if (role) filter.role = role

    const result = await AdminService.getUsers(page, limit, filter)
    res.json(result)
  } catch (error) {
    console.error('Admin users error:', error)
    res.status(500).json({ message: 'Failed to fetch users' })
  }
})

// ─── Single User Detail ────────────────────────────────────────
router.get('/users/:userId', async (req, res) => {
  try {
    const result = await AdminService.getUserDetail(req.params.userId)
    res.json(result)
  } catch (error) {
    console.error('Admin user detail error:', error)
    res.status(error.message === 'User not found' ? 404 : 500).json({ message: error.message })
  }
})

// ─── Ban User ──────────────────────────────────────────────────
router.post('/users/:userId/ban', async (req, res) => {
  try {
    const { reason } = req.body
    const adminId = req.user.id
    const adminEmail = req.user.email

    const user = await AdminService.banUser(req.params.userId, reason, adminId, adminEmail)
    res.json({ message: 'User banned', user })
  } catch (error) {
    console.error('Ban user error:', error)
    res.status(error.message.includes('at least 10') ? 400 : 500).json({ message: error.message })
  }
})

// ─── Unban User ────────────────────────────────────────────────
router.post('/users/:userId/unban', async (req, res) => {
  try {
    const adminId = req.user.id
    const adminEmail = req.user.email

    const user = await AdminService.unbanUser(req.params.userId, adminId, adminEmail)
    res.json({ message: 'User unbanned', user })
  } catch (error) {
    console.error('Unban user error:', error)
    res.status(500).json({ message: error.message })
  }
})

// ─── Promote to Admin ──────────────────────────────────────────
router.post('/users/:userId/promote', async (req, res) => {
  try {
    const adminId = req.user.id
    const adminEmail = req.user.email

    const user = await AdminService.promoteToAdmin(req.params.userId, adminId, adminEmail)
    res.json({ message: 'User promoted to admin', user })
  } catch (error) {
    console.error('Promote user error:', error)
    res.status(500).json({ message: error.message })
  }
})

// ─── Demote from Admin ─────────────────────────────────────────
router.post('/users/:userId/demote', async (req, res) => {
  try {
    const adminId = req.user.id
    const adminEmail = req.user.email

    const user = await AdminService.demoteFromAdmin(req.params.userId, adminId, adminEmail)
    res.json({ message: 'User demoted from admin', user })
  } catch (error) {
    console.error('Demote user error:', error)
    res.status(error.message === 'Cannot demote yourself' ? 400 : 500).json({ message: error.message })
  }
})

// ─── Adjust XP ────────────────────────────────────────────────
router.post('/users/:userId/adjust-xp', async (req, res) => {
  try {
    const { amount, reason } = req.body
    const adminId = req.user.id
    const adminEmail = req.user.email

    const result = await AdminService.adjustXp(req.params.userId, amount, reason, adminId, adminEmail)
    res.json({ message: 'XP adjusted', ...result })
  } catch (error) {
    console.error('Adjust XP error:', error)
    res.status(error.message.includes('at least 10') ? 400 : 500).json({ message: error.message })
  }
})

// ─── Recent Activity ───────────────────────────────────────────
router.get('/activity', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))

    const result = await AdminService.getActivityStats(page, limit)
    res.json(result)
  } catch (error) {
    console.error('Admin activity error:', error)
    res.status(500).json({ message: 'Failed to fetch activity' })
  }
})

// ─── XP Leaderboard ───────────────────────────────────────────
router.get('/xp-leaderboard', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
    const leaderboard = await AdminService.getXpLeaderboard(limit)
    res.json({ leaderboard })
  } catch (error) {
    console.error('XP leaderboard error:', error)
    res.status(500).json({ message: 'Failed to fetch leaderboard' })
  }
})

// ─── Skill Map Stats ───────────────────────────────────────────
router.get('/skill-maps/stats', async (req, res) => {
  try {
    const stats = await AdminService.getSkillMapStats()
    res.json(stats)
  } catch (error) {
    console.error('Skill map stats error:', error)
    res.status(500).json({ message: 'Failed to fetch skill map stats' })
  }
})

// ─── Skill Maps List ───────────────────────────────────────────
router.get('/skill-maps', async (req, res) => {
  try {
    const skillMaps = await AdminService.getSkillMaps()
    res.json({ skillMaps })
  } catch (error) {
    console.error('Skill maps error:', error)
    res.status(500).json({ message: 'Failed to fetch skill maps' })
  }
})

// ─── Recent Reflections ────────────────────────────────────────
router.get('/reflections', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
    const reflections = await AdminService.getRecentReflections(limit)
    res.json({ reflections })
  } catch (error) {
    console.error('Recent reflections error:', error)
    res.status(500).json({ message: 'Failed to fetch reflections' })
  }
})

// ─── Audit Log ─────────────────────────────────────────────────
router.get('/audit-log', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
    const action = req.query.action || ''
    const adminId = req.query.adminId || ''
    const targetUserId = req.query.targetUserId || ''

    const filter = {}
    if (action) filter.action = action
    if (adminId) filter.adminId = adminId
    if (targetUserId) filter.targetUserId = targetUserId

    const result = await AdminService.getAuditLog(page, limit, filter)
    res.json(result)
  } catch (error) {
    console.error('Audit log error:', error)
    res.status(500).json({ message: 'Failed to fetch audit log' })
  }
})

// ─── Alerts / Flags ────────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))

    const result = await FlagService.getOpenFlags(page, limit)
    res.json(result)
  } catch (error) {
    console.error('Alerts error:', error)
    res.status(500).json({ message: 'Failed to fetch alerts' })
  }
})

// ─── Dismiss Alert ─────────────────────────────────────────────
router.post('/alerts/:flagId/dismiss', async (req, res) => {
  try {
    const adminId = req.user.id
    const flag = await FlagService.dismissFlag(req.params.flagId, adminId)
    res.json({ message: 'Alert dismissed', flag })
  } catch (error) {
    console.error('Dismiss alert error:', error)
    res.status(500).json({ message: 'Failed to dismiss alert' })
  }
})

// ─── Mark Alert as Actioned ───────────────────────────────────
router.post('/alerts/:flagId/action', async (req, res) => {
  try {
    const adminId = req.user.id
    const flag = await FlagService.markActioned(req.params.flagId, adminId)
    res.json({ message: 'Alert marked as actioned', flag })
  } catch (error) {
    console.error('Action alert error:', error)
    res.status(500).json({ message: 'Failed to action alert' })
  }
})

// ─── Manual Weekly Reset ───────────────────────────────────────
router.post('/manual-reset', async (req, res) => {
  try {
    const { confirmation } = req.body
    if (confirmation !== 'RESET') {
      return res.status(400).json({ message: 'Invalid confirmation. Type "RESET" to confirm.' })
    }

    const adminId = req.user.id
    const adminEmail = req.user.email

    const result = await AdminService.triggerManualReset(adminId, adminEmail)
    res.json(result)
  } catch (error) {
    console.error('Manual reset error:', error)
    res.status(500).json({ message: error.message || 'Failed to trigger reset' })
  }
})

// ─── Recalculate All XP ───────────────────────────────────────
router.post('/recalculate-xp', async (req, res) => {
  try {
    const adminId = req.user.id
    const adminEmail = req.user.email

    const result = await AdminService.recalculateAllXp(adminId, adminEmail)
    res.json(result)
  } catch (error) {
    console.error('Recalculate XP error:', error)
    res.status(500).json({ message: 'Failed to recalculate XP' })
  }
})

// ─── Export User Data (CSV) ───────────────────────────────────
router.post('/export-users', async (req, res) => {
  try {
    const adminId = req.user.id
    const adminEmail = req.user.email

    const result = await AdminService.exportUserDataCsv(adminId, adminEmail)
    
    // Log audit
    await AdminAuditLog.record(
      adminId,
      adminEmail,
      'export_data',
      null,
      null,
      'Exported all user data to CSV'
    )

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=learnloop-users-export.csv')
    res.send(result)
  } catch (error) {
    console.error('Export users error:', error)
    res.status(500).json({ message: 'Failed to export user data' })
  }
})

// ─── Delete Content (practice or reflection) ──────────────────
router.delete('/content/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params
    const adminId = req.user.id
    const adminEmail = req.user.email

    if (type === 'practice') {
      await Practice.findByIdAndDelete(id)
    } else if (type === 'reflection') {
      await Reflection.findByIdAndDelete(id)
    } else {
      return res.status(400).json({ message: 'Invalid content type' })
    }

    // Log audit
    await AdminAuditLog.record(
      adminId,
      adminEmail,
      type === 'practice' ? 'delete_practice' : 'delete_reflection',
      null,
      null,
      `Deleted ${type} ${id}`
    )

    res.json({ message: `${type} deleted` })
  } catch (error) {
    console.error('Delete content error:', error)
    res.status(500).json({ message: 'Failed to delete content' })
  }
})

// ─── Delete Skill Map ──────────────────────────────────────────
router.delete('/skill-maps/:skillMapId', async (req, res) => {
  try {
    const { skillMapId } = req.params
    const adminId = req.user.id
    const adminEmail = req.user.email

    const result = await AdminService.deleteSkillMap(skillMapId, adminId, adminEmail)
    res.json(result)
  } catch (error) {
    console.error('Delete skill map error:', error)
    res.status(error.message.includes('not found') || error.message.includes('Cannot delete') ? 400 : 500).json({ message: error.message })
  }
})

export default router
