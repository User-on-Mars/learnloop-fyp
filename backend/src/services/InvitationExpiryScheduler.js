import InvitationService from './InvitationService.js';
import ErrorLoggingService from './ErrorLoggingService.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * InvitationExpiryScheduler - Runs InvitationService.expireInvitations()
 * every day at 00:00 UTC to expire pending invitations past their expiration date.
 * Requirements: 7.6-7.7
 */
class InvitationExpiryScheduler {
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
   * Execute the invitation expiry job and log the outcome.
   * Requirements: 7.6-7.7
   */
  async _runExpiryJob() {
    try {
      await ErrorLoggingService.logSystemEvent('invitation_expiry_job_started', {
        timestamp: new Date().toISOString()
      });

      const result = await InvitationService.expireInvitations();

      await ErrorLoggingService.logSystemEvent('invitation_expiry_job_success', {
        expiredCount: result.expiredCount,
        timestamp: result.timestamp
      });

      console.log(`✅ Invitation expiry job completed — ${result.expiredCount} invitations expired`);
    } catch (error) {
      await ErrorLoggingService.logError(
        { 
          message: `Invitation expiry job error: ${error.message}`, 
          category: 'scheduler', 
          code: 'INVITATION_EXPIRY_JOB_FAILED' 
        },
        { operation: 'InvitationExpiryScheduler._runExpiryJob' }
      );
      console.error('❌ Invitation expiry job failed:', error.message);
    }
  }

  /**
   * Start the scheduler. First aligns to next midnight UTC,
   * then repeats every 24 hours.
   * Requirements: 7.6
   */
  start() {
    const delay = InvitationExpiryScheduler._msUntilNextMidnightUTC();
    const nextRun = new Date(Date.now() + delay);

    console.log(`⏰ Invitation expiry job scheduled — next run: ${nextRun.toISOString()}`);

    this._alignTimeout = setTimeout(async () => {
      await this._runExpiryJob();

      this._dailyInterval = setInterval(() => {
        this._runExpiryJob();
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

export default new InvitationExpiryScheduler();