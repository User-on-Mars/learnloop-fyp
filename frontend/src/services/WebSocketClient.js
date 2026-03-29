/**
 * WebSocket Client Service
 * 
 * Handles real-time communication with the backend WebSocket service
 * for node unlock notifications, session progress updates, and other real-time events
 */

import { io } from 'socket.io-client';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.eventListeners = new Map();
    this.queuedEvents = [];
    this.currentSkillRoom = null;
  }

  /**
   * Initialize WebSocket connection
   * @param {string} token - JWT authentication token
   * @param {Object} options - Connection options
   */
  async connect(token, options = {}) {
    const serverUrl = options.serverUrl || process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';
    
    try {
      this.socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        ...options
      });

      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          console.log('✅ WebSocket connected');
          
          // Process queued events
          this.processQueuedEvents();
          
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket connection error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
      throw error;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connection_confirmed', (data) => {
      console.log('🔌 WebSocket connection confirmed:', data);
      this.emit('connection_confirmed', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', { reason });
      
      // Attempt reconnection if not intentional
      if (reason !== 'io client disconnect') {
        this.attemptReconnection();
      }
    });

    // Node unlock events
    this.socket.on('node_unlocked', (data) => {
      console.log('🎉 Node unlocked:', data);
      this.emit('node_unlocked', data);
    });

    this.socket.on('skill_node_unlocked', (data) => {
      console.log('🎉 Skill node unlocked (collaborative):', data);
      this.emit('skill_node_unlocked', data);
    });

    // Session events
    this.socket.on('session_progress_updated', (data) => {
      console.log('📊 Session progress updated:', data);
      this.emit('session_progress_updated', data);
    });

    this.socket.on('session_completed', (data) => {
      console.log('✅ Session completed:', data);
      this.emit('session_completed', data);
    });

    this.socket.on('session_timeout_warning', (data) => {
      console.log('⚠️ Session timeout warning:', data);
      this.emit('session_timeout_warning', data);
    });

    // Progress events
    this.socket.on('progress_milestone_reached', (data) => {
      console.log('🎯 Progress milestone reached:', data);
      this.emit('progress_milestone_reached', data);
    });

    // Room events
    this.socket.on('room_joined', (data) => {
      console.log('📡 Joined room:', data);
      this.currentSkillRoom = data.skillId;
      this.emit('room_joined', data);
    });

    this.socket.on('room_left', (data) => {
      console.log('📡 Left room:', data);
      if (this.currentSkillRoom === data.skillId) {
        this.currentSkillRoom = null;
      }
      this.emit('room_left', data);
    });

    // Error events
    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.emit('error', error);
    });

    // Server shutdown
    this.socket.on('server_shutdown', (data) => {
      console.log('🛑 Server shutting down:', data);
      this.emit('server_shutdown', data);
    });

    // Force disconnect
    this.socket.on('force_disconnect', (data) => {
      console.log('🛑 Force disconnect:', data);
      this.emit('force_disconnect', data);
      this.disconnect();
    });

    // Ping/pong for connection health
    this.socket.on('pong', (data) => {
      this.emit('pong', data);
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('reconnection_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.socket && !this.isConnected) {
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * Join a skill-specific room for collaborative features
   * @param {string} skillId - Skill ID to join
   */
  joinSkillRoom(skillId) {
    if (!this.isConnected || !skillId) {
      this.queueEvent('join_skill_room', { skillId });
      return;
    }

    this.socket.emit('join_skill_room', { skillId });
  }

  /**
   * Leave a skill-specific room
   * @param {string} skillId - Skill ID to leave
   */
  leaveSkillRoom(skillId) {
    if (!this.isConnected || !skillId) {
      return;
    }

    this.socket.emit('leave_skill_room', { skillId });
  }

  /**
   * Send ping to check connection health
   */
  ping() {
    if (!this.isConnected) {
      return;
    }

    this.socket.emit('ping');
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Queue event for when connection is restored
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  queueEvent(event, data) {
    this.queuedEvents.push({ event, data, timestamp: Date.now() });
    
    // Limit queue size
    if (this.queuedEvents.length > 100) {
      this.queuedEvents.shift();
    }
  }

  /**
   * Process queued events after reconnection
   */
  processQueuedEvents() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    // Filter out old events
    const validEvents = this.queuedEvents.filter(
      event => now - event.timestamp < maxAge
    );
    
    // Process valid events
    validEvents.forEach(({ event, data }) => {
      this.socket.emit(event, data);
    });
    
    // Clear queue
    this.queuedEvents = [];
    
    if (validEvents.length > 0) {
      console.log(`📤 Processed ${validEvents.length} queued events`);
    }
  }

  /**
   * Get connection status
   * @returns {Object} Connection status information
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      currentSkillRoom: this.currentSkillRoom,
      queuedEventsCount: this.queuedEvents.length,
      socketId: this.socket?.id || null
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.isConnected = false;
      this.socket.disconnect();
      this.socket = null;
      this.currentSkillRoom = null;
      this.queuedEvents = [];
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.disconnect();
    this.eventListeners.clear();
  }
}

// Export singleton instance
export default new WebSocketClient();