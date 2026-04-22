import AdminFlag from '../models/AdminFlag.js'
import XpSettings from '../models/XpSettings.js'

class FlagService {
  /**
   * Check if user activity triggers a flag.
   * Never throws — wrapped in try/catch internally.
   */
  async checkAndFlag(userId, userEmail, triggerType, value) {
    try {
      const settings = await XpSettings.getSettings()

      const thresholds = {
        too_many_sessions: { max: settings.maxSessionsPerDay || 20, severity: 'high' },
        short_sessions: { min: settings.minSessionDuration || 60, severity: 'medium' },
        high_daily_xp: { max: settings.maxDailyXp || 500, severity: 'high' },
        duplicate_reflection: { severity: 'medium' },
        never_active: { severity: 'low' }
      }

      const config = thresholds[triggerType]
      if (!config) return null

      let shouldFlag = false
      let detail = ''

      switch (triggerType) {
        case 'too_many_sessions':
          shouldFlag = value > config.max
          detail = `User completed ${value} sessions in 24 hours (threshold: ${config.max})`
          break
        case 'short_sessions':
          shouldFlag = value < config.min
          detail = `Session duration ${value}s is below minimum (threshold: ${config.min}s)`
          break
        case 'high_daily_xp':
          shouldFlag = value > config.max
          detail = `User earned ${value} XP today (threshold: ${config.max})`
          break
        case 'duplicate_reflection':
          shouldFlag = value // value is a boolean or count
          detail = `Duplicate reflection text detected`
          break
        case 'never_active':
          shouldFlag = true
          detail = `User registered 7+ days ago with no sessions`
          break
      }

      if (!shouldFlag) return null

      // Check if flag already exists for this user/type/status
      const existing = await AdminFlag.findOne({
        userId,
        flagType: triggerType,
        status: 'open'
      })

      if (existing) return existing

      // Create new flag
      const flag = await AdminFlag.create({
        userId,
        userEmail,
        flagType: triggerType,
        severity: config.severity,
        detail,
        status: 'open'
      })

      console.log(`🚩 Flag created: ${triggerType} for user ${userEmail}`)
      return flag
    } catch (error) {
      console.error('FlagService.checkAndFlag error:', error)
      return null
    }
  }

  /**
   * Get open flags paginated.
   */
  async getOpenFlags(page = 1, pageSize = 20) {
    try {
      const skip = (page - 1) * pageSize
      const [flags, total] = await Promise.all([
        AdminFlag.find({ status: 'open' })
          .sort({ severity: -1, triggeredAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .lean(),
        AdminFlag.countDocuments({ status: 'open' })
      ])

      return {
        flags,
        total,
        page,
        pages: Math.ceil(total / pageSize)
      }
    } catch (error) {
      console.error('FlagService.getOpenFlags error:', error)
      return { flags: [], total: 0, page, pages: 0 }
    }
  }

  /**
   * Dismiss a flag.
   */
  async dismissFlag(flagId, adminId) {
    try {
      const flag = await AdminFlag.findByIdAndUpdate(
        flagId,
        {
          status: 'dismissed',
          resolvedAt: new Date(),
          resolvedBy: adminId
        },
        { new: true }
      )
      return flag
    } catch (error) {
      console.error('FlagService.dismissFlag error:', error)
      return null
    }
  }

  /**
   * Mark flag as actioned.
   */
  async markActioned(flagId, adminId) {
    try {
      const flag = await AdminFlag.findByIdAndUpdate(
        flagId,
        {
          status: 'actioned',
          resolvedAt: new Date(),
          resolvedBy: adminId
        },
        { new: true }
      )
      return flag
    } catch (error) {
      console.error('FlagService.markActioned error:', error)
      return null
    }
  }

  /**
   * Get count of open flags.
   */
  async getOpenFlagCount() {
    try {
      return await AdminFlag.countDocuments({ status: 'open' })
    } catch (error) {
      console.error('FlagService.getOpenFlagCount error:', error)
      return 0
    }
  }
}

export default new FlagService()
