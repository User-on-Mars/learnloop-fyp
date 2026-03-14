import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoodSelector } from '../MoodSelector';
import { TagManager } from '../TagManager';
import { LivePreview } from '../LivePreview';

describe('MoodSelector', () => {
  // Requirements: 2.1, 2.2, 2.3
  it('should render all five mood options', () => {
    const onMoodSelect = vi.fn();
    render(<MoodSelector selectedMood={null} onMoodSelect={onMoodSelect} />);

    expect(screen.getByLabelText('Select Happy mood')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Neutral mood')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Sad mood')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Energized mood')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Thoughtful mood')).toBeInTheDocument();
  });

  it('should display emoji icons for each mood', () => {
    const onMoodSelect = vi.fn();
    render(<MoodSelector selectedMood={null} onMoodSelect={onMoodSelect} />);

    expect(screen.getByText('😊')).toBeInTheDocument();
    expect(screen.getByText('😐')).toBeInTheDocument();
    expect(screen.getByText('😢')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
    expect(screen.getByText('🤔')).toBeInTheDocument();
  });

  it('should call onMoodSelect when a mood is clicked', async () => {
    const onMoodSelect = vi.fn();
    render(<MoodSelector selectedMood={null} onMoodSelect={onMoodSelect} />);
    const user = userEvent.setup();

    const happyButton = screen.getByLabelText('Select Happy mood');
    await user.click(happyButton);

    expect(onMoodSelect).toHaveBeenCalledWith('Happy');
  });

  it('should show visual feedback for selected mood', () => {
    const onMoodSelect = vi.fn();
    render(<MoodSelector selectedMood="Happy" onMoodSelect={onMoodSelect} />);

    const happyButton = screen.getByLabelText('Select Happy mood');
    expect(happyButton).toHaveAttribute('aria-pressed', 'true');
    expect(happyButton).toHaveClass('border-ll-600', 'bg-ll-50');
  });

  it('should not show visual feedback for unselected moods', () => {
    const onMoodSelect = vi.fn();
    render(<MoodSelector selectedMood="Happy" onMoodSelect={onMoodSelect} />);

    const sadButton = screen.getByLabelText('Select Sad mood');
    expect(sadButton).toHaveAttribute('aria-pressed', 'false');
    expect(sadButton).toHaveClass('border-gray-200');
  });
});

describe('TagManager', () => {
  // Requirements: 3.1, 3.2, 3.3
  it('should add a tag when Enter is pressed', async () => {
    const onTagAdd = vi.fn();
    const onTagRemove = vi.fn();
    render(<TagManager tags={[]} onTagAdd={onTagAdd} onTagRemove={onTagRemove} />);
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/add a tag/i);
    await user.type(input, 'practice');
    await user.keyboard('{Enter}');

    expect(onTagAdd).toHaveBeenCalledWith('practice');
  });

  it('should clear input after adding a tag', async () => {
    const onTagAdd = vi.fn();
    const onTagRemove = vi.fn();
    render(<TagManager tags={[]} onTagAdd={onTagAdd} onTagRemove={onTagRemove} />);
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/add a tag/i);
    await user.type(input, 'practice');
    await user.keyboard('{Enter}');

    expect(input).toHaveValue('');
  });

  it('should not add empty tags', async () => {
    const onTagAdd = vi.fn();
    const onTagRemove = vi.fn();
    render(<TagManager tags={[]} onTagAdd={onTagAdd} onTagRemove={onTagRemove} />);
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/add a tag/i);
    await user.type(input, '   ');
    await user.keyboard('{Enter}');

    expect(onTagAdd).not.toHaveBeenCalled();
  });

  it('should display added tags', () => {
    const onTagAdd = vi.fn();
    const onTagRemove = vi.fn();
    render(<TagManager tags={['practice', 'guitar']} onTagAdd={onTagAdd} onTagRemove={onTagRemove} />);

    expect(screen.getByText('practice')).toBeInTheDocument();
    expect(screen.getByText('guitar')).toBeInTheDocument();
  });

  it('should call onTagRemove when remove button is clicked', async () => {
    const onTagAdd = vi.fn();
    const onTagRemove = vi.fn();
    render(<TagManager tags={['practice']} onTagAdd={onTagAdd} onTagRemove={onTagRemove} />);
    const user = userEvent.setup();

    const removeButton = screen.getByLabelText('Remove practice tag');
    await user.click(removeButton);

    expect(onTagRemove).toHaveBeenCalledWith('practice');
  });

  it('should trim whitespace from tags', async () => {
    const onTagAdd = vi.fn();
    const onTagRemove = vi.fn();
    render(<TagManager tags={[]} onTagAdd={onTagAdd} onTagRemove={onTagRemove} />);
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/add a tag/i);
    await user.type(input, '  practice  ');
    await user.keyboard('{Enter}');

    expect(onTagAdd).toHaveBeenCalledWith('practice');
  });

  it('should enforce max length of 50 characters', async () => {
    const onTagAdd = vi.fn();
    const onTagRemove = vi.fn();
    render(<TagManager tags={[]} onTagAdd={onTagAdd} onTagRemove={onTagRemove} />);
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/add a tag/i);
    const longTag = 'a'.repeat(60);
    await user.type(input, longTag);

    // Input should be limited to 50 characters
    expect(input).toHaveValue('a'.repeat(50));
  });
});

describe('LivePreview', () => {
  // Requirements: 7.2
  it('should display reflection content', () => {
    render(<LivePreview content="This is my reflection" mood={null} tags={[]} lastUpdated={null} />);

    expect(screen.getByText('This is my reflection')).toBeInTheDocument();
  });

  it('should display placeholder when content is empty', () => {
    render(<LivePreview content="" mood={null} tags={[]} lastUpdated={null} />);

    expect(screen.getByText(/start typing to see your reflection preview/i)).toBeInTheDocument();
  });

  it('should display mood emoji when mood is selected', () => {
    render(<LivePreview content="Test" mood="Happy" tags={[]} lastUpdated={null} />);

    expect(screen.getByText('😊')).toBeInTheDocument();
    expect(screen.getByText('Happy')).toBeInTheDocument();
  });

  it('should not display mood section when mood is null', () => {
    render(<LivePreview content="Test" mood={null} tags={[]} lastUpdated={null} />);

    expect(screen.queryByText('😊')).not.toBeInTheDocument();
  });

  it('should display tags as badges', () => {
    render(<LivePreview content="Test" mood={null} tags={['practice', 'guitar']} lastUpdated={null} />);

    expect(screen.getByText('practice')).toBeInTheDocument();
    expect(screen.getByText('guitar')).toBeInTheDocument();
  });

  it('should not display tags section when tags array is empty', () => {
    const { container } = render(<LivePreview content="Test" mood={null} tags={[]} lastUpdated={null} />);

    const tagBadges = container.querySelectorAll('.bg-ll-100');
    expect(tagBadges.length).toBe(0);
  });

  it('should display "just now" for recent timestamps', () => {
    const now = new Date();
    render(<LivePreview content="Test" mood={null} tags={[]} lastUpdated={now} />);

    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it('should display relative time for older timestamps', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    render(<LivePreview content="Test" mood={null} tags={[]} lastUpdated={twoHoursAgo} />);

    expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
  });

  it('should preserve whitespace and line breaks in content', () => {
    const content = 'Line 1\nLine 2\n\nLine 3';
    render(<LivePreview content={content} mood={null} tags={[]} lastUpdated={null} />);

    const contentElement = screen.getByText(/Line 1/);
    expect(contentElement).toHaveClass('whitespace-pre-wrap');
  });
});
