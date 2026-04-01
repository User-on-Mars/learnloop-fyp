import LeaderboardService from './LeaderboardService.js';
import ErrorLoggingService from './ErrorLoggingService.js';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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
   * Calculate ms until next Monday 00:00 UTC.
   * If it's exactly Monday 00:00 UTC, returns ONE_WEEK_MS (schedule for next week).
   */
  static _msUntilNextMondayUTC(now = new Date()) {
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;

    const nextMonday = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday
    ));

    const ms = nextMonday.getTime() - now.getTime();
    return ms <= 0 ? ONE_WEEK_MS : ms;
  }

  /**
   * Execute the weekly reset and log the outcome.
   */
  async _runReset() {
    try {
      await ErrorLoggingService.logSystemEvent('weekly_reset_started', {
        timestamp: new Date().toISOString()
      });

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
   * Start the scheduler. First aligns to next Monday 00:00 UTC,
   * then repeats every 7 days.
   */
  start() {
    const delay = WeeklyResetScheduler._msUntilNextMondayUTC();
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
