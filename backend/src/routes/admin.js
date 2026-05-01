import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/adminAuth.js'
import AdminService from '../services/AdminService.js'
import FlagService from '../services/FlagService.js'
import NotificationService from '../services/NotificationService.js'
import AdminAuditLog from '../models/AdminAuditLog.js'
import AdminFlag from '../models/AdminFlag.js'
import User from '../models/User.js'
import Skill from '../models/Skill.js'
import Practice from '../models/Practice.js'
import Reflection from '../models/Reflection.js'
import XpSettings from '../models/XpSettings.js'
import SubscriptionService from '../services/SubscriptionService.js'
import Subscription from '../models/Subscription.js'
import WeeklyReward from '../models/WeeklyReward.js'

const router = Router()

// ─── Public XP Settings (no auth required for read) ───────────
router.get('/xp-settings', async (req, res) => {
  try {
    const settings = await XpSettings.getSettings()
    res.json(settings)
  } catch (error) {
    console.error('Get XP settings error:', error)
    res.status(500).json({ message: 'Failed to fetch XP settings' })
  }
})

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

// ─── Learning Health Metrics ──────────────────────────────
router.get('/learning-health', requireAuth, requireAdmin, async (req, res) => {
  try {
    const health = await AdminService.getLearningHealth()
    res.json(health)
  } catch (error) {
    console.error('Admin learning health error:', error)
    res.status(500).json({ message: 'Failed to fetch learning health' })
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

// ─── Send Nudge Email ──────────────────────────────────────────
const NUDGE_COOLDOWN_DAYS = 7

router.post('/users/:userId/nudge', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-passwordHash').lean()
    if (!user) return res.status(404).json({ message: 'User not found' })

    const uid = user.firebaseUid || user._id.toString()

    // Check cooldown — look for last nudge in audit log
    const cooldownDate = new Date(Date.now() - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
    const lastNudge = await AdminAuditLog.findOne({
      action: 'send_nudge',
      targetUserId: uid,
      createdAt: { $gte: cooldownDate }
    }).sort({ createdAt: -1 }).lean()

    if (lastNudge) {
      const daysLeft = Math.ceil((new Date(lastNudge.createdAt).getTime() + NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
      return res.status(429).json({
        message: `Nudge already sent. Try again in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
        lastNudgedAt: lastNudge.createdAt,
        cooldownDays: NUDGE_COOLDOWN_DAYS
      })
    }

    const [practiceCount, skillCount] = await Promise.all([
      Practice.countDocuments({ userId: uid }),
      Skill.countDocuments({ userId: uid })
    ])

    const daysInactive = user.lastLoginAt
      ? Math.floor((Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Send email in background — don't block the response
    NotificationService.sendNudgeEmail(user, { daysInactive, practiceCount, skillCount })
      .then(r => console.log(`📧 Nudge email result for ${user.email}:`, r.error || 'sent'))
      .catch(e => console.error(`📧 Nudge email failed for ${user.email}:`, e.message))

    // Log audit
    await AdminAuditLog.record(
      req.user.id,
      req.user.email,
      'send_nudge',
      uid,
      user.email,
      `Sent nudge email to inactive user (${daysInactive}d inactive)`
    )

    res.json({ message: 'Nudge sent', email: user.email })
  } catch (error) {
    console.error('Send nudge error:', error)
    res.status(500).json({ message: 'Failed to send nudge' })
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

// ─── Update XP Settings ────────────────────────────────────────
router.put('/xp-settings', async (req, res) => {
  try {
    const { reflectionXp, practiceXpPerMinute, streak5DayMultiplier, streak7DayMultiplier, bronzeThreshold, silverThreshold, goldThreshold, leaderboardSize, maxSessionsPerDay, minSessionDuration, maxDailyXp, contactEmail } = req.body
    const adminId = req.user.id
    const adminEmail = req.user.email

    // Validate inputs
    const updates = {}
    if (reflectionXp !== undefined) {
      const val = Number(reflectionXp)
      if (isNaN(val) || val < 0 || val > 1000) {
        return res.status(400).json({ message: 'reflectionXp must be between 0 and 1000' })
      }
      updates.reflectionXp = val
    }
    if (practiceXpPerMinute !== undefined) {
      const val = Number(practiceXpPerMinute)
      if (isNaN(val) || val < 0 || val > 100) {
        return res.status(400).json({ message: 'practiceXpPerMinute must be between 0 and 100' })
      }
      updates.practiceXpPerMinute = val
    }
    if (streak5DayMultiplier !== undefined) {
      const val = Number(streak5DayMultiplier)
      if (isNaN(val) || val < 1 || val > 10) {
        return res.status(400).json({ message: 'streak5DayMultiplier must be between 1 and 10' })
      }
      updates.streak5DayMultiplier = val
    }
    if (streak7DayMultiplier !== undefined) {
      const val = Number(streak7DayMultiplier)
      if (isNaN(val) || val < 1 || val > 10) {
        return res.status(400).json({ message: 'streak7DayMultiplier must be between 1 and 10' })
      }
      updates.streak7DayMultiplier = val
    }
    if (bronzeThreshold !== undefined) {
      const val = Number(bronzeThreshold)
      if (isNaN(val) || val < 0 || val > 10000) {
        return res.status(400).json({ message: 'bronzeThreshold must be between 0 and 10000' })
      }
      updates.bronzeThreshold = val
    }
    if (silverThreshold !== undefined) {
      const val = Number(silverThreshold)
      if (isNaN(val) || val < 0 || val > 10000) {
        return res.status(400).json({ message: 'silverThreshold must be between 0 and 10000' })
      }
      updates.silverThreshold = val
    }
    if (goldThreshold !== undefined) {
      const val = Number(goldThreshold)
      if (isNaN(val) || val < 0 || val > 10000) {
        return res.status(400).json({ message: 'goldThreshold must be between 0 and 10000' })
      }
      updates.goldThreshold = val
    }
    if (leaderboardSize !== undefined) {
      const val = Number(leaderboardSize)
      if (isNaN(val) || val < 1 || val > 100) {
        return res.status(400).json({ message: 'leaderboardSize must be between 1 and 100' })
      }
      updates.leaderboardSize = val
    }
    if (maxSessionsPerDay !== undefined) {
      const val = Number(maxSessionsPerDay)
      if (isNaN(val) || val < 1 || val > 1000) {
        return res.status(400).json({ message: 'maxSessionsPerDay must be between 1 and 1000' })
      }
      updates.maxSessionsPerDay = val
    }
    if (minSessionDuration !== undefined) {
      const val = Number(minSessionDuration)
      if (isNaN(val) || val < 1 || val > 3600) {
        return res.status(400).json({ message: 'minSessionDuration must be between 1 and 3600' })
      }
      updates.minSessionDuration = val
    }
    if (maxDailyXp !== undefined) {
      const val = Number(maxDailyXp)
      if (isNaN(val) || val < 1 || val > 100000) {
        return res.status(400).json({ message: 'maxDailyXp must be between 1 and 100000' })
      }
      updates.maxDailyXp = val
    }
    if (contactEmail !== undefined) {
      const val = String(contactEmail).trim()
      if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        return res.status(400).json({ message: 'contactEmail must be a valid email address' })
      }
      updates.contactEmail = val
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid updates provided' })
    }

    // Validate threshold ordering if multiple thresholds are being updated
    const currentSettings = await XpSettings.getSettings()
    const finalBronze = updates.bronzeThreshold ?? currentSettings.bronzeThreshold
    const finalSilver = updates.silverThreshold ?? currentSettings.silverThreshold
    const finalGold = updates.goldThreshold ?? currentSettings.goldThreshold

    if (finalBronze >= finalSilver || finalSilver >= finalGold) {
      return res.status(400).json({ message: 'Thresholds must be in ascending order: Bronze < Silver < Gold' })
    }

    const settings = await XpSettings.updateSettings(updates)

    // Log audit
    await AdminAuditLog.record(
      adminId,
      adminEmail,
      'update_xp_settings',
      null,
      null,
      `Updated XP settings: ${JSON.stringify(updates)}`
    )

    res.json({ message: 'XP settings updated', settings })
  } catch (error) {
    console.error('Update XP settings error:', error)
    res.status(500).json({ message: 'Failed to update XP settings' })
  }
})

// ─── Subscription Management (Admin) ─────────────────────

// GET /api/admin/subscription/:userId - Get user's subscription info
router.get('/subscription/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const info = await SubscriptionService.getSubscriptionInfo(req.params.userId);
    res.json(info);
  } catch (error) {
    console.error('Admin get subscription error:', error);
    res.status(500).json({ message: 'Failed to get subscription info' });
  }
});

// POST /api/admin/subscription/:userId/upgrade - Upgrade user to pro
router.post('/subscription/:userId/upgrade', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { periodEnd } = req.body;
    await SubscriptionService.upgradeToPro(req.params.userId, {
      periodEnd: periodEnd ? new Date(periodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    const info = await SubscriptionService.getSubscriptionInfo(req.params.userId);

    // Audit log
    await AdminAuditLog.record(
      req.user.id,
      req.user.email,
      'subscription_upgrade',
      req.params.userId,
      null,
      `Upgraded to Pro until ${info.currentPeriodEnd}`
    );

    res.json({ message: 'User upgraded to Pro', ...info });
  } catch (error) {
    console.error('Admin upgrade subscription error:', error);
    res.status(500).json({ message: 'Failed to upgrade subscription' });
  }
});

// POST /api/admin/subscription/:userId/downgrade - Downgrade user to free
router.post('/subscription/:userId/downgrade', requireAuth, requireAdmin, async (req, res) => {
  try {
    await SubscriptionService.downgradeToFree(req.params.userId);
    const info = await SubscriptionService.getSubscriptionInfo(req.params.userId);

    await AdminAuditLog.record(
      req.user.id,
      req.user.email,
      'subscription_downgrade',
      req.params.userId,
      null,
      'Downgraded to Free'
    );

    res.json({ message: 'User downgraded to Free', ...info });
  } catch (error) {
    console.error('Admin downgrade subscription error:', error);
    res.status(500).json({ message: 'Failed to downgrade subscription' });
  }
});

// POST /api/admin/subscription/:userId/cancel - Cancel user's pro subscription
router.post('/subscription/:userId/cancel', requireAuth, requireAdmin, async (req, res) => {
  try {
    await SubscriptionService.cancelSubscription(req.params.userId);
    const info = await SubscriptionService.getSubscriptionInfo(req.params.userId);

    await AdminAuditLog.record(
      req.user.id,
      req.user.email,
      'subscription_cancel',
      req.params.userId,
      null,
      'Canceled Pro subscription'
    );

    res.json({ message: 'Subscription canceled', ...info });
  } catch (error) {
    console.error('Admin cancel subscription error:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

// ─── All Subscriptions (Admin) ────────────────────────────

// GET /api/admin/subscriptions - List all users with their subscription info
router.get('/subscriptions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const tier = req.query.tier || '';
    const skip = (page - 1) * limit;

    // Get all real users (with Firebase UID, excluding local test users)
    const userFilter = { firebaseUid: { $ne: null }, email: { $not: /@learnloop\.local$/i } };
    const allUsers = await User.find(userFilter).select('name email firebaseUid').sort({ createdAt: -1 }).lean();

    // Get all subscriptions
    const allSubs = await Subscription.find().lean();
    const subMap = allSubs.reduce((m, s) => { m[s.userId] = s; return m; }, {});

    // Merge: every user gets a subscription entry
    let merged = allUsers.map(u => {
      const sub = subMap[u.firebaseUid];
      const effectiveTier = sub?.tier === 'pro' && (sub.status === 'active' || sub.status === 'trialing' || (sub.status === 'canceled' && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date())) ? 'pro' : 'free';
      return {
        _id: sub?._id || u._id,
        userId: u.firebaseUid,
        userName: u.name || 'Unknown',
        userEmail: u.email || '',
        tier: sub?.tier || 'free',
        effectiveTier,
        status: sub?.status || 'active',
        currentPeriodEnd: sub?.currentPeriodEnd || null,
        canceledAt: sub?.canceledAt || null,
        updatedAt: sub?.updatedAt || u.createdAt || new Date(),
      };
    });

    // Filter by tier if requested
    if (tier) {
      merged = merged.filter(s => s.effectiveTier === tier);
    }

    const total = merged.length;
    const paged = merged.slice(skip, skip + limit);

    res.json({ subscriptions: paged, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin list subscriptions error:', error);
    res.status(500).json({ message: 'Failed to list subscriptions' });
  }
});

// ─── Weekly Rewards (Admin) ───────────────────────────────

// GET /api/admin/rewards - List all weekly rewards
router.get('/rewards', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const [rewards, total] = await Promise.all([
      WeeklyReward.find().sort({ weekEndDate: -1, rank: 1 }).skip(skip).limit(limit).lean(),
      WeeklyReward.countDocuments(),
    ]);

    res.json({ rewards, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin list rewards error:', error);
    res.status(500).json({ message: 'Failed to list rewards' });
  }
});

// GET /api/admin/rewards/latest - Get the most recent week's rewards
router.get('/rewards/latest', requireAuth, requireAdmin, async (req, res) => {
  try {
    const latest = await WeeklyReward.find().sort({ weekEndDate: -1 }).limit(3).lean();
    res.json({ rewards: latest });
  } catch (error) {
    console.error('Admin latest rewards error:', error);
    res.status(500).json({ message: 'Failed to get latest rewards' });
  }
});

export default router
