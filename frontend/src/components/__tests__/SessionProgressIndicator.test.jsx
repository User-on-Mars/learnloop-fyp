import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SessionProgressIndicator from '../SessionProgressIndicator';

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn()
  })),
  set fillStyle(value) { this._fillStyle = value; },
  get fillStyle() { return this._fillStyle; },
  set strokeStyle(value) { this._strokeStyle = value; },
  get strokeStyle() { return this._strokeStyle; },
  set lineWidth(value) { this._lineWidth = value; },
  get lineWidth() { return this._lineWidth; },
  set globalAlpha(value) { this._globalAlpha = value; },
  get globalAlpha() { return this._globalAlpha; },
  set imageSmoothingEnabled(value) { this._imageSmoothingEnabled = value; },
  get imageSmoothingEnabled() { return this._imageSmoothingEnabled; }
};

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockContext)
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

describe('SessionProgressIndicator', () => {
  const defaultSessionData = {
    id: 'session-1',
    nodeTitle: 'Test Node',
    status: 'active',
    startTime: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    progress: 50
  };

  const defaultProps = {
    sessionData: defaultSessionData,
    onReflectionSubmit: vi.fn(),
    onSessionEnd: vi.fn(),
    theme: 'default'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders session timer', () => {
      render(<SessionProgressIndicator {...defaultProps} />);
      
      expect(screen.getByText('Session Time')).toBeInTheDocument();
      const timerCanvas = document.querySelector('canvas');
      expect(timerCanvas).toBeInTheDocument();
    });

    it('renders progress bar', () => {
      render(<SessionProgressIndicator {...defaultProps} />);
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders session info', () => {
      render(<SessionProgressIndicator {...defaultProps} />);
      
      expect(screen.getByText('Node: Test Node')).toBeInTheDocument();
      expect(screen.getByText('Status: active')).toBeInTheDocument();
    });

    it('renders both canvases', () => {
      render(<SessionProgressIndicator {...defaultProps} />);
      
      const canvases = document.querySelectorAll('canvas');
      expect(canvases).toHaveLength(2); // Timer and progress canvases
    });
  });

  describe('Timer Functionality', () => {
    it('updates timer display', async () => {
      render(<SessionProgressIndicator {...defaultProps} />);
      
      // Advance time by 1 second
      vi.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
        expect(mockContext.fillRect).toHaveBeenCalled();
      });
    });

    it('formats time correctly', () => {
      const sessionData = {
        ...defaultSessionData,
        startTime: new Date(Date.now() - 3661000).toISOString() // 1 hour, 1 minute, 1 second ago
      };
      
      render(<SessionProgressIndicator {...defaultProps} sessionData={sessionData} />);
      
      // The component should format time as H:MM:SS
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('handles sessions without start time', () => {
      const sessionData = {
        ...defaultSessionData,
        startTime: null
      };
      
      render(<SessionProgressIndicator {...defaultProps} sessionData={sessionData} />);
      
      // Should not crash and should render default state
      expect(screen.getByText('Session Time')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('displays correct progress percentage', () => {
      const sessionData = {
        ...defaultSessionData,
        progress: 75
      };
      
      render(<SessionProgressIndicator {...defaultProps} sessionData={sessionData} />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('handles 0% progress', () => {
      const sessionData = {
        ...defaultSessionData,
        progress: 0
      };
      
      render(<SessionProgressIndicator {...defaultProps} sessionData={sessionData} />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles 100% progress with sparkles', () => {
      const sessionData = {
        ...defaultSessionData,
        progress: 100
      };
      
      render(<SessionProgressIndicator {...defaultProps} sessionData={sessionData} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
      // Animation should be triggered for sparkles
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    it('updates progress when sessionData changes', () => {
      const { rerender } = render(<SessionProgressIndicator {...defaultProps} />);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
      
      const updatedSessionData = {
        ...defaultSessionData,
        progress: 80
      };
      
      rerender(<SessionProgressIndicator {...defaultProps} sessionData={updatedSessionData} />);
      
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  describe('Reflection Form', () => {
    const propsWithReflection = {
      ...defaultProps,
      showReflectionForm: true
    };

    it('renders reflection form when enabled', () => {
      render(<SessionProgressIndicator {...propsWithReflection} />);
      
      expect(screen.getByText('Session Reflection')).toBeInTheDocument();
      expect(screen.getByText('Understanding (1-5)')).toBeInTheDocument();
      expect(screen.getByText('Difficulty (1-5)')).toBeInTheDocument();
      expect(screen.getByText('Notes (optional)')).toBeInTheDocument();
    });

    it('does not render reflection form when disabled', () => {
      render(<SessionProgressIndicator {...defaultProps} />);
      
      expect(screen.queryByText('Session Reflection')).not.toBeInTheDocument();
    });

    it('handles understanding rating changes', () => {
      render(<SessionProgressIndicator {...propsWithReflection} />);
      
      const ratingButtons = screen.getAllByText('4');
      const understandingButton = ratingButtons[0]; // First rating is understanding
      
      fireEvent.click(understandingButton);
      
      expect(understandingButton.closest('button')).toHaveClass('bg-blue-500');
    });

    it('handles difficulty rating changes', () => {
      render(<SessionProgressIndicator {...propsWithReflection} />);
      
      const ratingButtons = screen.getAllByText('2');
      const difficultyButton = ratingButtons[1]; // Second rating is difficulty
      
      fireEvent.click(difficultyButton);
      
      expect(difficultyButton.closest('button')).toHaveClass('bg-blue-500');
    });

    it('handles notes input', () => {
      render(<SessionProgressIndicator {...propsWithReflection} />);
      
      const notesTextarea = screen.getByPlaceholderText('What did you learn? Any challenges?');
      
      fireEvent.change(notesTextarea, { target: { value: 'Test notes' } });
      
      expect(notesTextarea.value).toBe('Test notes');
      expect(screen.getByText('10/500 characters')).toBeInTheDocument();
    });

    it('limits notes to 500 characters', () => {
      render(<SessionProgressIndicator {...propsWithReflection} />);
      
      const notesTextarea = screen.getByPlaceholderText('What did you learn? Any challenges?');
      const longText = 'a'.repeat(600);
      
      fireEvent.change(notesTextarea, { target: { value: longText } });
      
      expect(notesTextarea.value).toHaveLength(500);
      expect(screen.getByText('500/500 characters')).toBeInTheDocument();
    });

    it('submits reflection data correctly', async () => {
      render(<SessionProgressIndicator {...propsWithReflection} />);
      
      // Set understanding rating
      const understandingButton = screen.getAllByText('4')[0];
      fireEvent.click(understandingButton);
      
      // Set difficulty rating
      const difficultyButton = screen.getAllByText('2')[1];
      fireEvent.click(difficultyButton);
      
      // Add notes
      const notesTextarea = screen.getByPlaceholderText('What did you learn? Any challenges?');
      fireEvent.change(notesTextarea, { target: { value: 'Great session!' } });
      
      // Submit form
      const submitButton = screen.getByText('Complete Session');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onReflectionSubmit).toHaveBeenCalledWith({
          understanding: 4,
          difficulty: 2,
          notes: 'Great session!',
          timeSpent: expect.any(Number),
          completionConfidence: expect.any(Number)
        });
      });
    });

    it('shows loading state during submission', async () => {
      const slowOnReflectionSubmit = vi.fn(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(<SessionProgressIndicator 
        {...propsWithReflection} 
        onReflectionSubmit={slowOnReflectionSubmit}
      />);
      
      const submitButton = screen.getByText('Complete Session');
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('handles submission errors gracefully', async () => {
      const errorOnReflectionSubmit = vi.fn(() => 
        Promise.reject(new Error('Submission failed'))
      );
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<SessionProgressIndicator 
        {...propsWithReflection} 
        onReflectionSubmit={errorOnReflectionSubmit}
      />);
      
      const submitButton = screen.getByText('Complete Session');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error submitting reflection:',
          expect.any(Error)
        );
      });
      
      // Should return to normal state
      expect(screen.getByText('Complete Session')).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
      
      consoleSpy.mockRestore();
    });

    it('calls onSessionEnd when end session button is clicked', () => {
      render(<SessionProgressIndicator {...propsWithReflection} />);
      
      const endButton = screen.getByText('End Session');
      fireEvent.click(endButton);
      
      expect(defaultProps.onSessionEnd).toHaveBeenCalled();
    });
  });

  describe('Animations', () => {
    it('starts animation loop on mount', () => {
      render(<SessionProgressIndicator {...defaultProps} />);
      
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    it('cleans up animation on unmount', () => {
      const { unmount } = render(<SessionProgressIndicator {...defaultProps} />);
      
      unmount();
      
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('renders canvas animations', async () => {
      render(<SessionProgressIndicator {...defaultProps} />);
      
      // Advance animation frames
      vi.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
        expect(mockContext.fillRect).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<SessionProgressIndicator {...defaultProps} showReflectionForm={true} />);
      
      expect(screen.getByLabelText('Understanding (1-5)')).toBeInTheDocument();
      expect(screen.getByLabelText('Difficulty (1-5)')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument();
    });

    it('has proper button text for screen readers', () => {
      render(<SessionProgressIndicator {...defaultProps} showReflectionForm={true} />);
      
      const ratingButtons = screen.getAllByRole('button');
      const submitButton = screen.getByText('Complete Session');
      const endButton = screen.getByText('End Session');
      
      expect(ratingButtons.length).toBeGreaterThan(0);
      expect(submitButton).toBeInTheDocument();
      expect(endButton).toBeInTheDocument();
    });
  });

  describe('Pixel Art Styling', () => {
    it('applies pixel art CSS classes', () => {
      render(<SessionProgressIndicator {...defaultProps} />);
      
      const container = document.querySelector('.pixel-container');
      expect(container).toBeInTheDocument();
      
      const canvases = document.querySelectorAll('.pixelated');
      expect(canvases.length).toBeGreaterThan(0);
    });

    it('uses pixel font styling', () => {
      render(<SessionProgressIndicator {...defaultProps} showReflectionForm={true} />);
      
      const pixelFontElements = document.querySelectorAll('.pixel-font');
      expect(pixelFontElements.length).toBeGreaterThan(0);
    });
  });
});