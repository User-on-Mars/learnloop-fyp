import LeaderboardService from './LeaderboardService.js';
import ErrorLoggingService from './ErrorLoggingService.js';
import UserXpProfile from '../models/UserXpProfile.js';
import User from '../models/User.js';
import WeeklyReward from '../models/WeeklyReward.js';
import WeeklyResetHistory from '../models/WeeklyResetHistory.js';
import SubscriptionService from './SubscriptionService.js';
import NotificationService from './NotificationService.js';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Reward config: rank → days of Pro subscription
const REWARD_CONFIG = [
  { rank: 1, days: 180, label: '6 months' },
  { rank: 2, days: 90, label: '3 months' },
  { rank: 3, days: 30, label: '1 month' },
];

/**
 * WeeklyResetScheduler - Runs LeaderboardService.executeWeeklyReset()
 * every Sunday at 00:00 UTC using a two-phase timer approach:
 *   1. On startup, check if a reset was missed (server was down over Sunday)
 *   2. setTimeout to align to the next Sunday 00:00 UTC
 *   3. setInterval every 7 days after that
 */
class WeeklyResetScheduler {
  constructor() {
    this._alignTimeout = null;
    this._weeklyInterval = null;
  }

  /**
   * Calculate ms until next Sunday 00:00 UTC.
   * If it's exactly Sunday 00:00 UTC, returns ONE_WEEK_MS (schedule for next week).
   */
  static _msUntilNextSundayUTC(now = new Date()) {
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;

    const nextSunday = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilSunday
    ));

    const ms = nextSunday.getTime() - now.getTime();
    return ms <= 0 ? ONE_WEEK_MS : ms;
  }

  /**
   * Get the most recent Sunday 00:00 UTC before or equal to the given date.
   */
  static _getLastSundayUTC(now = new Date()) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = d.getUTCDay(); // 0=Sun
    d.setUTCDate(d.getUTCDate() - day);
    return d;
  }

  /**
   * Check if the weekly reset was missed (e.g. server was down on Sunday).
   * If so, run it now. Uses WeeklyResetHistory to determine the last reset.
   */
  async _checkForMissedReset() {
    try {
      const now = new Date();
      const lastSunday = WeeklyResetScheduler._getLastSundayUTC(now);

      // If today is Sunday, the reset should happen at 00:00 — don't catch up yet,
      // let the normal timer handle it (unless it's already past 00:00 and no reset ran)
      // We check if there's a reset record for this week's boundary
      const lastReset = await WeeklyResetHistory.findOne()
        .sort({ weekEndDate: -1 })
        .select('weekEndDate createdAt')
        .lean();

      if (!lastReset) {
        // No reset has ever run — if there are users with weeklyXp, run it now
        const usersWithXp = await UserXpProfile.countDocuments({ weeklyXp: { $gt: 0 } });
        if (usersWithXp > 0) {
          console.log('⚠️ No weekly reset has ever run and users have weekly XP — running catch-up reset now');
          await this._runReset();
          return true;
        }
        console.log('📊 No weekly reset history found, but no users with weekly XP — skipping catch-up');
        return false;
      }

      // Check if the last reset covers the most recent Sunday boundary
      // The reset creates a weekEndDate that's the Saturday 23:59:59.999 before the reset
      // If lastReset.createdAt is before lastSunday, we missed a reset
      const lastResetTime = new Date(lastReset.createdAt);
      if (lastResetTime < lastSunday) {
        const usersWithXp = await UserXpProfile.countDocuments({ weeklyXp: { $gt: 0 } });
        if (usersWithXp > 0) {
          console.log(`⚠️ Missed weekly reset! Last reset: ${lastResetTime.toISOString()}, last Sunday: ${lastSunday.toISOString()} — running catch-up now`);
          await this._runReset();
          return true;
        }
        console.log('📊 Missed reset window but no users with weekly XP — skipping catch-up');
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking for missed reset:', error.message);
      await ErrorLoggingService.logError(error, { operation: 'checkForMissedReset' });
      return false;
    }
  }

  /**
   * Award Pro subscriptions to top 3 weekly XP users.
   * Stacks duration on existing subscriptions.
   */
  async _awardWeeklyRewards() {
    try {
      // Get top 3 users by weekly XP (before reset clears it)
      const topUsers = await UserXpProfile.find({ weeklyXp: { $gt: 0 } })
        .sort({ weeklyXp: -1 })
        .limit(3)
        .lean();

      if (topUsers.length === 0) {
        console.log('📊 No users with weekly XP — skipping rewards');
        return [];
      }

      const weekEndDate = new Date(); // The moment before reset
      const rewards = [];

      for (let i = 0; i < Math.min(topUsers.length, REWARD_CONFIG.length); i++) {
        const profile = topUsers[i];
        const config = REWARD_CONFIG[i];

        try {
          // Get user info
          const user = await User.findOne({ firebaseUid: profile.userId }).select('name email firebaseUid').lean();
          const userName = user?.name || user?.email?.split('@')[0] || 'Unknown';
          const userEmail = user?.email || '';

          // Stack duration: extend from max(currentPeriodEnd, now)
          const sub = await SubscriptionService.getSubscription(profile.userId);
          const baseDate = sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()
            ? new Date(sub.currentPeriodEnd)
            : new Date();
          const newEndDate = new Date(baseDate.getTime() + config.days * 24 * 60 * 60 * 1000);

          // Upgrade/extend subscription
          await SubscriptionService.upgradeToPro(profile.userId, {
            externalId: `weekly_reward:rank${config.rank}:${weekEndDate.toISOString().split('T')[0]}`,
            periodEnd: newEndDate,
          });

          // Save reward record
          const reward = await WeeklyReward.create({
            userId: profile.userId,
            userName,
            userEmail,
            rank: config.rank,
            weeklyXp: profile.weeklyXp,
            rewardDays: config.days,
            rewardLabel: config.label,
            weekEndDate,
            subscriptionExtendedTo: newEndDate,
          });

          rewards.push(reward);

          // Send winner notification
          if (user) {
            try {
              await NotificationService.sendWeeklyRewardWinnerNotification(
                { ...user, _id: user.firebaseUid },
                reward
              );
            } catch (notifErr) {
              console.error(`⚠️ Failed to notify reward winner ${profile.userId}:`, notifErr.message);
            }
          }

          console.log(`🏆 Weekly reward: #${config.rank} ${userName} (${profile.weeklyXp} XP) → ${config.label} Pro (until ${newEndDate.toISOString().split('T')[0]})`);
        } catch (userErr) {
          console.error(`❌ Failed to award reward to rank ${config.rank} user ${profile.userId}:`, userErr.message);
        }
      }

      await ErrorLoggingService.logSystemEvent('weekly_rewards_awarded', {
        rewards: rewards.map(r => ({ rank: r.rank, userId: r.userId, days: r.rewardDays })),
        timestamp: new Date().toISOString(),
      });

      return rewards;
    } catch (error) {
      console.error('❌ Weekly reward error:', error.message);
      await ErrorLoggingService.logError(error, { operation: 'awardWeeklyRewards' });
      return [];
    }
  }

  /**
   * Execute the weekly reset and log the outcome.
   */
  async _runReset() {
    try {
      await ErrorLoggingService.logSystemEvent('weekly_reset_started', {
        timestamp: new Date().toISOString()
      });

      // Award rewards BEFORE resetting weekly XP
      const rewards = await this._awardWeeklyRewards();

      const result = await LeaderboardService.executeWeeklyReset();

      await ErrorLoggingService.logSystemEvent('weekly_reset_scheduler_success', {
        rewards: rewards.length,
        promotions: result.promotions.length,
        relegations: result.relegations.length,
        totalRankedUsers: result.totalRankedUsers
      });
    } catch (error) {
      await ErrorLoggingService.logError(
        { message: `Weekly reset scheduler error: ${error.message}`, category: 'scheduler', code: 'WEEKLY_RESET_SCHEDULER_FAILED' },
        { operation: 'WeeklyResetScheduler._runReset' }
      );
    }
  }

  /**
   * Start the scheduler. First checks for missed resets, then aligns
   * to next Sunday 00:00 UTC and repeats every 7 days.
   */
  async start() {
    // Check for missed resets on startup (handles server restarts)
    await this._checkForMissedReset();

    const delay = WeeklyResetScheduler._msUntilNextSundayUTC();
    const nextRun = new Date(Date.now() + delay);

    console.log(`⏰ Weekly reset scheduled — next run: ${nextRun.toISOString()}`);

    this._alignTimeout = setTimeout(async () => {
      await this._runReset();

      this._weeklyInterval = setInterval(() => {
        this._runReset();
      }, ONE_WEEK_MS);
    }, delay);
  }

  /**
   * Stop the scheduler and clear all timers.
   */
  stop() {
    if (this._alignTimeout) {
      clearTimeout(this._alignTimeout);
      this._alignTimeout = null;
    }
    if (this._weeklyInterval) {
      clearInterval(this._weeklyInterval);
      this._weeklyInterval = null;
    }
  }
}

export default new WeeklyResetScheduler();
