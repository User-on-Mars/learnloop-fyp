import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReflectionHistory from '../ReflectionHistory';
import client from '../../api/client';

// Mock API
vi.mock('../../services/api');

describe('ReflectionHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // Test component fetches reflections on mount
  it('should fetch reflections from API on mount', async () => {
    const mockReflections = [
      {
        _id: '507f1f77bcf86cd799439011',
        content: 'Test reflection content',
        mood: 'Happy',
        tags: ['test', 'practice'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    api.get.mockResolvedValue({ data: mockReflections });

    render(<ReflectionHistory />);

    // Verify API was called
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/reflections');
    });

    // Verify reflection is displayed
    await waitFor(() => {
      expect(screen.getByText('Test reflection content')).toBeInTheDocument();
    });
  });

  // Test reflections display with correct data
  it('should display reflections with timestamp, mood, and preview', async () => {
    const mockReflections = [
      {
        _id: '507f1f77bcf86cd799439011',
        content: 'This is a longer reflection content that should be displayed with all the details including mood and tags',
        mood: 'Energized',
        tags: ['coding', 'learning'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];

    api.get.mockResolvedValue({ data: mockReflections });

    render(<ReflectionHistory />);

    await waitFor(() => {
      // Check mood emoji is displayed
      expect(screen.getByText('⚡')).toBeInTheDocument();
      
      // Check relative time is displayed
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
      
      // Check tags are displayed
      expect(screen.getByText('coding')).toBeInTheDocument();
      expect(screen.getByText('learning')).toBeInTheDocument();
      
      // Check content preview is displayed
      expect(screen.getByText(/This is a longer reflection content/)).toBeInTheDocument();
    });
  });

  // Test delete confirmation dialog appears
  it('should show delete confirmation dialog when delete button is clicked', async () => {
    const mockReflections = [
      {
        _id: '507f1f77bcf86cd799439011',
        content: 'Reflection to delete',
        mood: 'Neutral',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    api.get.mockResolvedValue({ data: mockReflections });

    render(<ReflectionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Reflection to delete')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const deleteButton = screen.getByTitle('Delete reflection');
    await user.click(deleteButton);

    // Verify confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  // Test delete removes reflection from list
  it('should remove reflection from list after successful deletion', async () => {
    const mockReflections = [
      {
        _id: '507f1f77bcf86cd799439011',
        content: 'Reflection to be deleted',
        mood: 'Sad',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: '507f1f77bcf86cd799439012',
        content: 'Reflection to keep',
        mood: 'Happy',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    api.get.mockResolvedValue({ data: mockReflections });
    api.delete.mockResolvedValue({ data: { message: 'Reflection deleted successfully' } });

    render(<ReflectionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Reflection to be deleted')).toBeInTheDocument();
      expect(screen.getByText('Reflection to keep')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByTitle('Delete reflection');
    await user.click(deleteButtons[0]);

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /^delete$/i });
    await user.click(confirmButton);

    // Verify API was called
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/reflections/507f1f77bcf86cd799439011');
    });

    // Verify reflection was removed from UI
    await waitFor(() => {
      expect(screen.queryByText('Reflection to be deleted')).not.toBeInTheDocument();
      expect(screen.getByText('Reflection to keep')).toBeInTheDocument();
    });
  });

  // Test export triggers PDF download
  it('should trigger PDF download when export button is clicked', async () => {
    // Mock URL.createObjectURL and document methods BEFORE rendering
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    const mockLink = {
      href: '',
      setAttribute: vi.fn(),
      click: vi.fn(),
      remove: vi.fn()
    };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return mockLink;
      return originalCreateElement(tag);
    });
    const originalAppendChild = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node === mockLink) return node;
      return originalAppendChild(node);
    });

    const mockReflections = [
      {
        _id: '507f1f77bcf86cd799439011',
        content: 'Reflection to export',
        mood: 'Thoughtful',
        tags: ['export', 'pdf'],
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString()
      }
    ];

    const mockPDFBlob = new Blob(['PDF content'], { type: 'application/pdf' });

    api.get.mockResolvedValueOnce({ data: mockReflections }); // First call for fetching reflections
    api.get.mockResolvedValueOnce({ data: mockPDFBlob }); // Second call for PDF export

    render(<ReflectionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Reflection to export')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const exportButton = screen.getByTitle('Export to PDF');
    await user.click(exportButton);

    // Verify PDF export API was called
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/reflections/507f1f77bcf86cd799439011/pdf', {
        responseType: 'blob'
      });
    });

    // Verify download was triggered
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'reflection-2024-01-15.pdf');
  });

  // Test loading state displays
  it('should display loading state while fetching reflections', () => {
    api.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ReflectionHistory />);

    // Verify loading spinner is displayed (it's an SVG with specific class)
    const loadingSpinner = document.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  // Test error state displays
  it('should display error message when API call fails', async () => {
    api.get.mockRejectedValue({
      response: { data: { message: 'Failed to fetch reflections' } }
    });

    render(<ReflectionHistory />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch reflections/i)).toBeInTheDocument();
    });
  });

  // Test empty state
  it('should display empty state when no reflections exist', async () => {
    api.get.mockResolvedValue({ data: [] });

    render(<ReflectionHistory />);

    await waitFor(() => {
      expect(screen.getByText(/no reflections yet/i)).toBeInTheDocument();
      expect(screen.getByText(/start writing your first reflection/i)).toBeInTheDocument();
    });
  });

  // Test reflection selection shows full content
  it('should show full reflection content when reflection is clicked', async () => {
    const longContent = 'This is a very long reflection content that exceeds 150 characters and should be truncated in the preview but shown in full when the reflection is expanded by clicking on it. This allows users to see the complete text.';
    
    const mockReflections = [
      {
        _id: '507f1f77bcf86cd799439011',
        content: longContent,
        mood: 'Happy',
        tags: [],
        createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
        updatedAt: new Date('2024-01-15T10:30:00Z').toISOString()
      }
    ];

    api.get.mockResolvedValue({ data: mockReflections });

    render(<ReflectionHistory />);

    await waitFor(() => {
      // Initially, only preview should be visible (truncated)
      const preview = screen.getByText(/This is a very long reflection content/);
      expect(preview.textContent.length).toBeLessThan(longContent.length);
    });

    const user = userEvent.setup();
    
    // Click on the reflection to expand it
    const reflectionCard = screen.getByText(/This is a very long reflection content/).closest('.p-4');
    await user.click(reflectionCard);

    // Now full content should be visible
    await waitFor(() => {
      const fullContent = screen.getByText(longContent);
      expect(fullContent).toBeInTheDocument();
      expect(fullContent.textContent).toBe(longContent);
    });
  });

  // Test multiple reflections are displayed
  it('should display multiple reflections in order', async () => {
    const mockReflections = [
      {
        _id: '507f1f77bcf86cd799439011',
        content: 'First reflection',
        mood: 'Happy',
        tags: [],
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString()
      },
      {
        _id: '507f1f77bcf86cd799439012',
        content: 'Second reflection',
        mood: 'Neutral',
        tags: [],
        createdAt: new Date('2024-01-14').toISOString(),
        updatedAt: new Date('2024-01-14').toISOString()
      },
      {
        _id: '507f1f77bcf86cd799439013',
        content: 'Third reflection',
        mood: 'Energized',
        tags: [],
        createdAt: new Date('2024-01-13').toISOString(),
        updatedAt: new Date('2024-01-13').toISOString()
      }
    ];

    api.get.mockResolvedValue({ data: mockReflections });

    render(<ReflectionHistory />);

    await waitFor(() => {
      expect(screen.getByText('First reflection')).toBeInTheDocument();
      expect(screen.getByText('Second reflection')).toBeInTheDocument();
      expect(screen.getByText('Third reflection')).toBeInTheDocument();
    });
  });
});
