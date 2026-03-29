import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NodeDetailModal from '../NodeDetailModal';

// Mock the SkillMapContext
const mockGetNodeDetails = vi.fn();

vi.mock('../../context/SkillMapContext', () => ({
  useSkillMap: () => ({
    getNodeDetails: mockGetNodeDetails,
  }),
}));

// Mock child components
vi.mock('../EditNodeForm', () => ({
  default: ({ node }) => <div data-testid="edit-node-form">EditNodeForm for {node.title}</div>
}));

vi.mock('../NodeStatusManager', () => ({
  default: ({ node }) => <div data-testid="node-status-manager">NodeStatusManager for {node.title}</div>
}));

describe('NodeDetailModal Component', () => {
  const mockOnClose = vi.fn();
  const mockNodeData = {
    node: {
      _id: 'node1',
      title: 'Test Node',
      description: 'Test description',
      status: 'Unlocked',
      order: 1
    },
    sessions: [
      {
        _id: 'session1',
        duration: 1800,
        date: '2024-01-15T10:00:00Z'
      }
    ],
    reflections: [
      {
        _id: 'reflection1',
        content: 'Great learning session',
        mood: 'Happy',
        createdAt: '2024-01-15T10:30:00Z'
      }
    ],
    blockers: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<NodeDetailModal isOpen={false} onClose={mockOnClose} nodeId="node1" />);
    expect(screen.queryByText('Node Details')).not.toBeInTheDocument();
  });

  it('renders and loads node details when opened', async () => {
    mockGetNodeDetails.mockResolvedValue(mockNodeData);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    expect(screen.getByText('Node Details')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetNodeDetails).toHaveBeenCalledWith('node1');
      expect(screen.getByText('Test Node')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });
  });

  it('displays node title, description, status, and order', async () => {
    mockGetNodeDetails.mockResolvedValue(mockNodeData);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Node')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('Order: 1')).toBeInTheDocument();
      expect(screen.getByText('Unlocked')).toBeInTheDocument();
    });
  });

  it('displays list of linked sessions with duration and date', async () => {
    mockGetNodeDetails.mockResolvedValue(mockNodeData);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      expect(screen.getByText(/Practice Sessions \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Duration: 30 min/i)).toBeInTheDocument();
      const dates = screen.getAllByText('1/15/2024');
      expect(dates.length).toBeGreaterThan(0);
    });
  });

  it('displays list of linked reflections', async () => {
    mockGetNodeDetails.mockResolvedValue(mockNodeData);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      expect(screen.getByText(/Reflections \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText('Great learning session')).toBeInTheDocument();
      expect(screen.getByText(/Mood: Happy/i)).toBeInTheDocument();
    });
  });

  it('displays list of linked blockers', async () => {
    const dataWithBlockers = {
      ...mockNodeData,
      blockers: [
        {
          _id: 'blocker1',
          description: 'Stuck on concept',
          createdAt: '2024-01-15T11:00:00Z'
        }
      ]
    };

    mockGetNodeDetails.mockResolvedValue(dataWithBlockers);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      expect(screen.getByText(/Blockers \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText('Stuck on concept')).toBeInTheDocument();
    });
  });

  it('shows empty state when no sessions exist', async () => {
    const dataWithoutSessions = {
      ...mockNodeData,
      sessions: []
    };

    mockGetNodeDetails.mockResolvedValue(dataWithoutSessions);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      expect(screen.getByText('No practice sessions yet')).toBeInTheDocument();
    });
  });

  it('shows empty state when no reflections exist', async () => {
    const dataWithoutReflections = {
      ...mockNodeData,
      reflections: []
    };

    mockGetNodeDetails.mockResolvedValue(dataWithoutReflections);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      expect(screen.getByText('No reflections yet')).toBeInTheDocument();
    });
  });

  it('shows empty state when no blockers exist', async () => {
    mockGetNodeDetails.mockResolvedValue(mockNodeData);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      expect(screen.getByText('No blockers reported')).toBeInTheDocument();
    });
  });

  it('renders EditNodeForm component', async () => {
    mockGetNodeDetails.mockResolvedValue(mockNodeData);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      expect(screen.getByTestId('edit-node-form')).toBeInTheDocument();
    });
  });

  it('renders NodeStatusManager component', async () => {
    mockGetNodeDetails.mockResolvedValue(mockNodeData);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      expect(screen.getByTestId('node-status-manager')).toBeInTheDocument();
    });
  });

  it('displays error message when loading fails', async () => {
    mockGetNodeDetails.mockRejectedValue(new Error('Failed to load node details'));

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load node details')).toBeInTheDocument();
    });
  });

  it('has a close button', async () => {
    mockGetNodeDetails.mockResolvedValue(mockNodeData);

    render(<NodeDetailModal isOpen={true} onClose={mockOnClose} nodeId="node1" />);

    await waitFor(() => {
      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
    });
  });
});
