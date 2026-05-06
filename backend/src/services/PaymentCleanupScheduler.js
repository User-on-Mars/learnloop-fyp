import Payment from '../models/Payment.js';
import ErrorLoggingService from './ErrorLoggingService.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const EXPIRY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * PaymentCleanupScheduler - Marks stale PENDING payments as EXPIRED.
 * 
 * Runs every hour and expires any payment that has been in PENDING status
 * for more than 24 hours (meaning the user abandoned the eSewa checkout).
 */
class PaymentCleanupScheduler {
  constructor() {
    this._interval = null;
  }

  /**
   * Expire stale pending payments older than 24 hours.
   * Returns the count of expired records.
   */
  async _runCleanup() {
    try {
      const cutoff = new Date(Date.now() - EXPIRY_THRESHOLD_MS);

      const result = await Payment.updateMany(
        {
          status: 'PENDING',
          createdAt: { $lt: cutoff },
        },
        {
          $set: { status: 'EXPIRED' },
        }
      );

      const expiredCount = result.modifiedCount || 0;

      if (expiredCount > 0) {
        console.log(`🧹 Payment cleanup: marked ${expiredCount} stale payment(s) as EXPIRED`);
        await ErrorLoggingService.logSystemEvent('payment_cleanup_completed', {
          expiredCount,
          cutoffDate: cutoff.toISOString(),
          timestamp: new Date().toISOString(),
        });
      }

      return expiredCount;
    } catch (error) {
      console.error('❌ Payment cleanup failed:', error.message);
      await ErrorLoggingService.logError(error, {
        operation: 'PaymentCleanupScheduler._runCleanup',
      });
      return 0;
    }
  }

  /**
   * Start the scheduler. Runs immediately on start, then every hour.
   */
  start() {
    // Run once immediately on startup
    this._runCleanup();

    // Then run every hour
    this._interval = setInterval(() => {
      this._runCleanup();
    }, ONE_HOUR_MS);

    console.log('⏰ Payment cleanup scheduler started (runs every hour)');
  }

  /**
   * Stop the scheduler.
   */
  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}

export default new PaymentCleanupScheduler();
