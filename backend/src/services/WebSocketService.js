import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import ErrorLoggingService from './ErrorLoggingService.js';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socket IDs
    this.socketUsers = new Map(); // socket ID -> userId
    this.roomSubscriptions = new Map(); // userId -> Set of room names
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: false
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('✅ WebSocket service initialized');
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;
        
        next();
      } catch (error) {
        await ErrorLoggingService.logError(error, {
          operation: 'websocket_auth',
          socketId: socket.id,
          ip: socket.handshake.address
        });
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
      
      socket.on('join_skill_room', (data) => {
        this.handleJoinSkillRoom(socket, data);
      });
      
      socket.on('leave_skill_room', (data) => {
        this.handleLeaveSkillRoom(socket, data);
      });
      
      socket.on('join_room_leaderboard', (data) => {
        this.handleJoinRoomLeaderboard(socket, data);
      });
      
      socket.on('leave_room_leaderboard', (data) => {
        this.handleLeaveRoomLeaderboard(socket, data);
      });
      
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });
  }

  /**
   * Handle new WebSocket connection
   * @param {Socket} socket - Socket.io socket instance
   */
  handleConnection(socket) {
    const userId = socket.userId;
    
    // Track user connections
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);
    this.socketUsers.set(socket.id, userId);
    
    // Initialize room subscriptions for user
    if (!this.roomSubscriptions.has(userId)) {
      this.roomSubscriptions.set(userId, new Set());
    }
    
    console.log(`🔌 User ${userId} connected (socket: ${socket.id})`);
    
    // Send connection confirmation
    socket.emit('connection_confirmed', {
      userId,
      timestamp: Date.now(),
      message: 'Connected to real-time updates'
    });
    
    // Log connection event
    ErrorLoggingService.logSystemEvent('websocket_connection', {
      userId,
      socketId: socket.id,
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    });
  }

  /**
   * Handle WebSocket disconnection
   * @param {Socket} socket - Socket.io socket instance
   */
  handleDisconnection(socket) {
    const userId = this.socketUsers.get(socket.id);
    
    if (userId) {
      // Remove socket from user's connections
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
          this.roomSubscriptions.delete(userId);
        }
      }
      
      this.socketUsers.delete(socket.id);
      
      console.log(`🔌 User ${userId} disconnected (socket: ${socket.id})`);
      
      // Log disconnection event
      ErrorLoggingService.logSystemEvent('websocket_disconnection', {
        userId,
        socketId: socket.id
      });
    }
  }

  /**
   * Handle joining a skill-specific room
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Room join data
   */
  handleJoinSkillRoom(socket, data) {
    const { skillId } = data;
    const userId = socket.userId;
    
    if (!skillId) {
      socket.emit('error', { message: 'Skill ID required to join room' });
      return;
    }
    
    const roomName = `skill_${skillId}`;
    socket.join(roomName);
    
    // Track room subscription
    this.roomSubscriptions.get(userId).add(roomName);
    
    console.log(`📡 User ${userId} joined skill room: ${roomName}`);
    
    socket.emit('room_joined', {
      skillId,
      roomName,
      timestamp: Date.now()
    });
  }

  /**
   * Handle joining a room leaderboard
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Room leaderboard join data
   */
  handleJoinRoomLeaderboard(socket, data) {
    const { roomId } = data;
    const userId = socket.userId;
    
    if (!roomId) {
      socket.emit('error', { message: 'Room ID required to join leaderboard' });
      return;
    }
    
    const roomName = `room_leaderboard_${roomId}`;
    socket.join(roomName);
    
    // Track room subscription
    this.roomSubscriptions.get(userId).add(roomName);
    
    console.log(`🏆 User ${userId} joined room leaderboard: ${roomName}`);
    
    socket.emit('room_leaderboard_joined', {
      roomId,
      roomName,
      timestamp: Date.now()
    });
  }

  /**
   * Handle leaving a room leaderboard
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Room leaderboard leave data
   */
  handleLeaveRoomLeaderboard(socket, data) {
    const { roomId } = data;
    const userId = socket.userId;
    
    if (!roomId) {
      socket.emit('error', { message: 'Room ID required to leave leaderboard' });
      return;
    }
    
    const roomName = `room_leaderboard_${roomId}`;
    socket.leave(roomName);
    
    // Remove room subscription
    this.roomSubscriptions.get(userId)?.delete(roomName);
    
    console.log(`🏆 User ${userId} left room leaderboard: ${roomName}`);
    
    socket.emit('room_leaderboard_left', {
      roomId,
      roomName,
      timestamp: Date.now()
    });
  }

  /**
   * Handle leaving a skill-specific room
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Room leave data
   */
  handleLeaveSkillRoom(socket, data) {
    const { skillId } = data;
    const userId = socket.userId;
    
    if (!skillId) {
      socket.emit('error', { message: 'Skill ID required to leave room' });
      return;
    }
    
    const roomName = `skill_${skillId}`;
    socket.leave(roomName);
    
    // Remove room subscription
    this.roomSubscriptions.get(userId)?.delete(roomName);
    
    console.log(`📡 User ${userId} left skill room: ${roomName}`);
    
    socket.emit('room_left', {
      skillId,
      roomName,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast node unlock notification
   * @param {string} userId - User ID who unlocked the node
   * @param {Object} unlockData - Node unlock data
   */
  broadcastNodeUnlock(userId, unlockData) {
    const { skillId, nodeId, nodeTitle, unlockedNodes } = unlockData;
    
    const notification = {
      type: 'node_unlock',
      userId,
      skillId,
      nodeId,
      nodeTitle,
      unlockedNodes,
      timestamp: Date.now(),
      message: `${nodeTitle} has been unlocked!`
    };
    
    // Send to user's personal connections
    this.sendToUser(userId, 'node_unlocked', notification);
    
    // Send to skill room (for collaborative features)
    this.sendToSkillRoom(skillId, 'skill_node_unlocked', {
      ...notification,
      isOwnUnlock: false // Will be true for the user who unlocked it
    }, userId);
    
    console.log(`🎉 Broadcasted node unlock: ${nodeTitle} for user ${userId}`);
  }

  /**
   * Broadcast session progress update
   * @param {string} userId - User ID
   * @param {Object} progressData - Session progress data
   */
  broadcastSessionProgress(userId, progressData) {
    const { sessionId, nodeId, skillId, progress, action } = progressData;
    
    const notification = {
      type: 'session_progress',
      userId,
      sessionId,
      nodeId,
      skillId,
      progress,
      action,
      timestamp: Date.now()
    };
    
    // Send to user's personal connections
    this.sendToUser(userId, 'session_progress_updated', notification);
    
    console.log(`📊 Broadcasted session progress: ${progress}% for user ${userId}`);
  }

  /**
   * Broadcast session completion
   * @param {string} userId - User ID
   * @param {Object} completionData - Session completion data
   */
  broadcastSessionCompletion(userId, completionData) {
    const { sessionId, nodeId, skillId, nodeTitle, reflectionData } = completionData;
    
    const notification = {
      type: 'session_complete',
      userId,
      sessionId,
      nodeId,
      skillId,
      nodeTitle,
      reflectionSummary: {
        understanding: reflectionData.understanding,
        difficulty: reflectionData.difficulty,
        completionConfidence: reflectionData.completionConfidence
      },
      timestamp: Date.now(),
      message: `Session completed for ${nodeTitle}`
    };
    
    // Send to user's personal connections
    this.sendToUser(userId, 'session_completed', notification);
    
    // Send to skill room
    this.sendToSkillRoom(skillId, 'skill_session_completed', notification, userId);
    
    console.log(`✅ Broadcasted session completion: ${nodeTitle} for user ${userId}`);
  }

  /**
   * Broadcast progress milestone
   * @param {string} userId - User ID
   * @param {Object} milestoneData - Milestone data
   */
  broadcastProgressMilestone(userId, milestoneData) {
    const { skillId, milestone, totalProgress, achievementType } = milestoneData;
    
    const notification = {
      type: 'progress_milestone',
      userId,
      skillId,
      milestone,
      totalProgress,
      achievementType,
      timestamp: Date.now(),
      message: `${milestone}% progress milestone reached!`
    };
    
    // Send to user's personal connections
    this.sendToUser(userId, 'progress_milestone_reached', notification);
    
    console.log(`🎯 Broadcasted progress milestone: ${milestone}% for user ${userId}`);
  }

  /**
   * Broadcast room leaderboard update
   * @param {string} roomId - Room ID
   * @param {Array} leaderboard - Updated leaderboard data
   */
  broadcastRoomLeaderboardUpdate(roomId, leaderboard) {
    const notification = {
      type: 'room_leaderboard_update',
      roomId,
      leaderboard,
      timestamp: Date.now()
    };
    
    // Send to room leaderboard subscribers
    this.sendToRoomLeaderboard(roomId, 'room_leaderboard_update', notification);
    
    console.log(`🏆 Broadcasted leaderboard update for room ${roomId}`);
  }

  /**
   * Broadcast room XP earned event
   * @param {string} roomId - Room ID
   * @param {string} userId - User who earned XP
   * @param {Object} xpData - XP earning data
   */
  broadcastRoomXpEarned(roomId, userId, xpData) {
    const { xpAmount, newTotal, skillMapId } = xpData;
    
    const notification = {
      type: 'room_xp_earned',
      roomId,
      userId,
      xpAmount,
      newTotal,
      skillMapId,
      timestamp: Date.now()
    };
    
    // Send to room leaderboard subscribers
    this.sendToRoomLeaderboard(roomId, 'room_xp_earned', notification);
    
    console.log(`💰 Broadcasted XP earned: ${xpAmount} XP for user ${userId} in room ${roomId}`);
  }

  /**
   * Broadcast room streak update
   * @param {string} roomId - Room ID
   * @param {string} userId - User whose streak updated
   * @param {Object} streakData - Streak update data
   */
  broadcastRoomStreakUpdated(roomId, userId, streakData) {
    const { currentStreak, longestStreak, isNewRecord } = streakData;
    
    const notification = {
      type: 'room_streak_updated',
      roomId,
      userId,
      currentStreak,
      longestStreak,
      isNewRecord,
      timestamp: Date.now()
    };
    
    // Send to room leaderboard subscribers
    this.sendToRoomLeaderboard(roomId, 'room_streak_updated', notification);
    
    console.log(`🔥 Broadcasted streak update: ${currentStreak} days for user ${userId} in room ${roomId}`);
  }

  /**
   * Send session timeout warning
   * @param {string} userId - User ID
   * @param {Object} timeoutData - Timeout warning data
   */
  sendSessionTimeoutWarning(userId, timeoutData) {
    const { sessionId, nodeId, timeRemaining } = timeoutData;
    
    const notification = {
      type: 'session_timeout_warning',
      userId,
      sessionId,
      nodeId,
      timeRemaining,
      timestamp: Date.now(),
      message: `Session will timeout in ${Math.ceil(timeRemaining / 60000)} minutes`
    };
    
    // Send to user's personal connections
    this.sendToUser(userId, 'session_timeout_warning', notification);
    
    console.log(`⚠️ Sent timeout warning to user ${userId}: ${timeRemaining}ms remaining`);
  }

  /**
   * Send message to specific user
   * @param {string} userId - Target user ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  sendToUser(userId, event, data) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets && userSockets.size > 0) {
      userSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, { ...data, isOwnEvent: true });
        }
      });
    }
  }

  /**
   * Send message to skill room
   * @param {string} skillId - Skill ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {string} excludeUserId - User ID to exclude from broadcast
   */
  sendToSkillRoom(skillId, event, data, excludeUserId = null) {
    const roomName = `skill_${skillId}`;
    
    if (excludeUserId) {
      // Send to room but exclude the originating user
      const userSockets = this.connectedUsers.get(excludeUserId);
      if (userSockets) {
        userSockets.forEach(socketId => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.to(roomName).emit(event, { ...data, isOwnEvent: false });
          }
        });
      }
    } else {
      // Send to entire room
      this.io.to(roomName).emit(event, data);
    }
  }

  /**
   * Send message to room leaderboard subscribers
   * @param {string} roomId - Room ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {string} excludeUserId - User ID to exclude from broadcast
   */
  sendToRoomLeaderboard(roomId, event, data, excludeUserId = null) {
    const roomName = `room_leaderboard_${roomId}`;
    
    if (excludeUserId) {
      // Send to room but exclude the originating user
      const userSockets = this.connectedUsers.get(excludeUserId);
      if (userSockets) {
        userSockets.forEach(socketId => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.to(roomName).emit(event, { ...data, isOwnEvent: false });
          }
        });
      }
    } else {
      // Send to entire room leaderboard
      this.io.to(roomName).emit(event, data);
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    const totalConnections = Array.from(this.connectedUsers.values())
      .reduce((sum, sockets) => sum + sockets.size, 0);
    
    const totalUsers = this.connectedUsers.size;
    const totalRooms = new Set(
      Array.from(this.roomSubscriptions.values())
        .flatMap(rooms => Array.from(rooms))
    ).size;
    
    return {
      totalConnections,
      totalUsers,
      totalRooms,
      averageConnectionsPerUser: totalUsers > 0 ? totalConnections / totalUsers : 0,
      timestamp: Date.now()
    };
  }

  /**
   * Check if user is connected
   * @param {string} userId - User ID to check
   * @returns {boolean} True if user has active connections
   */
  isUserConnected(userId) {
    const userSockets = this.connectedUsers.get(userId);
    return userSockets && userSockets.size > 0;
  }

  /**
   * Get user's active rooms
   * @param {string} userId - User ID
   * @returns {Array} Array of room names
   */
  getUserRooms(userId) {
    const rooms = this.roomSubscriptions.get(userId);
    return rooms ? Array.from(rooms) : [];
  }

  /**
   * Disconnect all connections for a user
   * @param {string} userId - User ID
   * @param {string} reason - Disconnection reason
   */
  disconnectUser(userId, reason = 'Server initiated disconnect') {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force_disconnect', { reason });
          socket.disconnect(true);
        }
      });
    }
  }

  /**
   * Cleanup and shutdown WebSocket service
   */
  shutdown() {
    if (this.io) {
      console.log('🛑 Shutting down WebSocket service...');
      
      // Notify all connected clients
      this.io.emit('server_shutdown', {
        message: 'Server is shutting down',
        timestamp: Date.now()
      });
      
      // Close all connections
      this.io.close();
      
      // Clear tracking maps
      this.connectedUsers.clear();
      this.socketUsers.clear();
      this.roomSubscriptions.clear();
      
      console.log('✅ WebSocket service shutdown complete');
    }
  }
}

// Export singleton instance
export default new WebSocketService();