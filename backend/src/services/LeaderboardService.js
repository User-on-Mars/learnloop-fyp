import UserXpProfile from '../models/UserXpProfile.js';
import UserStreak from '../models/UserStreak.js';
import XpTransaction from '../models/XpTransaction.js';
import User from '../models/User.js';
import WeeklyResetHistory from '../models/WeeklyResetHistory.js';
import cacheService from './CacheService.js';
import ErrorLoggingService from './ErrorLoggingService.js';

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'leaderboard:';

/**
 * LeaderboardService - Computes and serves leaderboard rankings,
 * manages league tiers, and executes weekly resets.
 */
class LeaderboardService {
  /**
   * Get Monday 00:00 UTC of the week containing the given date.
   */
  static _getWeekStart(date = new Date()) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setUTCDate(d.getUTCDate() - diff);
    return d;
  }

  /**
   * Get Sunday 23:59:59.999 UTC of the week containing the given date.
   */
  static _getWeekEnd(date = new Date()) {
    const weekStart = LeaderboardService._getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);
    return weekEnd;
  }

  /**
   * Try to get a value from cache, falling through to direct query if unavailable.
   */
  static async _getCached(key) {
    if (!cacheService.isAvailable()) return null;
    try {
      const raw = await cacheService.client.get(`${CACHE_PREFIX}${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set a value in cache with TTL.
   */
  static async _setCache(key, value, ttl = CACHE_TTL) {
    if (!cacheService.isAvailable()) return;
    try {
      await cacheService.client.setEx(`${CACHE_PREFIX}${key}`, ttl, JSON.stringify(value));
    } catch {
      // Cache write failure is non-critical
    }
  }

  /**
   * Assign league tier based on weekly rank.
   * @param {number} rank - 1-indexed rank, or 0 for unranked
   * @returns {'Gold'|'Silver'|'Bronze'|'Newcomer'}
   */
  static getTierForRank(rank) {
    if (rank >= 1 && rank <= 10) return 'Gold';
    if (rank >= 11 && rank <= 30) return 'Silver';
    if (rank >= 31 && rank <= 100) return 'Bronze';
    return 'Newcomer';
  }

  /**
   * Get weekly XP leaderboard (paginated, cached).
   * Tiebreaker: earlier first XP transaction timestamp in the week wins.
   * @param {number} page - 1-indexed
   * @param {number} pageSize - default 50
   */
  static async getWeeklyBoard(page = 1, pageSize = 50) {
    const cacheKey = `weekly:${page}:${pageSize}`;
    const cached = await LeaderboardService._getCached(cacheKey);
    if (cached) return cached;

    const weekStart = LeaderboardService._getWeekStart();
    const skip = (page - 1) * pageSize;

    // Get profiles with weeklyXp > 0, join with XpTransaction for tiebreaker
    const pipeline = [
      { $match: { weeklyXp: { $gt: 0 } } },
      {
        $lookup: {
          from: 'xptransactions',
          let: { uid: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$uid'] },
                createdAt: { $gte: weekStart }
              }
            },
            { $sort: { createdAt: 1 } },
            { $limit: 1 },
            { $project: { createdAt: 1 } }
          ],
          as: 'firstTx'
        }
      },
      {
        $addFields: {
          firstTxTime: { $ifNull: [{ $arrayElemAt: ['$firstTx.createdAt', 0] }, new Date()] }
        }
      },
      { $sort: { weeklyXp: -1, firstTxTime: 1 } },
      {
        $facet: {
          entries: [
            { $skip: skip },
            { $limit: pageSize },
            { $project: { userId: 1, weeklyXp: 1, leagueTier: 1 } }
          ],
          total: [{ $count: 'count' }]
        }
      }
    ];

    const [result] = await UserXpProfile.aggregate(pipeline);
    const total = result.total[0]?.count || 0;

    // Enrich with display names and rank
    const entries = await Promise.all(
      result.entries.map(async (entry, idx) => {
        const user = await User.findById(entry.userId).select('name').lean();
        return {
          userId: entry.userId,
          displayName: user?.name || 'Unknown',
          weeklyXp: entry.weeklyXp,
          rank: skip + idx + 1,
          leagueTier: LeaderboardService.getTierForRank(skip + idx + 1)
        };
      })
    );

    const data = { entries, total, page };
    await LeaderboardService._setCache(cacheKey, data);
    return data;
  }

  /**
   * Get streak leaderboard (paginated, cached).
   * Tiebreaker: earlier streakStartDate wins.
   * Excludes users with streak of 0.
   */
  static async getStreakBoard(page = 1, pageSize = 50) {
    const cacheKey = `streaks:${page}:${pageSize}`;
    const cached = await LeaderboardService._getCached(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * pageSize;

    const pipeline = [
      { $match: { currentStreak: { $gte: 1 } } },
      { $sort: { currentStreak: -1, streakStartDate: 1 } },
      {
        $facet: {
          entries: [
            { $skip: skip },
            { $limit: pageSize },
            { $project: { userId: 1, currentStreak: 1, streakStartDate: 1 } }
          ],
          total: [{ $count: 'count' }]
        }
      }
    ];

    const [result] = await UserStreak.aggregate(pipeline);
    const total = result.total[0]?.count || 0;

    const entries = await Promise.all(
      result.entries.map(async (entry, idx) => {
        const user = await User.findById(entry.userId).select('name').lean();
        return {
          userId: entry.userId,
          displayName: user?.name || 'Unknown',
          currentStreak: entry.currentStreak,
          rank: skip + idx + 1
        };
      })
    );

    const data = { entries, total, page };
    await LeaderboardService._setCache(cacheKey, data);
    return data;
  }

  /**
   * Get all-time XP leaderboard (paginated, cached).
   * Tiebreaker: earlier user registration (createdAt on User) wins.
   */
  static async getAllTimeBoard(page = 1, pageSize = 50) {
    const cacheKey = `alltime:${page}:${pageSize}`;
    const cached = await LeaderboardService._getCached(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * pageSize;

    const pipeline = [
      { $match: { totalXp: { $gt: 0 } } },
      {
        $lookup: {
          from: 'users',
          let: { uid: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$uid'] } } },
            { $project: { createdAt: 1, name: 1 } }
          ],
          as: 'userInfo'
        }
      },
      {
        $addFields: {
          userCreatedAt: { $ifNull: [{ $arrayElemAt: ['$userInfo.createdAt', 0] }, new Date()] },
          displayName: { $ifNull: [{ $arrayElemAt: ['$userInfo.name', 0] }, 'Unknown'] }
        }
      },
      { $sort: { totalXp: -1, userCreatedAt: 1 } },
      {
        $facet: {
          entries: [
            { $skip: skip },
            { $limit: pageSize },
            { $project: { userId: 1, totalXp: 1, displayName: 1 } }
          ],
          total: [{ $count: 'count' }]
        }
      }
    ];

    const [result] = await UserXpProfile.aggregate(pipeline);
    const total = result.total[0]?.count || 0;

    const entries = result.entries.map((entry, idx) => ({
      userId: entry.userId,
      displayName: entry.displayName,
      totalXp: entry.totalXp,
      rank: skip + idx + 1
    }));

    const data = { entries, total, page };
    await LeaderboardService._setCache(cacheKey, data);
    return data;
  }

  /**
   * Get a specific user's rank on each board.
   * @param {string} userId
   * @returns {Promise<{ weeklyRank: number, streakRank: number, allTimeRank: number }>}
   */
  static async getUserRanks(userId) {
    // Weekly rank: count users with higher weeklyXp, plus tiebreaker
    const profile = await UserXpProfile.findOne({ userId });
    let weeklyRank = 0;
    if (profile && profile.weeklyXp > 0) {
      const above = await UserXpProfile.countDocuments({ weeklyXp: { $gt: profile.weeklyXp } });
      // For tiebreaker, count users with same weeklyXp but earlier first transaction this week
      const weekStart = LeaderboardService._getWeekStart();
      const userFirstTx = await XpTransaction.findOne({
        userId,
        createdAt: { $gte: weekStart }
      }).sort({ createdAt: 1 }).select('createdAt').lean();

      let sameXpEarlier = 0;
      if (userFirstTx) {
        const tiedUsers = await UserXpProfile.find({
          weeklyXp: profile.weeklyXp,
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

    // Streak rank
    const streak = await UserStreak.findOne({ userId });
    let streakRank = 0;
    if (streak && streak.currentStreak >= 1) {
      const above = await UserStreak.countDocuments({ currentStreak: { $gt: streak.currentStreak } });
      const sameStreakEarlier = await UserStreak.countDocuments({
        currentStreak: streak.currentStreak,
        streakStartDate: { $lt: streak.streakStartDate },
        userId: { $ne: userId }
      });
      streakRank = above + sameStreakEarlier + 1;
    }

    // All-time rank
    let allTimeRank = 0;
    if (profile && profile.totalXp > 0) {
      const above = await UserXpProfile.countDocuments({ totalXp: { $gt: profile.totalXp } });
      const user = await User.findById(userId).select('createdAt').lean();
      let sameTotalEarlier = 0;
      if (user) {
        const tiedProfiles = await UserXpProfile.find({
          totalXp: profile.totalXp,
          userId: { $ne: userId }
        }).select('userId').lean();

        for (const tied of tiedProfiles) {
          const tiedUser = await User.findById(tied.userId).select('createdAt').lean();
          if (tiedUser && tiedUser.createdAt < user.createdAt) {
            sameTotalEarlier++;
          }
        }
      }
      allTimeRank = above + sameTotalEarlier + 1;
    }

    return { weeklyRank, streakRank, allTimeRank };
  }

  /**
   * Execute weekly reset: reset weekly XP, apply promotion/relegation, persist history.
   * Called every Monday at 00:00 UTC.
   */
  static async executeWeeklyReset() {
    try {
      const now = new Date();
      const weekEnd = new Date(LeaderboardService._getWeekStart(now));
      weekEnd.setUTCMilliseconds(-1); // Sunday 23:59:59.999 of previous week

      // Determine promotions and relegations BEFORE resetting XP
      const goldUsers = await UserXpProfile.find({ leagueTier: 'Gold' })
        .sort({ weeklyXp: 1 }) // ascending so bottom are first
        .select('userId weeklyXp leagueTier')
        .lean();

      const silverUsers = await UserXpProfile.find({ leagueTier: 'Silver' })
        .sort({ weeklyXp: -1 }) // descending so top are first
        .select('userId weeklyXp leagueTier')
        .lean();

      const promotions = [];
      const relegations = [];

      // Promote top 3 Silver to Gold (only if Silver has ≥ 4 users)
      if (silverUsers.length >= 4) {
        const toPromote = silverUsers.slice(0, 3);
        for (const user of toPromote) {
          promotions.push({ userId: user.userId, fromTier: 'Silver', toTier: 'Gold' });
          await UserXpProfile.updateOne({ userId: user.userId }, { leagueTier: 'Gold' });
        }
      }

      // Relegate bottom 3 Gold to Silver (only if Gold has ≥ 4 users)
      if (goldUsers.length >= 4) {
        const toRelegate = goldUsers.slice(0, 3); // already sorted ascending, so bottom 3
        for (const user of toRelegate) {
          relegations.push({ userId: user.userId, fromTier: 'Gold', toTier: 'Silver' });
          await UserXpProfile.updateOne({ userId: user.userId }, { leagueTier: 'Silver' });
        }
      }

      // Count total ranked users before reset
      const totalRankedUsers = await UserXpProfile.countDocuments({ weeklyXp: { $gt: 0 } });

      // Reset all weekly XP to 0
      await UserXpProfile.updateMany({}, { weeklyXp: 0 });

      // Persist history
      await WeeklyResetHistory.create({
        weekEndDate: weekEnd,
        promotions,
        relegations,
        totalRankedUsers
      });

      await ErrorLoggingService.logSystemEvent('weekly_reset_complete', {
        promotions: promotions.length,
        relegations: relegations.length,
        totalRankedUsers
      });

      return { promotions, relegations, totalRankedUsers };
    } catch (error) {
      await ErrorLoggingService.logError(
        { message: `Weekly reset failed: ${error.message}`, category: 'leaderboard', code: 'WEEKLY_RESET_FAILED' },
        { operation: 'executeWeeklyReset' }
      );
      throw error;
    }
  }
}

export default LeaderboardService;
