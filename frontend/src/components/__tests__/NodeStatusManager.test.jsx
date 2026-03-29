import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NodeStatusManager from '../NodeStatusManager';

// Mock the SkillMapContext
const mockUpdateNodeStatus = vi.fn();

vi.mock('../../context/SkillMapContext', () => ({
  useSkillMap: () => ({
    updateNodeStatus: mockUpdateNodeStatus,
  }),
}));

describe('NodeStatusManager Component', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with current status', () => {
    const node = { _id: 'node1', status: 'Unlocked' };
    render(<NodeStatusManager node={node} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Manage Status')).toBeInTheDocument();
    expect(screen.getByText(/Current:/i)).toBeInTheDocument();
    expect(screen.getByText('Unlocked')).toBeInTheDocument();
  });

  it('shows status change options for Unlocked node', () => {
    const node = { _id: 'node1', status: 'Unlocked' };
    render(<NodeStatusManager node={node} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Change status to:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /In Progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completed/i })).toBeInTheDocument();
  });

  it('shows status change options for In_Progress node', () => {
    const node = { _id: 'node1', status: 'In_Progress' };
    render(<NodeStatusManager node={node} onUpdate={mockOnUpdate} />);

    expect(screen.getByRole('button', { name: /Unlocked/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completed/i })).toBeInTheDocument();
  });

  it('shows status change options for Completed node', () => {
    const node = { _id: 'node1', status: 'Completed' };
    render(<NodeStatusManager node={node} onUpdate={mockOnUpdate} />);

    expect(screen.getByRole('button', { name: /Unlocked/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /In Progress/i })).toBeInTheDocument();
  });

  it('disables status changes for Locked node', () => {
    const node = { _id: 'node1', status: 'Locked' };
    render(<NodeStatusManager node={node} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Locked nodes cannot have their status changed manually')).toBeInTheDocument();
    expect(screen.queryByText('Change status to:')).not.toBeInTheDocument();
  });

  it('updates status when button is clicked', async () => {
    mockUpdateNodeStatus.mockResolvedValue({
      node: { _id: 'node1', status: 'Completed' }
    });

    const node = { _id: 'node1', status: 'Unlocked' };
    render(<NodeStatusManager node={node} onUpdate={mockOnUpdate} />);

    const completedButton = screen.getByRole('button', { name: /Completed/i });
    fireEvent.click(completedButton);

    await waitFor(() => {
      expect(mockUpdateNodeStatus).toHaveBeenCalledWith('node1', 'Completed');
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('displays error message on update failure', async () => {
    mockUpdateNodeStatus.mockRejectedValue(new Error('Failed to update status'));

    const node = { _id: 'node1', status: 'Unlocked' };
    render(<NodeStatusManager node={node} onUpdate={mockOnUpdate} />);

    const completedButton = screen.getByRole('button', { name: /Completed/i });
    fireEvent.click(completedButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update status')).toBeInTheDocument();
    });
  });

  it('shows loading state during update', async () => {
    mockUpdateNodeStatus.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const node = { _id: 'node1', status: 'Unlocked' };
    render(<NodeStatusManager node={node} onUpdate={mockOnUpdate} />);

    const completedButton = screen.getByRole('button', { name: /Completed/i });
    fireEvent.click(completedButton);

    expect(screen.getByText('Updating status...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Updating status...')).not.toBeInTheDocument();
    });
  });

  it('disables buttons during update', async () => {
    mockUpdateNodeStatus.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const node = { _id: 'node1', status: 'Unlocked' };
    render(<NodeStatusManager node={node} onUpdate={mockOnUpdate} />);

    const completedButton = screen.getByRole('button', { name: /Completed/i });
    const inProgressButton = screen.getByRole('button', { name: /In Progress/i });
    
    fireEvent.click(completedButton);

    expect(completedButton).toBeDisabled();
    expect(inProgressButton).toBeDisabled();

    await waitFor(() => {
      expect(completedButton).not.toBeDisabled();
    });
  });
});
