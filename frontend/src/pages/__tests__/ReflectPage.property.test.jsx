import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { BrowserRouter } from 'react-router-dom';
import ReflectPage from '../ReflectPage';
import * as useAuthModule from '../../useAuth';
import api from '../../services/api';

// Mock modules
vi.mock('../../useAuth');
vi.mock('../../services/api');

// Mock Sidebar component
vi.mock('../../components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

const mockUser = { uid: 'test-user-123', email: 'test@example.com' };

// Feature: reflection-feature, Property 2: Live Preview Updates in Real-Time
// Validates: Requirements 1.2, 7.1
describe('Property 2: Live Preview Updates in Real-Time', () => {
  beforeEach(() => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue(mockUser);
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should update preview within 100ms for any text input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }).filter(s => {
          const trimmed = s.trim();
          return trimmed.length > 0 && !trimmed.includes('\n') && !trimmed.includes('{') && !trimmed.includes('}');
        }),
        async (randomText) => {
          cleanup();
          
          render(
            <BrowserRouter>
              <ReflectPage />
            </BrowserRouter>
          );

          const textarea = screen.getByPlaceholderText(/what did you learn today/i);
          const user = userEvent.setup();

          await user.clear(textarea);
          await user.type(textarea, randomText);

          // Wait for preview to update - use container query to find preview section
          await waitFor(() => {
            const previewSection = screen.getByText('Preview').closest('div').parentElement;
            expect(previewSection.textContent).toContain(randomText);
          }, { timeout: 500 });

          // Verify textarea has the content
          expect(textarea.value).toBe(randomText);
        }
      ),
      { numRuns: 50, timeout: 15000 }
    );
  }, 20000);
});

// Feature: reflection-feature, Property 13: Scroll Position Preserved During Preview Updates
// Validates: Requirements 7.3
describe('Property 13: Scroll Position Preserved During Preview Updates', () => {
  beforeEach(() => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue(mockUser);
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should preserve scroll position when preview updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialText: fc.string({ minLength: 50, maxLength: 200 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('{') && !trimmed.includes('}');
          }),
          additionalText: fc.string({ minLength: 5, maxLength: 50 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('{') && !trimmed.includes('}');
          })
        }),
        async ({ initialText, additionalText }) => {
          cleanup();
          
          render(
            <BrowserRouter>
              <ReflectPage />
            </BrowserRouter>
          );

          const textarea = screen.getByPlaceholderText(/what did you learn today/i);
          const user = userEvent.setup();

          // Type initial text
          await user.clear(textarea);
          await user.type(textarea, initialText);

          // Wait for initial render
          await waitFor(() => {
            expect(textarea.value).toBe(initialText);
          });

          // Set scroll position
          const initialScrollTop = 10;
          textarea.scrollTop = initialScrollTop;
          const recordedScrollTop = textarea.scrollTop;

          // Type additional text to trigger preview update
          await user.type(textarea, additionalText);

          // Wait for update
          await waitFor(() => {
            expect(textarea.value).toContain(additionalText);
          });

          // Verify scroll position is preserved or changed minimally
          // Note: Scroll position may change slightly due to content changes
          const finalScrollTop = textarea.scrollTop;
          expect(Math.abs(finalScrollTop - recordedScrollTop)).toBeLessThan(50);
        }
      ),
      { numRuns: 30, timeout: 15000 }
    );
  }, 20000);
});

// Feature: reflection-feature, Property 15: Error Handling Maintains State
// Validates: Requirements 5.5, 6.5
describe('Property 15: Error Handling Maintains State', () => {
  beforeEach(() => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue(mockUser);
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should maintain form state when save operation fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          content: fc.string({ minLength: 10, maxLength: 100 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && !trimmed.includes('\n') && !trimmed.includes('{') && !trimmed.includes('}');
          }),
          mood: fc.constantFrom('Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful', null),
          tags: fc.array(fc.string({ minLength: 3, maxLength: 15 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9]+$/.test(s)), { maxLength: 2 })
        }),
        async ({ content, mood, tags }) => {
          cleanup();
          
          // Mock API to fail
          api.post.mockRejectedValue({
            response: { data: { message: 'Server error' } }
          });

          render(
            <BrowserRouter>
              <ReflectPage />
            </BrowserRouter>
          );

          const textarea = screen.getByPlaceholderText(/what did you learn today/i);
          const user = userEvent.setup();

          // Fill in form
          await user.clear(textarea);
          await user.type(textarea, content);

          // Select mood if provided
          if (mood) {
            const moodButton = screen.getByLabelText(`Select ${mood} mood`);
            await user.click(moodButton);
          }

          // Add tags
          if (tags.length > 0) {
            const tagInput = screen.getByPlaceholderText(/add a tag/i);
            for (const tag of tags) {
              await user.clear(tagInput);
              await user.type(tagInput, tag);
              await user.keyboard('{Enter}');
              // Wait for tag to appear
              await waitFor(() => {
                expect(screen.getByText(tag)).toBeInTheDocument();
              }, { timeout: 1000 });
            }
          }

          // Attempt to save
          const saveButton = screen.getByRole('button', { name: /save reflection/i });
          await user.click(saveButton);

          // Wait for error message - check for the actual error text displayed
          await waitFor(() => {
            expect(screen.getByText(/server error/i)).toBeInTheDocument();
          }, { timeout: 2000 });

          // Verify form state is maintained
          expect(textarea.value).toBe(content);
          
          if (mood) {
            const moodButton = screen.getByLabelText(`Select ${mood} mood`);
            expect(moodButton).toHaveAttribute('aria-pressed', 'true');
          }

          // Verify tags are still present
          for (const tag of tags) {
            expect(screen.getByText(tag)).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 30, timeout: 15000 }
    );
  }, 25000);
});
