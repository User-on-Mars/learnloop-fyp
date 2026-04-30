import XpTransaction from '../models/XpTransaction.js';
import UserXpProfile from '../models/UserXpProfile.js';
import XpSettings from '../models/XpSettings.js';
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
    d.setUTCDate(d.getUTCDate() - day); // Go back to Sunday
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
   * Calculate league tier based on weekly XP using configurable thresholds
   * @param {number} weeklyXp
   * @param {object} settings - XpSettings document
   * @returns {'Gold'|'Silver'|'Bronze'|'Newcomer'}
   */
  static _calculateLeagueTierWithSettings(weeklyXp, settings) {
    if (weeklyXp >= settings.goldThreshold) return 'Gold';
    if (weeklyXp >= settings.silverThreshold) return 'Silver';
    if (weeklyXp >= settings.bronzeThreshold) return 'Bronze';
    return 'Newcomer';
  }

  /**
   * Award XP to a user. Applies streak multiplier, persists transaction.
   * @param {string} userId
   * @param {string} source - 'practice' | 'reflection' | 'admin_adjustment'
   * @param {number} baseAmount - non-negative number
   * @param {object} [metadata] - { practiceId?, reflectionId?, referenceId?, minutesPracticed? }
   * @returns {Promise<XpTransaction|null>} null if validation fails
   */
  static async awardXp(userId, source, baseAmount, metadata = {}) {
    try {
      // Validate baseAmount is non-negative
      if (typeof baseAmount !== 'number' || baseAmount < 0) {
        await ErrorLoggingService.logError(
          { message: `Invalid baseAmount: ${baseAmount}`, category: 'xp', code: 'INVALID_XP_PARAMS' },
          { userId, source, operation: 'awardXp' }
        );
        return null;
      }

      // Skip if baseAmount is 0
      if (baseAmount === 0) {
        return null;
      }

      const now = new Date();
      const { dayStart, dayEnd } = XpService._getUTCDayBounds(now);

      // For reflection, enforce daily cap: one reflection XP per user per UTC day
      if (source === 'reflection') {
        const existingToday = await XpTransaction.findOne({
          userId,
          source: 'reflection',
          createdAt: { $gte: dayStart, $lt: dayEnd }
        });
        if (existingToday) return null;
      }

      // Get current streak to determine multiplier
      const { currentStreak } = await StreakService.getStreak(userId);
      let multiplier = 1;
      
      if (currentStreak >= 7) {
        const settings = await XpSettings.getSettings();
        multiplier = settings.streak7DayMultiplier;
      } else if (currentStreak >= 5) {
        const settings = await XpSettings.getSettings();
        multiplier = settings.streak5DayMultiplier;
      }

      const finalAmount = Math.round(baseAmount * multiplier);

      const transactionData = {
        userId,
        source,
        baseAmount,
        multiplier,
        finalAmount,
        referenceId: metadata.practiceId || metadata.reflectionId || metadata.referenceId || null,
        metadata: {
          ...metadata,
          streakDays: currentStreak
        }
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
        const settings = await XpSettings.getSettings();
        const updatedProfile = await UserXpProfile.findOneAndUpdate(
          { userId },
          {
            $inc: { totalXp: finalAmount, weeklyXp: finalAmount },
            $setOnInsert: { weekStartDate: weekStart, leagueTier: 'Newcomer' }
          },
          { upsert: true, new: true }
        );

        // Update league tier based on new weekly XP with configurable thresholds
        const newTier = XpService._calculateLeagueTierWithSettings(updatedProfile.weeklyXp, settings);
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
    const { currentStreak, longestStreak } = await StreakService.getStreak(userId);
    const settings = await XpSettings.getSettings();

    const totalXp = profile?.totalXp ?? 0;
    const weeklyXp = profile?.weeklyXp ?? 0;
    
    // Calculate league tier based on weekly XP with configurable thresholds
    const leagueTier = XpService._calculateLeagueTierWithSettings(weeklyXp, settings);
    
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

    // Determine active multiplier
    let activeMultiplier = 1;
    if (currentStreak >= 7) {
      activeMultiplier = settings.streak7DayMultiplier;
    } else if (currentStreak >= 5) {
      activeMultiplier = settings.streak5DayMultiplier;
    }

    return {
      totalXp,
      weeklyXp,
      currentStreak,
      longestStreak,
      leagueTier,
      weeklyRank,
      streakMultiplierActive: activeMultiplier > 1,
      activeMultiplier,
      leagueThresholds: {
        bronze: settings.bronzeThreshold,
        silver: settings.silverThreshold,
        gold: settings.goldThreshold
      }
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
