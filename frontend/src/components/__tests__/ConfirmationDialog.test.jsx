import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmationDialog from '../ConfirmationDialog';

describe('ConfirmationDialog', () => {
  const defaultProps = {
    title: 'Test Title',
    message: 'Test message',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    isOpen: true
  };

  it('renders when isOpen is true', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ConfirmationDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmationDialog {...defaultProps} onCancel={onCancel} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);
    
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('shows custom button text', () => {
    render(
      <ConfirmationDialog 
        {...defaultProps} 
        confirmText="Delete" 
        cancelText="Keep" 
      />
    );
    
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('applies danger style to confirm button', () => {
    render(<ConfirmationDialog {...defaultProps} confirmStyle="danger" />);
    
    const confirmButton = screen.getByText('Confirm');
    // Check for gradient classes used by ModalButton with danger variant
    expect(confirmButton).toHaveClass('from-red-600');
  });

  it('applies primary style to confirm button by default', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    
    const confirmButton = screen.getByText('Confirm');
    // Check for gradient classes used by ModalButton with primary variant
    expect(confirmButton).toHaveClass('from-sky-600');
  });

  it('disables buttons and shows processing state during async operation', async () => {
    const onConfirm = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const confirmButton = screen.getByText('Confirm');
    const cancelButton = screen.getByText('Cancel');
    
    fireEvent.click(confirmButton);
    
    // Should show processing state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    
    // Wait for async operation to complete
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });
  });

  it('handles async onConfirm errors gracefully', async () => {
    const onConfirm = vi.fn(() => Promise.reject(new Error('Test error')));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);
    
    fireEvent.click(screen.getByText('Confirm'));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Confirmation action failed:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });
});