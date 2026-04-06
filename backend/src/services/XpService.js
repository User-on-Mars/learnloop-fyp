import XpTransaction from '../models/XpTransaction.js';
import UserXpProfile from '../models/UserXpProfile.js';
import StreakService from './StreakService.js';
import ErrorLoggingService from './ErrorLoggingService.js';
import LeaderboardService from './LeaderboardService.js';

/**
 * XpService - Awards XP, enforces daily caps, applies streak multiplier,
 * and maintains denormalized XP profiles.
 */
class XpService {
  /**
   * Get the Monday 00:00 UTC of the week containing the given date.
   * @param {Date} date
   * @returns {Date}
   */
  static _getWeekStart(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? 6 : day - 1; // days since Monday
    d.setUTCDate(d.getUTCDate() - diff);
    return d;
  }

  /**
   * Get start and end of the current UTC day.
   * @param {Date} [now]
   * @returns {{ dayStart: Date, dayEnd: Date }}
   */
  static _getUTCDayBounds(now = new Date()) {
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    return { dayStart, dayEnd };
  }

  /**
   * Calculate league tier based on weekly XP
   * @param {number} weeklyXp
   * @returns {'Gold'|'Silver'|'Bronze'|'Newcomer'}
   */
  static _calculateLeagueTier(weeklyXp) {
    if (weeklyXp >= 200) return 'Gold';
    if (weeklyXp >= 100) return 'Silver';
    if (weeklyXp >= 50) return 'Bronze';
    return 'Newcomer';
  }

  /**
   * Award XP to a user. Checks daily caps, applies streak multiplier, persists transaction.
   * @param {string} userId
   * @param {string} source - 'session_completion' | 'reflection' | 'streak_bonus' | 'skillmap_completion'
   * @param {number} baseAmount - positive integer
   * @param {object} [metadata] - { streakDay?, skillMapId?, nodeId? }
   * @returns {Promise<XpTransaction|null>} null if daily cap reached or validation fails
   */
  static async awardXp(userId, source, baseAmount, metadata = {}) {
    try {
      // Validate baseAmount is a positive integer
      if (!Number.isInteger(baseAmount) || baseAmount < 1) {
        await ErrorLoggingService.logError(
          { message: `Invalid baseAmount: ${baseAmount}`, category: 'xp', code: 'INVALID_XP_PARAMS' },
          { userId, source, operation: 'awardXp' }
        );
        return null;
      }

      const now = new Date();
      const { dayStart, dayEnd } = XpService._getUTCDayBounds(now);

      // For skillmap_completion, check uniqueness by referenceId instead of daily cap
      if (source === 'skillmap_completion' && metadata.skillMapId) {
        const existing = await XpTransaction.findOne({
          userId,
          source: 'skillmap_completion',
          referenceId: metadata.skillMapId
        });
        if (existing) return null;
      } else {
        // Enforce daily cap: one transaction per source per user per UTC day
        const existingToday = await XpTransaction.findOne({
          userId,
          source,
          createdAt: { $gte: dayStart, $lt: dayEnd }
        });
        if (existingToday) return null;
      }

      // Get current streak to determine multiplier
      const { currentStreak } = await StreakService.getStreak(userId);
      const multiplier = currentStreak >= 7 ? 2 : 1;

      // Validate multiplier
      if (multiplier !== 1 && multiplier !== 2) {
        await ErrorLoggingService.logError(
          { message: `Invalid multiplier: ${multiplier}`, category: 'xp', code: 'INVALID_XP_PARAMS' },
          { userId, source, operation: 'awardXp' }
        );
        return null;
      }

      const finalAmount = baseAmount * multiplier;

      const transactionData = {
        userId,
        source,
        baseAmount,
        multiplier,
        finalAmount,
        referenceId: metadata.skillMapId || metadata.nodeId || metadata.referenceId || null,
        metadata
      };

      // Persist with one retry on failure
      let transaction;
      try {
        transaction = await XpTransaction.create(transactionData);
      } catch (persistError) {
        // Retry once
        try {
          transaction = await XpTransaction.create(transactionData);
        } catch (retryError) {
          await ErrorLoggingService.logError(
            { message: `XP transaction persist failed after retry: ${retryError.message}`, category: 'xp', code: 'XP_PERSIST_FAILED' },
            { userId, source, baseAmount, operation: 'awardXp' }
          );
          return null;
        }
      }

      // Atomically update UserXpProfile and recalculate league tier
      const weekStart = XpService._getWeekStart(now);
      try {
        const updatedProfile = await UserXpProfile.findOneAndUpdate(
          { userId },
          {
            $inc: { totalXp: finalAmount, weeklyXp: finalAmount },
            $setOnInsert: { weekStartDate: weekStart, leagueTier: 'Newcomer' }
          },
          { upsert: true, new: true }
        );

        // Update league tier based on new weekly XP
        const newTier = XpService._calculateLeagueTier(updatedProfile.weeklyXp);
        if (updatedProfile.leagueTier !== newTier) {
          await UserXpProfile.updateOne(
            { userId },
            { leagueTier: newTier }
          );
        }
      } catch (profileError) {
        await ErrorLoggingService.logError(
          { message: `UserXpProfile update failed: ${profileError.message}`, category: 'xp', code: 'XP_PROFILE_UPDATE_FAILED' },
          { userId, source, operation: 'awardXp' }
        );
        // Transaction was persisted, profile will reconcile later via recalculateTotalXp
      }

      return transaction;
    } catch (error) {
      await ErrorLoggingService.logError(
        { message: `awardXp unexpected error: ${error.message}`, category: 'xp', code: 'XP_AWARD_ERROR' },
        { userId, source, baseAmount, operation: 'awardXp' }
      );
      return null;
    }
  }

