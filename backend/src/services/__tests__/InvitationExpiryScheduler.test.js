import InvitationExpiryScheduler from '../InvitationExpiryScheduler.js';

describe('InvitationExpiryScheduler', () => {
  afterEach(() => {
    // Clean up any running schedulers
    InvitationExpiryScheduler.stop();
  });

  describe('_msUntilNextMidnightUTC', () => {
    it('should calculate correct milliseconds until next midnight UTC', () => {
      // Test with a specific date: 2024-01-15 14:30:00 UTC
      const testDate = new Date('2024-01-15T14:30:00.000Z');
      const result = InvitationExpiryScheduler.constructor._msUntilNextMidnightUTC(testDate);
      
      // Next midnight should be 2024-01-16 00:00:00 UTC
      // That's 9.5 hours = 9.5 * 60 * 60 * 1000 = 34,200,000 ms
      const expected = 9.5 * 60 * 60 * 1000;
      expect(result).toBe(expected);
    });

    it('should return ONE_DAY_MS if exactly at midnight UTC', () => {
      const testDate = new Date('2024-01-15T00:00:00.000Z');
      const result = InvitationExpiryScheduler.constructor._msUntilNextMidnightUTC(testDate);
      
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      expect(result).toBe(ONE_DAY_MS);
    });

    it('should handle end of month correctly', () => {
      // Test with January 31st
      const testDate = new Date('2024-01-31T23:59:59.999Z');
      const result = InvitationExpiryScheduler.constructor._msUntilNextMidnightUTC(testDate);
      
      // Should be 1 millisecond until February 1st midnight
      expect(result).toBe(1);
    });
  });

  describe('start and stop', () => {
    it('should start and stop without errors', () => {
      expect(() => {
        InvitationExpiryScheduler.start();
        InvitationExpiryScheduler.stop();
      }).not.toThrow();
    });

    it('should handle multiple stop calls gracefully', () => {
      expect(() => {
        InvitationExpiryScheduler.start();
        InvitationExpiryScheduler.stop();
        InvitationExpiryScheduler.stop(); // Second stop should not throw
      }).not.toThrow();
    });
  });
});