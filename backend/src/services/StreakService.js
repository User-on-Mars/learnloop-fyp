import UserStreak from '../models/UserStreak.js';

/**
 * StreakService - Tracks consecutive daily practice streaks.
 * All date logic uses UTC calendar days.
 */
class StreakService {
  /**
   * Get the UTC calendar day (midnight) for a given date.
   * @param {Date} date
   * @returns {Date}
   */
  static _toUTCDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  /**
   * Calculate the difference in calendar days between two UTC dates.
   * @param {Date} a
   * @param {Date} b
   * @returns {number} - Number of days (a - b)
   */
  static _dayDiff(a, b) {
    const dayA = StreakService._toUTCDay(a);
    const dayB = StreakService._toUTCDay(b);
    return Math.round((dayA - dayB) / (1000 * 60 * 60 * 24));
  }

  /**
   * Process a qualifying session completion for streak tracking.
   * Increments streak if consecutive day, resets to 1 if gap, no-ops if same day.
   * Sets to 1 if no prior history. Also tracks longestStreak (all-time best).
   * @param {string} userId
   * @param {Date} sessionDate
   * @returns {Promise<{ streakCount: number, isNewDay: boolean }>}
   */
  static async processSession(userId, sessionDate) {
    const streak = await UserStreak.findOne({ userId });
    const sessionDay = StreakService._toUTCDay(sessionDate);

    // No prior history — first ever session
    if (!streak) {
      await UserStreak.create({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastPracticeDate: sessionDay,
        streakStartDate: sessionDay
      });
      return { streakCount: 1, isNewDay: true };
    }

    // No last practice date — treat as first session
    if (!streak.lastPracticeDate) {
      streak.currentStreak = 1;
      streak.longestStreak = Math.max(streak.longestStreak || 0, 1);
      streak.lastPracticeDate = sessionDay;
      streak.streakStartDate = sessionDay;
      await streak.save();
      return { streakCount: 1, isNewDay: true };
    }

    const diff = StreakService._dayDiff(sessionDate, streak.lastPracticeDate);

    // Same day — no-op
    if (diff === 0) {
      return { streakCount: streak.currentStreak, isNewDay: false };
    }

    // Consecutive day — increment
    if (diff === 1) {
      streak.currentStreak += 1;
      // Update longestStreak if current exceeds it
      if (streak.currentStreak > (streak.longestStreak || 0)) {
        streak.longestStreak = streak.currentStreak;
      }
      streak.lastPracticeDate = sessionDay;
      await streak.save();
      return { streakCount: streak.currentStreak, isNewDay: true };
    }

    // Gap of more than 1 day — reset to 1
    streak.currentStreak = 1;
    streak.lastPracticeDate = sessionDay;
    streak.streakStartDate = sessionDay;
    await streak.save();
    return { streakCount: 1, isNewDay: true };
  }

  /**
   * Get current streak info for a user.
   * Automatically resets streak to 0 if more than 1 day has passed since last practice.
   * @param {string} userId
   * @returns {Promise<{ currentStreak: number, longestStreak: number, lastPracticeDate: Date|null }>}
   */
  static async getStreak(userId) {
    const streak = await UserStreak.findOne({ userId });
    if (!streak) {
      return { currentStreak: 0, longestStreak: 0, lastPracticeDate: null };
    }

    // Check if streak should be reset due to inactivity
    if (streak.lastPracticeDate) {
      const daysSinceLastPractice = StreakService._dayDiff(new Date(), streak.lastPracticeDate);
      
      // If more than 1 day has passed, reset streak to 0
      if (daysSinceLastPractice > 1) {
        streak.currentStreak = 0;
        await streak.save();
        return { 
          currentStreak: 0, 
          longestStreak: streak.longestStreak || 0,
          lastPracticeDate: streak.lastPracticeDate 
        };
      }
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak || streak.currentStreak,
      lastPracticeDate: streak.lastPracticeDate
    };
  }

  /**
   * Reset all expired streaks (where last practice was more than 1 day ago).
   * This can be run as a scheduled job to keep streak data accurate.
   * @returns {Promise<{ resetCount: number }>}
   */
  static async resetExpiredStreaks() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    // Find all streaks where lastPracticeDate is before yesterday
    const result = await UserStreak.updateMany(
      {
        currentStreak: { $gt: 0 },
        lastPracticeDate: { $lt: yesterday }
      },
      {
        $set: { currentStreak: 0 }
      }
    );

    return { resetCount: result.modifiedCount };
  }
}

export default StreakService;
