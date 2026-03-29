import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SessionCompletionPrompt from '../SessionCompletionPrompt';

describe('SessionCompletionPrompt', () => {
  const mockSession = {
    id: 'session-123',
    _id: 'mongo-id-123',
    skillName: 'React Hooks',
    nodeId: 'node-456',
    skillId: 'skill-789',
    timer: 0,
    startedAt: new Date().toISOString()
  };

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <SessionCompletionPrompt
        isOpen={false}
        onClose={vi.fn()}
        session={mockSession}
        onAddReflection={vi.fn()}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={vi.fn()}
        session={mockSession}
        onAddReflection={vi.fn()}
      />
    );
    
    expect(screen.getByText('Session Complete!')).toBeInTheDocument();
    expect(screen.getByText('Great work! Would you like to capture your learning insights?')).toBeInTheDocument();
  });

  it('should display Add Reflection button', () => {
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={vi.fn()}
        session={mockSession}
        onAddReflection={vi.fn()}
      />
    );
    
    expect(screen.getByText('Add Reflection')).toBeInTheDocument();
    expect(screen.getByText('Capture what you learned and how it went')).toBeInTheDocument();
  });

  it('should display Report Blocker button when callback is provided', () => {
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={vi.fn()}
        session={mockSession}
        onAddReflection={vi.fn()}
        onReportBlocker={vi.fn()}
      />
    );
    
    expect(screen.getByText('Report Blocker')).toBeInTheDocument();
    expect(screen.getByText('Document any obstacles you encountered')).toBeInTheDocument();
  });

  it('should not display Report Blocker button when callback is not provided', () => {
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={vi.fn()}
        session={mockSession}
        onAddReflection={vi.fn()}
      />
    );
    
    expect(screen.queryByText('Report Blocker')).not.toBeInTheDocument();
  });

  it('should display Skip for Now button', () => {
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={vi.fn()}
        session={mockSession}
        onAddReflection={vi.fn()}
      />
    );
    
    expect(screen.getByText('Skip for Now')).toBeInTheDocument();
  });

  it('should call onAddReflection when Add Reflection button is clicked', async () => {
    const onAddReflection = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={onClose}
        session={mockSession}
        onAddReflection={onAddReflection}
      />
    );
    
    const addReflectionButton = screen.getByText('Add Reflection').closest('button');
    fireEvent.click(addReflectionButton);
    
    await waitFor(() => {
      expect(onAddReflection).toHaveBeenCalledWith(mockSession);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should call onReportBlocker when Report Blocker button is clicked', async () => {
    const onReportBlocker = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={onClose}
        session={mockSession}
        onAddReflection={vi.fn()}
        onReportBlocker={onReportBlocker}
      />
    );
    
    const reportBlockerButton = screen.getByText('Report Blocker').closest('button');
    fireEvent.click(reportBlockerButton);
    
    await waitFor(() => {
      expect(onReportBlocker).toHaveBeenCalledWith(mockSession);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should call onClose when Skip for Now button is clicked', () => {
    const onClose = vi.fn();
    
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={onClose}
        session={mockSession}
        onAddReflection={vi.fn()}
      />
    );
    
    const skipButton = screen.getByText('Skip for Now');
    fireEvent.click(skipButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when X button is clicked', () => {
    const onClose = vi.fn();
    
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={onClose}
        session={mockSession}
        onAddReflection={vi.fn()}
      />
    );
    
    const closeButton = screen.getByRole('button', { name: '' }).closest('button');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should disable buttons while submitting', async () => {
    const onAddReflection = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={vi.fn()}
        session={mockSession}
        onAddReflection={onAddReflection}
      />
    );
    
    const addReflectionButton = screen.getByText('Add Reflection').closest('button');
    fireEvent.click(addReflectionButton);
    
    // Buttons should be disabled while submitting
    expect(addReflectionButton).toBeDisabled();
    expect(screen.getByText('Skip for Now')).toBeDisabled();
  });

  it('should handle errors gracefully when onAddReflection fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onAddReflection = vi.fn().mockRejectedValue(new Error('Failed to add reflection'));
    
    render(
      <SessionCompletionPrompt
        isOpen={true}
        onClose={vi.fn()}
        session={mockSession}
        onAddReflection={onAddReflection}
      />
    );
    
    const addReflectionButton = screen.getByText('Add Reflection').closest('button');
    fireEvent.click(addReflectionButton);
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Error adding reflection:', expect.any(Error));
    });
    
    consoleError.mockRestore();
  });
});
