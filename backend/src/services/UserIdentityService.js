import UserXpProfile from '../models/UserXpProfile.js'
import UserStreak from '../models/UserStreak.js'
import XpTransaction from '../models/XpTransaction.js'
import LeaderboardService from './LeaderboardService.js'

class UserIdentityService {
  static async migrateUserId(oldUserId, newUserId) {
    if (!oldUserId || !newUserId || oldUserId === newUserId) return

    const [oldProfile, newProfile, oldStreak, newStreak] = await Promise.all([
      UserXpProfile.findOne({ userId: oldUserId }),
      UserXpProfile.findOne({ userId: newUserId }),
      UserStreak.findOne({ userId: oldUserId }),
      UserStreak.findOne({ userId: newUserId })
    ])

    if (oldProfile) {
      if (newProfile) {
        newProfile.totalXp += oldProfile.totalXp || 0
        newProfile.weeklyXp += oldProfile.weeklyXp || 0
        newProfile.weekStartDate = newProfile.weekStartDate || oldProfile.weekStartDate
        await newProfile.save()
        await oldProfile.deleteOne()
      } else {
        oldProfile.userId = newUserId
        await oldProfile.save()
      }
    }

    if (oldStreak) {
      if (newStreak) {
        newStreak.currentStreak = Math.max(newStreak.currentStreak || 0, oldStreak.currentStreak || 0)
        newStreak.longestStreak = Math.max(newStreak.longestStreak || 0, oldStreak.longestStreak || 0)
        newStreak.lastPracticeDate = [newStreak.lastPracticeDate, oldStreak.lastPracticeDate].filter(Boolean).sort((a, b) => b - a)[0] || null
        newStreak.streakStartDate = [newStreak.streakStartDate, oldStreak.streakStartDate].filter(Boolean).sort((a, b) => a - b)[0] || null
        await newStreak.save()
        await oldStreak.deleteOne()
      } else {
        oldStreak.userId = newUserId
        await oldStreak.save()
      }
    }

    await XpTransaction.updateMany({ userId: oldUserId }, { $set: { userId: newUserId } })
    await LeaderboardService.clearCache()
  }
}

export default UserIdentityService