  /**
   * Get a user's XP profile (total XP, weekly XP, streak, tier, weekly rank).
   * @param {string} userId
   * @returns {Promise<object>}
   */
  static async getProfile(userId) {
    const profile = await UserXpProfile.findOne({ userId });
    const { currentStreak } = await StreakService.getStreak(userId);

    const totalXp = profile?.totalXp ?? 0;
    const weeklyXp = profile?.weeklyXp ?? 0;
    
    // Calculate league tier based on weekly XP (not stored value)
    const leagueTier = XpService._calculateLeagueTier(weeklyXp);
    
    // Update stored tier if it's different
    if (profile && profile.leagueTier !== leagueTier) {
      await UserXpProfile.updateOne(
        { userId },
        { leagueTier }
      );
    }

    // Compute weekly rank using LeaderboardService for consistency with leaderboard display
    let weeklyRank = 0;
    if (profile && profile.weeklyXp > 0) {
      const above = await UserXpProfile.countDocuments({ weeklyXp: { $gt: weeklyXp } });
      
      // For tiebreaker, count users with same weeklyXp but earlier first transaction this week
      const weekStart = LeaderboardService._getWeekStart();
      const userFirstTx = await XpTransaction.findOne({
        userId,
        createdAt: { $gte: weekStart }
      }).sort({ createdAt: 1 }).select('createdAt').lean();

      let sameXpEarlier = 0;
      if (userFirstTx) {
        const tiedUsers = await UserXpProfile.find({
          weeklyXp: weeklyXp,
          userId: { $ne: userId }
        }).select('userId').lean();

        for (const tied of tiedUsers) {
          const tiedFirstTx = await XpTransaction.findOne({
            userId: tied.userId,
            createdAt: { $gte: weekStart }
          }).sort({ createdAt: 1 }).select('createdAt').lean();
          if (tiedFirstTx && tiedFirstTx.createdAt < userFirstTx.createdAt) {
            sameXpEarlier++;
          }
        }
      }
      weeklyRank = above + sameXpEarlier + 1;
    }

    return {
      totalXp,
      weeklyXp,
      currentStreak,
      leagueTier,
      weeklyRank,
      streakMultiplierActive: currentStreak >= 7
    };
  }

  /**
   * Recalculate a user's totalXp from transactions and compare to stored total.
   * @param {string} userId
   * @returns {Promise<{ calculatedTotal: number, storedTotal: number, match: boolean }>}
   */
  static async recalculateTotalXp(userId) {
    const result = await XpTransaction.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);

    const calculatedTotal = result.length > 0 ? result[0].total : 0;
    const profile = await UserXpProfile.findOne({ userId });
    const storedTotal = profile?.totalXp ?? 0;

    return {
      calculatedTotal,
      storedTotal,
      match: calculatedTotal === storedTotal
    };
  }
}

export default XpService;
