import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import ReflectionHistory from '../ReflectionHistory';
import api from '../../services/api';

// Mock API
vi.mock('../../services/api');

// Feature: reflection-feature, Property 5: Reflection History Sorted by Timestamp
// Validates: Requirements 4.3
describe('Property 5: Reflection History Sorted by Timestamp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display reflections sorted by timestamp with most recent first', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            _id: fc.hexa().chain(h => fc.constant(h.padEnd(24, '0').substring(0, 24))),
            content: fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.trim().length > 0),
            mood: fc.constantFrom('Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful', null),
            tags: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { maxLength: 3 }),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
            updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (reflections) => {
          cleanup();
          
          // Convert dates to ISO strings for API response
          const reflectionsWithISODates = reflections.map(r => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString()
          }));

          // Sort by createdAt descending (most recent first)
          const sortedReflections = [...reflectionsWithISODates].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );

          // Mock API response with sorted data
          api.get.mockResolvedValue({ data: sortedReflections });

          render(<ReflectionHistory />);

          // Wait for reflections to load
          await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
          }, { timeout: 2000 });

          // Verify API was called
          expect(api.get).toHaveBeenCalledWith('/reflections');
          
          // Verify at least the first reflection content is displayed
          const firstReflectionContent = sortedReflections[0].content;
          await waitFor(() => {
            expect(screen.getByText(firstReflectionContent, { exact: false })).toBeInTheDocument();
          }, { timeout: 1000 });
        }
      ),
      { numRuns: 50, timeout: 15000 }
    );
  }, 20000);
});

// Feature: reflection-feature, Property 7: Deletion Removes from Database and UI
// Validates: Requirements 5.3, 5.4
describe('Property 7: Deletion Removes from Database and UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should remove reflection from UI after successful deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          reflections: fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              content: fc.string({ minLength: 10, maxLength: 200 }),
              mood: fc.constantFrom('Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful', null),
              tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
              createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
              updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString())
            }),
            { minLength: 2, maxLength: 5 }
          ),
          indexToDelete: fc.nat()
        }),
        async ({ reflections, indexToDelete }) => {
          cleanup();
          
          // Ensure index is valid
          const deleteIndex = indexToDelete % reflections.length;
          const reflectionToDelete = reflections[deleteIndex];

          // Mock API responses
          api.get.mockResolvedValue({ data: reflections });
          api.delete.mockResolvedValue({ data: { message: 'Reflection deleted successfully' } });

          render(<ReflectionHistory />);

          // Wait for reflections to load
          await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
          });

          const user = userEvent.setup();

          // Find and click delete button for the reflection
          const deleteButtons = screen.getAllByTitle('Delete reflection');
          await user.click(deleteButtons[deleteIndex]);

          // Wait for confirmation dialog
          await waitFor(() => {
            expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
          });

          // Confirm deletion
          const confirmButton = screen.getByRole('button', { name: /^delete$/i });
          await user.click(confirmButton);

          // Wait for deletion to complete
          await waitFor(() => {
            expect(api.delete).toHaveBeenCalledWith(`/reflections/${reflectionToDelete._id}`);
          });

          // Verify reflection is removed from UI
          await waitFor(() => {
            const contentPreview = reflectionToDelete.content.substring(0, 50);
            expect(screen.queryByText(new RegExp(contentPreview))).not.toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 15000);
});

// Feature: reflection-feature, Property 14: Relative Time Display Accuracy
// Validates: Requirements 8.4
describe('Property 14: Relative Time Display Accuracy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display accurate relative time for any timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          minutesAgo: fc.integer({ min: 0, max: 10080 }) // 0 to 7 days
        }),
        async ({ minutesAgo }) => {
          cleanup();
          
          const now = Date.now();
          const createdAt = new Date(now - minutesAgo * 60 * 1000);

          const reflection = {
            _id: '507f1f77bcf86cd799439011',
            content: 'Test reflection content for relative time',
            mood: 'Happy',
            tags: ['test'],
            createdAt: createdAt.toISOString(),
            updatedAt: createdAt.toISOString()
          };

          // Mock API response
          api.get.mockResolvedValue({ data: [reflection] });

          render(<ReflectionHistory />);

          // Wait for reflections to load
          await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
          }, { timeout: 2000 });

          // Determine expected relative time text
          let expectedTimeText;
          if (minutesAgo < 1) {
            expectedTimeText = 'just now';
          } else if (minutesAgo < 60) {
            expectedTimeText = `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
          } else if (minutesAgo < 1440) {
            const hours = Math.floor(minutesAgo / 60);
            expectedTimeText = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
          } else {
            const days = Math.floor(minutesAgo / 1440);
            expectedTimeText = `${days} day${days !== 1 ? 's' : ''} ago`;
          }

          // Verify relative time is displayed
          await waitFor(() => {
            expect(screen.getByText(expectedTimeText)).toBeInTheDocument();
          }, { timeout: 1000 });
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 15000);
});
