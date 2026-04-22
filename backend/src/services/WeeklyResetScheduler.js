import LeaderboardService from './LeaderboardService.js';
import ErrorLoggingService from './ErrorLoggingService.js';
import UserXpProfile from '../models/UserXpProfile.js';
import User from '../models/User.js';
import WeeklyReward from '../models/WeeklyReward.js';
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
 * every Monday at 00:00 UTC using a two-phase timer approach:
 *   1. setTimeout to align to the next Monday 00:00 UTC
 *   2. setInterval every 7 days after that
 */
class WeeklyResetScheduler {
  constructor() {
    this._alignTimeout = null;
    this._weeklyInterval = null;
  }

  /**
   * Calculate ms until next Sunday 00:00 UTC (midnight Saturday→Sunday).
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

          // Send notification
          if (user) {
            try {
              await NotificationService.sendSubscriptionUpgradeNotification(
                { ...user, _id: user.firebaseUid },
                { currentPeriodEnd: newEndDate }
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
   * Start the scheduler. First aligns to next Sunday 00:00 UTC,
   * then repeats every 7 days.
   */
  start() {
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
