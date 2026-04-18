import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import RoomLeaderboard from '../RoomLeaderboard';
import WebSocketClient from '../../services/WebSocketClient';
import { roomsAPI } from '../../api/client.ts';

// Mock the API client
vi.mock('../../api/client.ts', () => ({
  roomsAPI: {
    getLeaderboard: vi.fn()
  }
}));

// Mock WebSocketClient
vi.mock('../../services/WebSocketClient', () => ({
  default: {
    on: vi.fn(),
    off: vi.fn(),
    joinRoomLeaderboard: vi.fn(),
    leaveRoomLeaderboard: vi.fn(),
    getStatus: vi.fn(() => ({ isConnected: false }))
  }
}));

describe('RoomLeaderboard WebSocket Integration', () => {
  const mockRoomId = 'room123';
  const mockCurrentUserId = 'user456';
  const mockLeaderboard = [
    {
      rank: 1,
      userId: 'user123',
      username: 'Alice',
      avatar: null,
      totalXp: 450,
      currentStreak: 5,
      isCurrentUser: false
    },
    {
      rank: 2,
      userId: 'user456',
      username: 'Bob',
      avatar: null,
      totalXp: 380,
      currentStreak: 3,
      isCurrentUser: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    roomsAPI.getLeaderboard.mockResolvedValue({
      data: { leaderboard: mockLeaderboard }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should setup WebSocket listeners on mount', async () => {
    render(<RoomLeaderboard roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(WebSocketClient.on).toHaveBeenCalledWith('room_leaderboard_update', expect.any(Function));
      expect(WebSocketClient.on).toHaveBeenCalledWith('room_xp_earned', expect.any(Function));
      expect(WebSocketClient.on).toHaveBeenCalledWith('room_streak_updated', expect.any(Function));
      expect(WebSocketClient.on).toHaveBeenCalledWith('connection_confirmed', expect.any(Function));
      expect(WebSocketClient.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });
  });

  it('should join room leaderboard when WebSocket is connected', async () => {
    WebSocketClient.getStatus.mockReturnValue({ isConnected: true });
    
    render(<RoomLeaderboard roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(WebSocketClient.joinRoomLeaderboard).toHaveBeenCalledWith(mockRoomId);
    });
  });

  it('should cleanup WebSocket listeners on unmount', async () => {
    const { unmount } = render(<RoomLeaderboard roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    unmount();

    expect(WebSocketClient.leaveRoomLeaderboard).toHaveBeenCalledWith(mockRoomId);
    expect(WebSocketClient.off).toHaveBeenCalledWith('room_leaderboard_update', expect.any(Function));
    expect(WebSocketClient.off).toHaveBeenCalledWith('room_xp_earned', expect.any(Function));
    expect(WebSocketClient.off).toHaveBeenCalledWith('room_streak_updated', expect.any(Function));
  });

  it('should display connection status in footer', async () => {
    render(<RoomLeaderboard roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Should show polling status when WebSocket is disconnected
    expect(screen.getByText('Polling')).toBeInTheDocument();
  });

  it('should fetch initial leaderboard data', async () => {
    render(<RoomLeaderboard roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(roomsAPI.getLeaderboard).toHaveBeenCalledWith(mockRoomId);
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('(You)')).toBeInTheDocument();
    });
  });

  it('should handle WebSocket leaderboard updates', async () => {
    let leaderboardUpdateHandler;
    
    WebSocketClient.on.mockImplementation((event, handler) => {
      if (event === 'room_leaderboard_update') {
        leaderboardUpdateHandler = handler;
      }
    });

    render(<RoomLeaderboard roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(leaderboardUpdateHandler).toBeDefined();
    });

    // Simulate WebSocket leaderboard update
    const updatedLeaderboard = [
      { ...mockLeaderboard[0], totalXp: 500 },
      { ...mockLeaderboard[1], totalXp: 400 }
    ];

    leaderboardUpdateHandler({
      roomId: mockRoomId,
      leaderboard: updatedLeaderboard
    });

    await waitFor(() => {
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('400')).toBeInTheDocument();
    });
  });

  it('should handle XP earned events with animation', async () => {
    let xpEarnedHandler;
    
    WebSocketClient.on.mockImplementation((event, handler) => {
      if (event === 'room_xp_earned') {
        xpEarnedHandler = handler;
      }
    });

    render(<RoomLeaderboard roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(xpEarnedHandler).toBeDefined();
    });

    // Simulate XP earned event
    xpEarnedHandler({
      roomId: mockRoomId,
      userId: 'user123',
      xpAmount: 50,
      newTotal: 500
    });

    // Should trigger a new API call to refresh leaderboard
    await waitFor(() => {
      expect(roomsAPI.getLeaderboard).toHaveBeenCalledTimes(2);
    });
  });
});