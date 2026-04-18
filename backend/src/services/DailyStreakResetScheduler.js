import StreakService from './StreakService.js';
import ErrorLoggingService from './ErrorLoggingService.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * DailyStreakResetScheduler - Runs StreakService.resetExpiredStreaks()
 * every day at 00:00 UTC to ensure streaks are reset when users miss days.
 */
class DailyStreakResetScheduler {
  constructor() {
    this._alignTimeout = null;
    this._dailyInterval = null;
  }

  /**
   * Calculate ms until next midnight UTC.
   * If it's exactly midnight UTC, returns ONE_DAY_MS (schedule for next day).
   */
  static _msUntilNextMidnightUTC(now = new Date()) {
    const nextMidnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));

    const ms = nextMidnight.getTime() - now.getTime();
    return ms <= 0 ? ONE_DAY_MS : ms;
  }

  /**
   * Execute the daily streak reset and log the outcome.
   */
  async _runReset() {
    try {
      await ErrorLoggingService.logSystemEvent('daily_streak_reset_started', {
        timestamp: new Date().toISOString()
      });

      const result = await StreakService.resetExpiredStreaks();

      await ErrorLoggingService.logSystemEvent('daily_streak_reset_success', {
        resetCount: result.resetCount,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Daily streak reset completed — ${result.resetCount} streaks reset`);
    } catch (error) {
      await ErrorLoggingService.logError(
        { message: `Daily streak reset error: ${error.message}`, category: 'scheduler', code: 'DAILY_STREAK_RESET_FAILED' },
        { operation: 'DailyStreakResetScheduler._runReset' }
      );
      console.error('❌ Daily streak reset failed:', error.message);
    }
  }

  /**
   * Start the scheduler. First aligns to next midnight UTC,
   * then repeats every 24 hours.
   */
  start() {
    const delay = DailyStreakResetScheduler._msUntilNextMidnightUTC();
    const nextRun = new Date(Date.now() + delay);

    console.log(`⏰ Daily streak reset scheduled — next run: ${nextRun.toISOString()}`);

    this._alignTimeout = setTimeout(async () => {
      await this._runReset();

      this._dailyInterval = setInterval(() => {
        this._runReset();
      }, ONE_DAY_MS);
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
    if (this._dailyInterval) {
      clearInterval(this._dailyInterval);
      this._dailyInterval = null;
    }
  }
}

export default new DailyStreakResetScheduler();
