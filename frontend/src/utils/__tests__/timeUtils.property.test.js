import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getRelativeTime, formatTimestamp } from '../timeUtils';

// Feature: reflection-feature, Property 10: Timestamps Stored in UTC
describe('timeUtils - Property-Based Tests', () => {
  it('Property 10: getRelativeTime handles UTC timestamps correctly', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (randomDate) => {
          // Convert to UTC timestamp
          const utcTimestamp = randomDate.toISOString();
          
          // getRelativeTime should handle UTC timestamps without errors
          const result = getRelativeTime(utcTimestamp);
          
          // Result should be a non-empty string
          expect(result).toBeTruthy();
          expect(typeof result).toBe('string');
          
          // Result should match expected format patterns
          const validPatterns = [
            /^just now$/,
            /^\d+ minutes? ago$/,
            /^\d+ hours? ago$/,
            /^\d+ days? ago$/
          ];
          
          const matchesPattern = validPatterns.some(pattern => pattern.test(result));
          expect(matchesPattern).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10: formatTimestamp handles UTC timestamps correctly', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (randomDate) => {
          // Convert to UTC timestamp
          const utcTimestamp = randomDate.toISOString();
          
          // formatTimestamp should handle UTC timestamps without errors
          const result = formatTimestamp(utcTimestamp);
          
          // Result should be a non-empty string
          expect(result).toBeTruthy();
          expect(typeof result).toBe('string');
          
          // Result should contain date components
          expect(result).toMatch(/\d{4}/); // Year
          expect(result).toMatch(/\d{1,2}:\d{2}/); // Time
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: getRelativeTime calculations are consistent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 * 24 * 60 * 60 * 1000 }), // Up to 1 year in ms
        (offsetMs) => {
          const now = new Date();
          const pastDate = new Date(now.getTime() - offsetMs);
          
          const result = getRelativeTime(pastDate);
          
          const diffSeconds = Math.floor(offsetMs / 1000);
          const diffMinutes = Math.floor(diffSeconds / 60);
          const diffHours = Math.floor(diffMinutes / 60);
          const diffDays = Math.floor(diffHours / 24);
          
          // Verify the result matches the expected time range
          if (diffSeconds < 60) {
            expect(result).toBe('just now');
          } else if (diffMinutes < 60) {
            expect(result).toMatch(/^\d+ minutes? ago$/);
            const extractedMinutes = parseInt(result.match(/\d+/)[0]);
            expect(extractedMinutes).toBe(diffMinutes);
          } else if (diffHours < 24) {
            expect(result).toMatch(/^\d+ hours? ago$/);
            const extractedHours = parseInt(result.match(/\d+/)[0]);
            expect(extractedHours).toBe(diffHours);
          } else {
            expect(result).toMatch(/^\d+ days? ago$/);
            const extractedDays = parseInt(result.match(/\d+/)[0]);
            expect(extractedDays).toBe(diffDays);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
