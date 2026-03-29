import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditNodeForm from '../EditNodeForm';

// Mock the SkillMapContext
const mockUpdateNodeContent = vi.fn();

vi.mock('../../context/SkillMapContext', () => ({
  useSkillMap: () => ({
    updateNodeContent: mockUpdateNodeContent,
  }),
}));

describe('EditNodeForm Component', () => {
  const mockOnUpdate = vi.fn();
  const mockNode = {
    _id: 'node1',
    title: 'Test Node',
    description: 'Test description',
    status: 'Unlocked'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with node title and description', () => {
    render(<EditNodeForm node={mockNode} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Edit Node Content')).toBeInTheDocument();
    expect(screen.getByText(/Title:/i)).toBeInTheDocument();
    expect(screen.getByText('Test Node')).toBeInTheDocument();
    expect(screen.getByText(/Description:/i)).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('shows edit button for unlocked nodes', () => {
    render(<EditNodeForm node={mockNode} onUpdate={mockOnUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    expect(editButton).toBeInTheDocument();
    expect(editButton).not.toBeDisabled();
  });

  it('disables edit button for locked nodes', () => {
    const lockedNode = { ...mockNode, status: 'Locked' };
    render(<EditNodeForm node={lockedNode} onUpdate={mockOnUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    expect(editButton).toBeDisabled();
    expect(screen.getByText('Locked nodes cannot be edited')).toBeInTheDocument();
  });

  it('shows form when edit button is clicked', () => {
    render(<EditNodeForm node={mockNode} onUpdate={mockOnUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('validates title length (max 200 characters)', async () => {
    render(<EditNodeForm node={mockNode} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const titleInput = screen.getByLabelText(/Title/i);
    const longTitle = 'a'.repeat(201);

    fireEvent.change(titleInput, { target: { value: longTitle } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText('Title must not exceed 200 characters')).toBeInTheDocument();
    });
  });

  it('validates description length (max 2000 characters)', async () => {
    render(<EditNodeForm node={mockNode} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const descriptionInput = screen.getByLabelText(/Description/i);
    const longDescription = 'a'.repeat(2001);

    fireEvent.change(descriptionInput, { target: { value: longDescription } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText('Description must not exceed 2000 characters')).toBeInTheDocument();
    });
  });

  it('shows character count for title', () => {
    render(<EditNodeForm node={mockNode} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const titleInput = screen.getByLabelText(/Title/i);
    
    // Initial count based on existing title
    expect(screen.getByText('9/200 characters')).toBeInTheDocument();

    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    expect(screen.getByText('9/200 characters')).toBeInTheDocument();
  });

  it('shows character count for description', () => {
    render(<EditNodeForm node={mockNode} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const descriptionInput = screen.getByLabelText(/Description/i);
    
    // Initial count based on existing description
    expect(screen.getByText('16/2000 characters')).toBeInTheDocument();

    fireEvent.change(descriptionInput, { target: { value: 'New description' } });
    expect(screen.getByText('15/2000 characters')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    mockUpdateNodeContent.mockResolvedValue({
      _id: 'node1',
      title: 'Updated Title',
      description: 'Updated description'
    });

    render(<EditNodeForm node={mockNode} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const titleInput = screen.getByLabelText(/Title/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockUpdateNodeContent).toHaveBeenCalledWith('node1', {
        title: 'Updated Title',
        description: 'Updated description'
      });
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('displays error message on submission failure', async () => {
    mockUpdateNodeContent.mockRejectedValue(new Error('Failed to update node'));

    render(<EditNodeForm node={mockNode} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to update node')).toBeInTheDocument();
    });
  });

  it('cancels editing and resets form', () => {
    render(<EditNodeForm node={mockNode} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'Changed Title' } });

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // Should return to view mode
    expect(screen.queryByLabelText(/Title/i)).not.toBeInTheDocument();
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });
});
