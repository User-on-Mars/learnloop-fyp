import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { MoodSelector } from '../MoodSelector';
import { TagManager } from '../TagManager';

// Feature: reflection-feature, Property 3: Tag Management Consistency
// Validates: Requirements 3.1, 3.2, 3.3, 3.4
describe('Property 3: Tag Management Consistency', () => {
  it('should maintain consistent tag state through additions and removals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          action: fc.constantFrom('add', 'remove'),
          tag: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }), { minLength: 1, maxLength: 10 }),
        async (operations) => {
          // Clean up before each iteration to prevent DOM accumulation
          cleanup();
          
          const tags = [];

          const onTagAdd = (tag) => {
            tags.push(tag);
          };

          const onTagRemove = (tag) => {
            const index = tags.indexOf(tag);
            if (index > -1) {
              tags.splice(index, 1);
            }
          };

          const { rerender } = render(
            <TagManager tags={[]} onTagAdd={onTagAdd} onTagRemove={onTagRemove} />
          );

          const user = userEvent.setup();

          for (const op of operations) {
            if (op.action === 'add') {
              const input = screen.getByPlaceholderText(/add a tag/i);
              await user.clear(input);
              await user.type(input, op.tag);
              await user.keyboard('{Enter}');
              
              rerender(
                <TagManager tags={[...tags]} onTagAdd={onTagAdd} onTagRemove={onTagRemove} />
              );
            } else if (op.action === 'remove' && tags.length > 0) {
              rerender(
                <TagManager tags={[...tags]} onTagAdd={onTagAdd} onTagRemove={onTagRemove} />
              );
              
              const removeButtons = screen.queryAllByLabelText(/remove .* tag/i);
              if (removeButtons.length > 0) {
                await user.click(removeButtons[0]);
              }
            }
          }

          // Verify final state consistency
          const expectedTags = [];
          for (const op of operations) {
            if (op.action === 'add') {
              expectedTags.push(op.tag);
            } else if (op.action === 'remove' && expectedTags.length > 0) {
              expectedTags.shift();
            }
          }

          expect(tags).toEqual(expectedTags);
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 15000);
});

// Feature: reflection-feature, Property 4: Mood Selection Updates State
// Validates: Requirements 1.3, 2.4, 7.5
describe('Property 4: Mood Selection Updates State', () => {
  it('should update state correctly for any sequence of mood selections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom('Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful'),
          { minLength: 1, maxLength: 10 }
        ),
        async (moodSequence) => {
          // Clean up before each iteration to prevent DOM accumulation
          cleanup();
          
          let currentMood = null;
          const moodHistory = [];

          const onMoodSelect = (mood) => {
            currentMood = mood;
            moodHistory.push(mood);
          };

          const { rerender } = render(
            <MoodSelector selectedMood={currentMood} onMoodSelect={onMoodSelect} />
          );

          const user = userEvent.setup();

          for (const mood of moodSequence) {
            const button = screen.getByLabelText(`Select ${mood} mood`);
            await user.click(button);
            
            rerender(
              <MoodSelector selectedMood={currentMood} onMoodSelect={onMoodSelect} />
            );

            // Verify the button shows selected state
            expect(button).toHaveAttribute('aria-pressed', 'true');
            
            // Verify the mood emoji is visible in the button
            const moodEmojis = {
              'Happy': '😊',
              'Neutral': '😐',
              'Sad': '😢',
              'Energized': '⚡',
              'Thoughtful': '🤔'
            };
            expect(button).toHaveTextContent(moodEmojis[mood]);
          }

          // Verify final state matches last selection
          expect(currentMood).toBe(moodSequence[moodSequence.length - 1]);
          expect(moodHistory).toEqual(moodSequence);
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 15000);
});
