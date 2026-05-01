import { useState, useEffect, useRef, useCallback } from "react";
import { Trophy, Medal, Crown, Flame, Users, TrendingUp } from "lucide-react";
import { roomsAPI } from "../api/client.ts";
import WebSocketClient from "../services/WebSocketClient";

export default function RoomLeaderboard({ roomId, currentUserId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updatedUsers, setUpdatedUsers] = useState(new Set()); // Track recently updated users for animation
  
  // Refs for cleanup and polling
  const pollingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  // Fetch leaderboard data (defined early to avoid circular dependency)
  const fetchLeaderboard = useCallback(async () => {
    try {
      setError("");
      const response = await roomsAPI.getLeaderboard(roomId);
      setLeaderboard(response.data.leaderboard || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      setError(err.response?.data?.message || "Failed to load leaderboard");
    }
  }, [roomId]);

  // WebSocket event handlers
  const handleLeaderboardUpdate = useCallback((data) => {
    if (data.roomId === roomId) {
      console.log('🏆 Received leaderboard update for room:', roomId);
      setLeaderboard(data.leaderboard || []);
      setLastUpdate(new Date());
    }
  }, [roomId]);

  const handleXpEarned = useCallback((data) => {
    if (data.roomId === roomId) {
      console.log('💎 XP earned in room:', roomId, data);
      
      // Add user to updated users for animation
      setUpdatedUsers(prev => new Set([...prev, data.userId]));
      
      // Remove animation after 3 seconds
      setTimeout(() => {
        setUpdatedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }, 3000);
      
      // Refresh leaderboard to get updated data
      fetchLeaderboard();
    }
  }, [roomId, fetchLeaderboard]);

  const handleStreakUpdated = useCallback((data) => {
    if (data.roomId === roomId) {
      console.log('🔥 Streak updated in room:', roomId, data);
      
      // Add user to updated users for animation
      setUpdatedUsers(prev => new Set([...prev, data.userId]));
      
      // Remove animation after 3 seconds
      setTimeout(() => {
        setUpdatedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }, 3000);
      
      // Refresh leaderboard to get updated data
      fetchLeaderboard();
    }
  }, [roomId, fetchLeaderboard]);

  const handleWebSocketConnection = useCallback(() => {
    console.log('✅ WebSocket connected for room leaderboard');
    setIsWebSocketConnected(true);
    reconnectAttemptsRef.current = 0;
    
    // Join room leaderboard channel
    if (roomId) {
      WebSocketClient.joinRoomLeaderboard(roomId);
    }
    
    // Clear polling interval since WebSocket is available
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [roomId]);

  const handleWebSocketDisconnection = useCallback(() => {
    console.log('❌ WebSocket disconnected for room leaderboard');
    setIsWebSocketConnected(false);
    
    // Start polling fallback
    startPollingFallback();
    
    // Attempt reconnection with exponential backoff
    attemptReconnection();
  }, []);

  // Polling fallback when WebSocket is unavailable
  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    console.log('🔄 Starting polling fallback for leaderboard updates');
    pollingIntervalRef.current = setInterval(() => {
      if (!isWebSocketConnected) {
        fetchLeaderboard();
      }
    }, 30000); // Poll every 30 seconds
  }, [isWebSocketConnected]);

  // Exponential backoff reconnection
  const attemptReconnection = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('❌ Max WebSocket reconnection attempts reached');
      return;
    }

    const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
    reconnectAttemptsRef.current++;
    
    console.log(`🔄 Attempting WebSocket reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      // Check if WebSocket client is available and try to reconnect
      const status = WebSocketClient.getStatus();
      if (!status.isConnected) {
        // WebSocket client will handle reconnection internally
        // We just need to set up our event listeners again
        setupWebSocketListeners();
      }
    }, delay);
  }, []);

  // Setup WebSocket event listeners
  const setupWebSocketListeners = useCallback(() => {
    // Remove existing listeners first
    WebSocketClient.off('room_leaderboard_update', handleLeaderboardUpdate);
    WebSocketClient.off('room_xp_earned', handleXpEarned);
    WebSocketClient.off('room_streak_updated', handleStreakUpdated);
    WebSocketClient.off('connection_confirmed', handleWebSocketConnection);
    WebSocketClient.off('disconnected', handleWebSocketDisconnection);

    // Add event listeners
    WebSocketClient.on('room_leaderboard_update', handleLeaderboardUpdate);
    WebSocketClient.on('room_xp_earned', handleXpEarned);
    WebSocketClient.on('room_streak_updated', handleStreakUpdated);
    WebSocketClient.on('connection_confirmed', handleWebSocketConnection);
    WebSocketClient.on('disconnected', handleWebSocketDisconnection);
    
    // Check current connection status
    const status = WebSocketClient.getStatus();
    if (status.isConnected) {
      handleWebSocketConnection();
    } else {
      handleWebSocketDisconnection();
    }
  }, [handleLeaderboardUpdate, handleXpEarned, handleStreakUpdated, handleWebSocketConnection, handleWebSocketDisconnection]);

  // Initial setup and cleanup
  useEffect(() => {
    if (!roomId) return;

    const initializeComponent = async () => {
      setIsLoading(true);
      
      // Setup WebSocket listeners
      setupWebSocketListeners();
      
      // Fetch initial data
      await fetchLeaderboard();
      
      setIsLoading(false);
    };

    initializeComponent();

    // Cleanup function
    return () => {
      // Clear intervals and timeouts
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Leave room leaderboard channel
      if (roomId) {
        WebSocketClient.leaveRoomLeaderboard(roomId);
      }
      
      // Remove event listeners
      WebSocketClient.off('room_leaderboard_update', handleLeaderboardUpdate);
      WebSocketClient.off('room_xp_earned', handleXpEarned);
      WebSocketClient.off('room_streak_updated', handleStreakUpdated);
      WebSocketClient.off('connection_confirmed', handleWebSocketConnection);
      WebSocketClient.off('disconnected', handleWebSocketDisconnection);
    };
  }, [roomId, setupWebSocketListeners, fetchLeaderboard, handleLeaderboardUpdate, handleXpEarned, handleStreakUpdated, handleWebSocketConnection, handleWebSocketDisconnection]);

  // Get rank icon/badge for top 3
  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-md">
            <Crown className="w-5 h-5 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-md">
            <Medal className="w-5 h-5 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-md">
            <Medal className="w-5 h-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-site-bg flex items-center justify-center border border-site-border">
            <span className="text-sm font-semibold text-site-muted">{rank}</span>
          </div>
        );
    }
  };

  // Format XP with commas
  const formatXp = (xp) => {
    return (xp || 0).toLocaleString();
  };

  // Get user initials for avatar
  const getInitials = (username) => {
    if (!username) return "U";
    const names = username.split(" ");
    if (names.length > 1) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return username.charAt(0).toUpperCase();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-lg bg-site-bg animate-pulse"
          >
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Trophy className="w-6 h-6 text-red-600" />
        </div>
        <p className="text-site-muted mb-2">{error}</p>
        <button
          onClick={fetchLeaderboard}
          className="text-sm text-site-accent hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-site-soft rounded-full flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6 text-site-accent" />
        </div>
        <p className="text-site-muted mb-1">No XP earned yet</p>
        <p className="text-sm text-site-faint">
          Complete nodes in room skill maps to appear on the leaderboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-site-border">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-site-accent" />
          <span className="text-sm font-medium text-site-muted">
            {leaderboard.length} {leaderboard.length === 1 ? "member" : "members"} competing
          </span>
        </div>
        {leaderboard.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-site-accent">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">Live Rankings</span>
          </div>
        )}
      </div>

      {/* Leaderboard Entries */}
      <div className="space-y-2">
        {leaderboard.map((entry) => {
          const isCurrentUser = entry.userId === currentUserId;
          const isTopThree = entry.rank <= 3;
          const isRecentlyUpdated = updatedUsers.has(entry.userId);

          return (
            <div
              key={entry.userId}
              className={`
                flex items-center gap-4 p-4 rounded-lg transition-all duration-500
                ${
                  isCurrentUser
                    ? "bg-site-soft border-2 border-site-accent shadow-md"
                    : "bg-site-bg hover:bg-site-soft/50 border border-site-border"
                }
                ${isTopThree && !isCurrentUser ? "shadow-sm" : ""}
                ${isRecentlyUpdated ? "ring-2 ring-green-400 ring-opacity-75 animate-pulse bg-green-50" : ""}
              `}
            >
              {/* Rank Badge */}
              <div className="flex-shrink-0">{getRankBadge(entry.rank)}</div>

              {/* Avatar */}
              <div className="flex-shrink-0">
                {entry.avatar ? (
                  <img
                    src={entry.avatar}
                    alt={entry.username}
                    className="w-10 h-10 rounded-full border-2 border-site-border w-auto h-auto object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    ${
                      isCurrentUser
                        ? "bg-site-accent text-white"
                        : "bg-site-surface text-site-accent border-2 border-site-border"
                    }
                  `}
                  >
                    {getInitials(entry.username)}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`
                    font-semibold truncate
                    ${isCurrentUser ? "text-site-accent" : "text-site-ink"}
                  `}
                  >
                    {entry.username}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs font-normal text-site-muted">
                        (You)
                      </span>
                    )}
                  </p>
                  {entry.rank === 1 && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                      Leader
                    </span>
                  )}
                </div>

                {/* XP and Streak */}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-site-muted">
                    <span className="font-semibold text-site-accent">
                      {formatXp(entry.totalXp)}
                    </span>{" "}
                    XP
                  </span>
                  {entry.currentStreak > 0 && (
                    <div className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600">
                        {entry.currentStreak}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* XP Badge (for visual emphasis) */}
              <div
                className={`
                flex-shrink-0 px-3 py-2 rounded-lg text-right
                ${
                  isCurrentUser
                    ? "bg-site-accent/10"
                    : "bg-site-surface border border-site-border"
                }
              `}
              >
                <div
                  className={`
                  text-lg font-bold
                  ${isCurrentUser ? "text-site-accent" : "text-site-ink"}
                `}
                >
                  {formatXp(entry.totalXp)}
                </div>
                <div className="text-xs text-site-faint">XP</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      {leaderboard.length > 0 && (
        <div className="mt-4 pt-3 border-t border-site-border">
          <div className="flex items-center justify-between">
            <p className="text-xs text-site-faint">
              Rankings update in real-time • Streaks reset weekly on Sunday
            </p>
            <div className="flex items-center gap-2">
              {isWebSocketConnected ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs text-yellow-600">Polling</span>
                </div>
              )}
              {lastUpdate && (
                <span className="text-xs text-site-faint">
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
