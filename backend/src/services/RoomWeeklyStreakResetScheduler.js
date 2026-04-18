import RoomXpService from './RoomXpService.js';
import ErrorLoggingService from './ErrorLoggingService.js';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

/**
 * RoomWeeklyStreakResetScheduler - Runs RoomXpService.resetWeeklyStreaks()
 * every Monday at 00:00 UTC using a two-phase timer approach:
 *   1. setTimeout to align to the next Monday 00:00 UTC
 *   2. setInterval every 7 days after that
 * 
 * Requirements: 24.1-24.7
 */
class RoomWeeklyStreakResetScheduler {
  constructor() {
    this._alignTimeout = null;
    this._weeklyInterval = null;
    this._isRunning = false;
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
   * Execute the weekly room streak reset with retry logic.
   * Requirements: 24.1-24.7
   */
  async _runReset() {
    if (this._isRunning) {
      console.log('⚠️ Room weekly streak reset already running, skipping...');
      return;
    }

    this._isRunning = true;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        attempt++;

        // Requirement 24.7: Log job execution for audit purposes
        await ErrorLoggingService.logSystemEvent('room_weekly_streak_reset_started', {
          timestamp: new Date().toISOString(),
          attempt
        });

        // Requirement 24.1: Reset all room streaks every Monday at 00:00 UTC
        const result = await RoomXpService.resetWeeklyStreaks();

        // Requirement 24.7: Log successful execution
        await ErrorLoggingService.logSystemEvent('room_weekly_streak_reset_success', {
          resetCount: result.resetCount,
          timestamp: result.timestamp.toISOString(),
          attempt
        });

        console.log(`✅ Room weekly streak reset completed successfully - ${result.resetCount} streaks reset`);
        
        this._isRunning = false;
        return result;

      } catch (error) {
        console.error(`❌ Room weekly streak reset failed (attempt ${attempt}/${MAX_RETRIES}):`, error.message);

        // Requirement 20.2: Catch and log errors
        await ErrorLoggingService.logError(
          { 
            message: `Room weekly streak reset scheduler error (attempt ${attempt}): ${error.message}`, 
            category: 'scheduler', 
            code: 'ROOM_WEEKLY_STREAK_RESET_FAILED' 
          },
          { 
            operation: 'RoomWeeklyStreakResetScheduler._runReset',
            attempt,
            maxRetries: MAX_RETRIES
          }
        );

        // Requirement 20.2: Retry logic for transient failures
        if (attempt < MAX_RETRIES) {
          console.log(`⏳ Retrying room weekly streak reset in ${RETRY_DELAY_MS / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          // Requirement 20.2: Send alerts if job fails after all retries
          await ErrorLoggingService.logError(
            { 
              message: `Room weekly streak reset scheduler failed after ${MAX_RETRIES} attempts: ${error.message}`, 
              category: 'scheduler', 
              code: 'ROOM_WEEKLY_STREAK_RESET_CRITICAL_FAILURE' 
            },
            { 
              operation: 'RoomWeeklyStreakResetScheduler._runReset',
              totalAttempts: attempt,
              isCritical: true
            }
          );
        }
      }
    }

    this._isRunning = false;
  }

  /**
   * Start the scheduler. First aligns to next Monday 00:00 UTC,
   * then repeats every 7 days.
   * Requirements: 24.1
   */
  start() {
    if (this._alignTimeout || this._weeklyInterval) {
      console.log('⚠️ Room weekly streak reset scheduler is already running');
      return;
    }

    const delay = RoomWeeklyStreakResetScheduler._msUntilNextMondayUTC();
    const nextRun = new Date(Date.now() + delay);

    console.log(`⏰ Room weekly streak reset scheduled — next run: ${nextRun.toISOString()}`);

    // Requirement 24.1: Schedule job to run every Monday at 00:00 UTC
    this._alignTimeout = setTimeout(async () => {
      await this._runReset();

      // Set up recurring weekly execution
      this._weeklyInterval = setInterval(() => {
        this._runReset();
      }, ONE_WEEK_MS);
    }, delay);

    // Log scheduler startup
    ErrorLoggingService.logSystemEvent('room_weekly_streak_reset_scheduler_started', {
      nextRun: nextRun.toISOString(),
      delayMs: delay
    });
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

    // Log scheduler shutdown
    ErrorLoggingService.logSystemEvent('room_weekly_streak_reset_scheduler_stopped', {
      timestamp: new Date().toISOString()
    });

    console.log('✅ Room weekly streak reset scheduler stopped');
  }

  /**
   * Get scheduler status for monitoring.
   */
  getStatus() {
    return {
      isScheduled: !!(this._alignTimeout || this._weeklyInterval),
      isRunning: this._isRunning,
      nextRun: this._alignTimeout ? 
        new Date(Date.now() + RoomWeeklyStreakResetScheduler._msUntilNextMondayUTC()).toISOString() : 
        null
    };
  }
}

export default new RoomWeeklyStreakResetScheduler();