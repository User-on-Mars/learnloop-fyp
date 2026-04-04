import User from '../models/User.js'
import AdminAuditLog from '../models/AdminAuditLog.js'
import AdminFlag from '../models/AdminFlag.js'
import Skill from '../models/Skill.js'
import Node from '../models/Node.js'
import Practice from '../models/Practice.js'
import Reflection from '../models/Reflection.js'
import LearningSession from '../models/LearningSession.js'
import UserXpProfile from '../models/UserXpProfile.js'
import UserStreak from '../models/UserStreak.js'
import WeeklyResetHistory from '../models/WeeklyResetHistory.js'
import XpTransaction from '../models/XpTransaction.js'

class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(todayStart)
      weekStart.setDate(weekStart.getDate() - 7)

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
        LearningSession.countDocuments({ isActive: true }),
        Practice.countDocuments({ createdAt: { $gte: todayStart } }),
        Practice.countDocuments({ createdAt: { $gte: weekStart } })
      ])

      const practiceHoursResult = await Practice.aggregate([
        { $group: { _id: null, totalMinutes: { $sum: '$minutesPracticed' } } }
      ])
      const totalPracticeHours = Math.round((practiceHoursResult[0]?.totalMinutes || 0) / 60)

      return {
        users: { total: totalUsers, newToday: newUsersToday, newWeek: newUsersWeek, active: activeUsers, suspended: suspendedUsers, banned: bannedUsers },
        content: { skillMaps: totalSkillMaps, practices: totalPractices, reflections: totalReflections, practiceHours: totalPracticeHours },
        activity: { activeSessions, practiceToday, practiceWeek }
      }
    } catch (error) {
      console.error('AdminService.getDashboardStats error:', error)
      throw error
    }
  }

  /**
   * Get paginated users list with optional filtering
   */
  async getUsers(page = 1, limit = 20, filter = {}) {
    try {
      const skip = (page - 1) * limit
      const query = {}

      if (filter.search) {
        query.$or = [
          { name: { $regex: filter.search, $options: 'i' } },
          { email: { $regex: filter.search, $options: 'i' } }
        ]
      }
      if (filter.status) query.accountStatus = filter.status
      if (filter.role) query.role = filter.role

      const [users, total] = await Promise.all([
        User.find(query)
          .select('-passwordHash')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query)
      ])

      const enriched = await Promise.all(users.map(async (user) => {
        const uid = user.firebaseUid || user._id.toString()
        const [skillCount, practiceCount, reflectionCount, xpProfile] = await Promise.all([
          Skill.countDocuments({ userId: uid }),
          Practice.countDocuments({ userId: uid }),
          Reflection.countDocuments({ userId: uid }),
          UserXpProfile.findOne({ userId: uid }).lean()
        ])
        
        // Calculate league tier based on XP thresholds
        let leagueTier = 'Newcomer'
        const totalXp = xpProfile?.totalXp || 0
        if (totalXp >= 1000) leagueTier = 'Gold'
        else if (totalXp >= 500) leagueTier = 'Silver'
        else if (totalXp >= 100) leagueTier = 'Bronze'
        
        return { 
          ...user, 
          skillCount, 
          practiceCount, 
          reflectionCount,
          leagueTier
        }
      }))

      return { users: enriched, total, page, pages: Math.ceil(total / limit) }
    } catch (error) {
      console.error('AdminService.getUsers error:', error)
      throw error
    }
  }

  /**
   * Get detailed user info with all related content
   */
  async getUserDetail(userId) {
    try {
      const user = await User.findById(userId).select('-passwordHash').lean()
      if (!user) throw new Error('User not found')

      const uid = user.firebaseUid || user._id.toString()
      const [skills, practices, reflections, sessions, xpProfile, flags] = await Promise.all([
        Skill.find({ userId: uid }).lean(),
        Practice.find({ userId: uid }).sort('-createdAt').limit(20).lean(),
        Reflection.find({ userId: uid }).sort('-createdAt').limit(20).lean(),
        LearningSession.find({ userId: uid }).sort('-createdAt').limit(20).lean(),
        UserXpProfile.findOne({ userId: uid }).lean(),
        AdminFlag.find({ userId: uid, status: 'open' }).lean()
      ])

      return { user, skills, practices, reflections, sessions, xpProfile, flags }
    } catch (error) {
      console.error('AdminService.getUserDetail error:', error)
      throw error
    }
  }

  /**
   * Ban a user and void their weekly XP
   */
  async banUser(userId, reason, adminId, adminEmail) {
    try {
      if (!reason || reason.length < 10) {
        throw new Error('Ban reason must be at least 10 characters')
      }

      const user = await User.findById(userId)
      if (!user) throw new Error('User not found')
      if (user.role === 'admin') throw new Error('Cannot ban an admin')
      if (user.accountStatus === 'banned') throw new Error('User is already banned')

      user.accountStatus = 'banned'
      user.bannedAt = new Date()
      user.statusReason = reason
      await user.save()

      // Void weekly XP
      await UserXpProfile.updateOne(
        { userId: user.firebaseUid || user._id.toString() },
        { weeklyXp: 0 }
      )

      // Log audit
      await AdminAuditLog.record(
        adminId,
        adminEmail,
        'ban_user',
        user.firebaseUid || user._id.toString(),
        user.email,
        reason
      )

      console.log(`🚫 Admin banned user ${user.email}`)
      return user
    } catch (error) {
      console.error('AdminService.banUser error:', error)
      throw error
    }
  }

  /**
   * Unban a user
   */
  async unbanUser(userId, adminId, adminEmail) {
    try {
      const user = await User.findById(userId)
      if (!user) throw new Error('User not found')
      if (user.accountStatus !== 'banned') throw new Error('User is not banned')

      user.accountStatus = 'active'
      user.bannedAt = null
      user.statusReason = ''
      await user.save()

      // Log audit
      await AdminAuditLog.record(
        adminId,
        adminEmail,
        'unban_user',
        user.firebaseUid || user._id.toString(),
        user.email,
        'User unbanned'
      )

      console.log(`✅ Admin unbanned user ${user.email}`)
      return user
    } catch (error) {
      console.error('AdminService.unbanUser error:', error)
      throw error
    }
  }

  /**
   * Promote user to admin
   */
  async promoteToAdmin(userId, adminId, adminEmail) {
    try {
      const user = await User.findById(userId)
      if (!user) throw new Error('User not found')
      if (user.role === 'admin') throw new Error('User is already admin')

      user.role = 'admin'
      await user.save()

      // Log audit
      await AdminAuditLog.record(
        adminId,
        adminEmail,
        'promote_to_admin',
        user.firebaseUid || user._id.toString(),
        user.email,
        'User promoted to admin'
      )

      console.log(`🔑 Admin promoted user ${user.email} to admin`)
      return user
    } catch (error) {
      console.error('AdminService.promoteToAdmin error:', error)
      throw error
    }
  }

  /**
   * Demote admin to user (cannot demote self)
   */
  async demoteFromAdmin(userId, adminId, adminEmail) {
    try {
      if (userId === adminId) {
        throw new Error('Cannot demote yourself')
      }

      const user = await User.findById(userId)
      if (!user) throw new Error('User not found')
      if (user.role !== 'admin') throw new Error('User is not an admin')

      user.role = 'user'
      await user.save()

      // Log audit
      await AdminAuditLog.record(
        adminId,
        adminEmail,
        'demote_from_admin',
        user.firebaseUid || user._id.toString(),
        user.email,
        'User demoted from admin'
      )

      console.log(`🔓 Admin demoted user ${user.email} from admin`)
      return user
    } catch (error) {
      console.error('AdminService.demoteFromAdmin error:', error)
      throw error
    }
  }

  /**
   * Adjust user XP
   */
  async adjustXp(userId, amount, reason, adminId, adminEmail) {
    try {
      if (!reason || reason.length < 10) {
        throw new Error('Reason must be at least 10 characters')
      }

      const user = await User.findById(userId)
      if (!user) throw new Error('User not found')

      const uid = user.firebaseUid || user._id.toString()
      let xpProfile = await UserXpProfile.findOne({ userId: uid })
      if (!xpProfile) {
        xpProfile = await UserXpProfile.create({ userId: uid, totalXp: 0, weeklyXp: 0 })
      }

      const oldXp = xpProfile.totalXp
      xpProfile.totalXp = Math.max(0, xpProfile.totalXp + amount)
      await xpProfile.save()

      // Log transaction
      await XpTransaction.create({
        userId: uid,
        amount,
        type: 'admin_adjustment',
        reason,
        metadata: { adminId, adminEmail }
      })

      // Log audit
      await AdminAuditLog.record(
        adminId,
        adminEmail,
        'adjust_xp',
        uid,
        user.email,
        reason,
        { oldXp, newXp: xpProfile.totalXp, amount }
      )

      console.log(`💰 Admin adjusted XP for ${user.email}: ${amount}`)
      return { user, xpProfile, oldXp, newXp: xpProfile.totalXp }
    } catch (error) {
      console.error('AdminService.adjustXp error:', error)
      throw error
    }
  }

  /**
   * Get activity stats (practices and reflections)
   */
  async getActivityStats(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit

      const [practices, reflections, totalPractices, totalReflections] = await Promise.all([
        Practice.find().sort('-createdAt').skip(0).limit(200).lean(),
        Reflection.find().sort('-createdAt').skip(0).limit(200).lean(),
        Practice.countDocuments(),
        Reflection.countDocuments()
      ])

      const allActivity = [
        ...practices.map(p => ({ type: 'practice', ...p, sortDate: p.createdAt })),
        ...reflections.map(r => ({ type: 'reflection', ...r, sortDate: r.createdAt }))
      ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate))

      const total = allActivity.length
      const paged = allActivity.slice(skip, skip + limit)

      // Resolve user names
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

      return { activity: enriched, total, page, pages: Math.ceil(total / limit) }
    } catch (error) {
      console.error('AdminService.getActivityStats error:', error)
      throw error
    }
  }

  /**
   * Get XP leaderboard
   */
  async getXpLeaderboard(limit = 50) {
    try {
      const profiles = await UserXpProfile.find({ totalXp: { $gt: 0 } })
        .sort({ totalXp: -1 })
        .limit(limit)
        .lean()

      const userIds = profiles.map(p => p.userId)
      const users = await User.find({ firebaseUid: { $in: userIds } }).select('firebaseUid name email').lean()
      const userMap = {}
      for (const u of users) {
        userMap[u.firebaseUid] = { name: u.name, email: u.email }
      }

      const leaderboard = profiles.map((p, idx) => {
        const rank = idx + 1
        let leagueTier = 'Newcomer'
        
        // Assign league based on XP thresholds, not rank
        if (p.totalXp >= 1000) leagueTier = 'Gold'
        else if (p.totalXp >= 500) leagueTier = 'Silver'
        else if (p.totalXp >= 100) leagueTier = 'Bronze'
        else leagueTier = 'Newcomer'

        return {
          rank,
          userId: p.userId,
          userName: userMap[p.userId]?.name || 'Unknown',
          userEmail: userMap[p.userId]?.email || p.userId,
          totalXp: p.totalXp,
          weeklyXp: p.weeklyXp,
          leagueTier
        }
      })

      return leaderboard
    } catch (error) {
      console.error('AdminService.getXpLeaderboard error:', error)
      throw error
    }
  }

  /**
   * Get skill map statistics
   */
  async getSkillMapStats() {
    try {
      const totalSkillMaps = await Skill.countDocuments()
      const skillsWithNodes = await Skill.find().select('_id').lean()
      const skillIds = skillsWithNodes.map(s => s._id)

      const nodeStats = await Node.aggregate([
        { $match: { skillId: { $in: skillIds } } },
        { $group: { _id: null, totalNodes: { $sum: 1 }, avgDifficulty: { $avg: '$difficulty' } } }
      ])

      const practiceStats = await Practice.aggregate([
        { $match: { skillId: { $in: skillIds } } },
        { $group: { _id: null, totalPractices: { $sum: 1 }, avgMinutes: { $avg: '$minutesPracticed' } } }
      ])

      return {
        totalSkillMaps,
        totalNodes: nodeStats[0]?.totalNodes || 0,
        avgNodeDifficulty: nodeStats[0]?.avgDifficulty || 0,
        totalPractices: practiceStats[0]?.totalPractices || 0,
        avgPracticeMinutes: practiceStats[0]?.avgMinutes || 0
      }
    } catch (error) {
      console.error('AdminService.getSkillMapStats error:', error)
      throw error
    }
  }

  async getSkillMaps() {
    try {
      const skills = await Skill.find()
        .select('_id name userId createdAt fromTemplate nodeCount')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()

      const enriched = await Promise.all(skills.map(async (skill) => {
        const [practiceCount, uniqueUsers, nodes] = await Promise.all([
          Practice.countDocuments({ skillId: skill._id }),
          Practice.distinct('userId', { skillId: skill._id }),
          Node.find({ skillId: skill._id }).select('status').lean()
        ])

        const user = await User.findOne({ firebaseUid: skill.userId }).select('name').lean()
        
        // Calculate completion percentage
        const completedNodes = nodes.filter(n => n.status === 'Completed').length
        const completionPercentage = nodes.length > 0 
          ? Math.round((completedNodes / nodes.length) * 100)
          : 0

        // Check if it's a template: either fromTemplate is true OR userId is 'template'/'admin'
        const isTemplate = skill.fromTemplate === true || skill.userId === 'template' || skill.userId === 'admin'

        return {
          _id: skill._id,
          title: skill.name || 'Untitled',
          owner: isTemplate ? 'Template' : user?.name || 'Unknown',
          type: isTemplate ? 'Template' : 'Custom',
          nodes: skill.nodeCount || 0,
          users: uniqueUsers.length,
          completion: `${completionPercentage}%`
        }
      }))

      return enriched
    } catch (error) {
      console.error('AdminService.getSkillMaps error:', error)
      throw error
    }
  }

  /**
   * Get recent reflections
   */
  async getRecentReflections(limit = 20) {
    try {
      const reflections = await Reflection.find()
        .sort('-createdAt')
        .limit(limit)
        .lean()

      const userIds = [...new Set(reflections.map(r => r.userId))]
      const users = await User.find({ firebaseUid: { $in: userIds } }).select('firebaseUid name email').lean()
      const userMap = {}
      for (const u of users) {
        userMap[u.firebaseUid] = { name: u.name, email: u.email }
      }

      return reflections.map(r => ({
        ...r,
        userName: userMap[r.userId]?.name || 'Unknown',
        userEmail: userMap[r.userId]?.email || r.userId
      }))
    } catch (error) {
      console.error('AdminService.getRecentReflections error:', error)
      throw error
    }
  }

  /**
   * Get audit log
   */
  async getAuditLog(page = 1, limit = 50, filter = {}) {
    try {
      const skip = (page - 1) * limit
      const query = {}

      if (filter.action) query.action = filter.action
      if (filter.adminId) query.adminId = filter.adminId
      if (filter.targetUserId) query.targetUserId = filter.targetUserId

      const [logs, total] = await Promise.all([
        AdminAuditLog.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AdminAuditLog.countDocuments(query)
      ])

      return { logs, total, page, pages: Math.ceil(total / limit) }
    } catch (error) {
      console.error('AdminService.getAuditLog error:', error)
      throw error
    }
  }

  /**
   * Trigger manual weekly reset
   */
  async triggerManualReset(adminId, adminEmail) {
    try {
      // Reset all users' weekly XP
      await UserXpProfile.updateMany({}, { weeklyXp: 0 })

      // Log reset with the current date as weekEndDate
      await WeeklyResetHistory.create({
        weekEndDate: new Date(),
        totalRankedUsers: await UserXpProfile.countDocuments(),
        promotions: [],
        relegations: []
      })

      // Log audit
      await AdminAuditLog.record(
        adminId,
        adminEmail,
        'manual_weekly_reset',
        null,
        null,
        'Manual weekly reset triggered'
      )

      console.log(`🔄 Admin triggered manual weekly reset`)
      return { message: 'Weekly reset completed' }
    } catch (error) {
      console.error('AdminService.triggerManualReset error:', error)
      throw error
    }
  }

  /**
   * Recalculate all XP
   */
  async recalculateAllXp(adminId, adminEmail) {
    try {
      const users = await User.find().select('_id firebaseUid').lean()

      for (const user of users) {
        const uid = user.firebaseUid || user._id.toString()
        const practices = await Practice.find({ userId: uid }).lean()
        const totalXp = practices.reduce((sum, p) => sum + (p.xpEarned || 0), 0)

        await UserXpProfile.updateOne(
          { userId: uid },
          { totalXp },
          { upsert: true }
        )
      }

      // Log audit
      await AdminAuditLog.record(
        adminId,
        adminEmail,
        'recalculate_xp',
        null,
        null,
        'Recalculated all user XP'
      )

      console.log(`📊 Admin recalculated all XP`)
      return { message: 'XP recalculation completed' }
    } catch (error) {
      console.error('AdminService.recalculateAllXp error:', error)
      throw error
    }
  }

  async exportUserDataCsv(adminId, adminEmail) {
    try {
      const users = await User.find().select('_id firebaseUid name email accountStatus role createdAt lastLoginAt').lean()

      // Build CSV header
      const headers = ['ID', 'Name', 'Email', 'Status', 'Role', 'Joined', 'Last Active', 'Total XP', 'Weekly XP', 'Skills', 'Practices', 'Reflections']
      const rows = [headers.join(',')]

      // Fetch enriched data for each user
      for (const user of users) {
        const uid = user.firebaseUid || user._id.toString()
        const [skillCount, practiceCount, reflectionCount, xpProfile] = await Promise.all([
          Skill.countDocuments({ userId: uid }),
          Practice.countDocuments({ userId: uid }),
          Reflection.countDocuments({ userId: uid }),
          UserXpProfile.findOne({ userId: uid }).lean()
        ])

        const joinedDate = user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : ''
        const lastActiveDate = user.lastLoginAt ? new Date(user.lastLoginAt).toISOString().split('T')[0] : 'Never'
        const totalXp = xpProfile?.totalXp || 0
        const weeklyXp = xpProfile?.weeklyXp || 0

        const row = [
          user._id.toString(),
          user.name || '',
          user.email || '',
          user.accountStatus || 'active',
          user.role || 'user',
          joinedDate,
          lastActiveDate,
          totalXp,
          weeklyXp,
          skillCount,
          practiceCount,
          reflectionCount
        ]

        // Properly escape CSV values
        const escapedRow = row.map(val => {
          const strVal = String(val)
          if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
            return `"${strVal.replace(/"/g, '""')}"`
          }
          return strVal
        })

        rows.push(escapedRow.join(','))
      }

      console.log(`📥 Admin exported ${users.length} users to CSV`)
      return rows.join('\n')
    } catch (error) {
      console.error('AdminService.exportUserDataCsv error:', error)
      throw error
    }
  }
}

export default new AdminService()
