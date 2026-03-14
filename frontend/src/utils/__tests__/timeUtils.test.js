import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRelativeTime, formatTimestamp } from '../timeUtils';

describe('timeUtils - Unit Tests', () => {
  let mockNow;

  beforeEach(() => {
    // Set a fixed "now" time for consistent testing
    mockNow = new Date('2024-02-08T12:00:00Z');
    vi.setSystemTime(mockNow);
  });

  describe('getRelativeTime', () => {
    it('should return "just now" for timestamps less than 1 minute ago', () => {
      const timestamp = new Date('2024-02-08T11:59:30Z'); // 30 seconds ago
      expect(getRelativeTime(timestamp)).toBe('just now');
    });

    it('should return "just now" for timestamps exactly 0 seconds ago', () => {
      const timestamp = new Date('2024-02-08T12:00:00Z'); // now
      expect(getRelativeTime(timestamp)).toBe('just now');
    });

    it('should return "X minutes ago" for timestamps 1-59 minutes old', () => {
      const oneMinuteAgo = new Date('2024-02-08T11:59:00Z');
      expect(getRelativeTime(oneMinuteAgo)).toBe('1 minute ago');

      const twoMinutesAgo = new Date('2024-02-08T11:58:00Z');
      expect(getRelativeTime(twoMinutesAgo)).toBe('2 minutes ago');

      const thirtyMinutesAgo = new Date('2024-02-08T11:30:00Z');
      expect(getRelativeTime(thirtyMinutesAgo)).toBe('30 minutes ago');

      const fiftyNineMinutesAgo = new Date('2024-02-08T11:01:00Z');
      expect(getRelativeTime(fiftyNineMinutesAgo)).toBe('59 minutes ago');
    });

    it('should return "X hours ago" for timestamps 1-23 hours old', () => {
      const oneHourAgo = new Date('2024-02-08T11:00:00Z');
      expect(getRelativeTime(oneHourAgo)).toBe('1 hour ago');

      const twoHoursAgo = new Date('2024-02-08T10:00:00Z');
      expect(getRelativeTime(twoHoursAgo)).toBe('2 hours ago');

      const twelveHoursAgo = new Date('2024-02-08T00:00:00Z');
      expect(getRelativeTime(twelveHoursAgo)).toBe('12 hours ago');

      const twentyThreeHoursAgo = new Date('2024-02-07T13:00:00Z');
      expect(getRelativeTime(twentyThreeHoursAgo)).toBe('23 hours ago');
    });

    it('should return "X days ago" for timestamps 24+ hours old', () => {
      const oneDayAgo = new Date('2024-02-07T12:00:00Z');
      expect(getRelativeTime(oneDayAgo)).toBe('1 day ago');

      const twoDaysAgo = new Date('2024-02-06T12:00:00Z');
      expect(getRelativeTime(twoDaysAgo)).toBe('2 days ago');

      const sevenDaysAgo = new Date('2024-02-01T12:00:00Z');
      expect(getRelativeTime(sevenDaysAgo)).toBe('7 days ago');

      const thirtyDaysAgo = new Date('2024-01-09T12:00:00Z');
      expect(getRelativeTime(thirtyDaysAgo)).toBe('30 days ago');
    });

    it('should handle string timestamps', () => {
      const timestamp = '2024-02-08T11:58:00Z';
      expect(getRelativeTime(timestamp)).toBe('2 minutes ago');
    });

    it('should handle Date objects', () => {
      const timestamp = new Date('2024-02-08T11:58:00Z');
      expect(getRelativeTime(timestamp)).toBe('2 minutes ago');
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp as human-readable date string', () => {
      const timestamp = new Date('2024-02-08T15:45:00Z');
      const result = formatTimestamp(timestamp);
      
      // Check that result contains expected components
      expect(result).toContain('2024');
      expect(result).toMatch(/February|Feb/);
      expect(result).toContain('8');
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Time format
    });

    it('should handle string timestamps', () => {
      const timestamp = '2024-02-08T15:45:00Z';
      const result = formatTimestamp(timestamp);
      
      expect(result).toContain('2024');
      expect(result).toMatch(/February|Feb/);
    });

    it('should handle Date objects', () => {
      const timestamp = new Date('2024-02-08T15:45:00Z');
      const result = formatTimestamp(timestamp);
      
      expect(result).toContain('2024');
      expect(result).toMatch(/February|Feb/);
    });

    it('should format with 12-hour time format', () => {
      const morningTime = new Date('2024-02-08T09:30:00Z');
      const morningResult = formatTimestamp(morningTime);
      expect(morningResult).toMatch(/AM|PM/);

      const eveningTime = new Date('2024-02-08T21:30:00Z');
      const eveningResult = formatTimestamp(eveningTime);
      expect(eveningResult).toMatch(/AM|PM/);
    });
  });
});
