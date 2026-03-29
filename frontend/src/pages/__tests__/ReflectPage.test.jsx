import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('ReflectPage', () => {
  beforeEach(() => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue(mockUser);
    vi.clearAllMocks();
  });

  // Test form renders with all components
  // Requirements: 1.1
  it('should render form with all components', () => {
    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    // Check for main heading
    expect(screen.getByText('Reflect')).toBeInTheDocument();
    
    // Check for textarea
    expect(screen.getByPlaceholderText(/what did you learn today/i)).toBeInTheDocument();
    
    // Check for mood selector
    expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Happy mood')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Neutral mood')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Sad mood')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Energized mood')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Thoughtful mood')).toBeInTheDocument();
    
    // Check for tag manager
    expect(screen.getByPlaceholderText(/add a tag/i)).toBeInTheDocument();
    
    // Check for save button
    expect(screen.getByRole('button', { name: /save reflection/i })).toBeInTheDocument();
    
    // Check for preview
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  // Test save button triggers API call
  // Requirements: 1.5
  it('should trigger API call when save button is clicked', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText(/what did you learn today/i);
    const saveButton = screen.getByRole('button', { name: /save reflection/i });

    // Initially button should be disabled
    expect(saveButton).toBeDisabled();

    // Type some content
    await user.type(textarea, 'This is my reflection');

    // Button should now be enabled
    expect(saveButton).not.toBeDisabled();

    // Click save
    await user.click(saveButton);

    // Verify API was called
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/reflections', {
        content: 'This is my reflection',
        mood: null,
        tags: []
      });
    });
  });

  // Test success message displays after save
  // Requirements: 1.6
  it('should display success message after successful save', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText(/what did you learn today/i);
    const saveButton = screen.getByRole('button', { name: /save reflection/i });

    // Type content and save
    await user.type(textarea, 'My reflection');
    await user.click(saveButton);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/reflection saved successfully/i)).toBeInTheDocument();
    });
  });

  // Test error message displays on save failure
  // Requirements: 1.6
  it('should display error message when save fails', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Server error' } }
    });

    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText(/what did you learn today/i);
    const saveButton = screen.getByRole('button', { name: /save reflection/i });

    // Type content and save
    await user.type(textarea, 'My reflection');
    await user.click(saveButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  // Test form state updates on user input
  // Requirements: 1.1
  it('should update form state when user types in textarea', async () => {
    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText(/what did you learn today/i);

    // Type in textarea
    await user.type(textarea, 'Test content');

    // Verify textarea value
    expect(textarea.value).toBe('Test content');

    // Verify character count updates
    expect(screen.getByText(/12 \/ 10,000 characters/i)).toBeInTheDocument();
  });

  it('should update form state when user selects mood', async () => {
    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    const user = userEvent.setup();
    const happyButton = screen.getByLabelText('Select Happy mood');

    // Initially not selected
    expect(happyButton).toHaveAttribute('aria-pressed', 'false');

    // Click mood button
    await user.click(happyButton);

    // Verify mood is selected
    expect(happyButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('should update form state when user adds tags', async () => {
    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    const user = userEvent.setup();
    const tagInput = screen.getByPlaceholderText(/add a tag/i);

    // Add a tag
    await user.type(tagInput, 'practice');
    await user.keyboard('{Enter}');

    // Verify tag appears (appears in both TagManager and LivePreview)
    const tags = screen.getAllByText('practice');
    expect(tags.length).toBeGreaterThan(0);
  });

  it('should not save when content is empty', async () => {
    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    const user = userEvent.setup();
    const saveButton = screen.getByRole('button', { name: /save reflection/i });

    // Button should be disabled when content is empty
    expect(saveButton).toBeDisabled();

    // Try to click (should not work)
    await user.click(saveButton);

    // API should not be called
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should show error when trying to save whitespace-only content', async () => {
    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText(/what did you learn today/i);

    // Type only whitespace
    await user.type(textarea, '   ');

    // Button should still be disabled because content.trim() is empty
    const saveButton = screen.getByRole('button', { name: /save reflection/i });
    expect(saveButton).toBeDisabled();

    // API should not be called
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should include mood and tags in API call when provided', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText(/what did you learn today/i);
    const happyButton = screen.getByLabelText('Select Happy mood');
    const tagInput = screen.getByPlaceholderText(/add a tag/i);
    const saveButton = screen.getByRole('button', { name: /save reflection/i });

    // Fill in form
    await user.type(textarea, 'Great practice session');
    await user.click(happyButton);
    await user.type(tagInput, 'guitar');
    await user.keyboard('{Enter}');
    await user.type(tagInput, 'scales');
    await user.keyboard('{Enter}');

    // Save
    await user.click(saveButton);

    // Verify API call includes all data
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/reflections', {
        content: 'Great practice session',
        mood: 'Happy',
        tags: ['guitar', 'scales']
      });
    });
  });

  it('should clear form after successful save', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    render(
      <BrowserRouter>
        <ReflectPage />
      </BrowserRouter>
    );

    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText(/what did you learn today/i);
    const happyButton = screen.getByLabelText('Select Happy mood');
    const tagInput = screen.getByPlaceholderText(/add a tag/i);
    const saveButton = screen.getByRole('button', { name: /save reflection/i });

    // Fill in form
    await user.type(textarea, 'Test reflection');
    await user.click(happyButton);
    await user.type(tagInput, 'test');
    await user.keyboard('{Enter}');

    // Save
    await user.click(saveButton);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/reflection saved successfully/i)).toBeInTheDocument();
    });

    // Wait for form to clear (happens after 1.5s)
    await waitFor(() => {
      expect(textarea.value).toBe('');
    }, { timeout: 2000 });

    // Mood should be deselected
    expect(happyButton).toHaveAttribute('aria-pressed', 'false');

    // Tags should be cleared
    expect(screen.queryByText('test')).not.toBeInTheDocument();
  });
});
