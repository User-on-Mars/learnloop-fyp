/**
 * WebSocket Hook
 * 
 * React hook for managing WebSocket connections and real-time updates
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '../useAuth';
import WebSocketClient from '../services/WebSocketClient';
import { 
  setConnectionStatus,
  addUnlockNotification,
  addProgressUpdate,
  addSessionUpdate 
} from '../store/slices/unlockNotificationSlice';

export const useWebSocket = (options = {}) => {
  const dispatch = useDispatch();
  const user = useAuth();
  
  const [connectionState, setConnectionState] = useState({
    status: 'disconnected',
    error: null,
    reconnectAttempts: 0
  });
  
  const currentSkillRef = useRef(null);
  const eventListenersRef = useRef(new Map());

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(async (token) => {
    if (!token) {
      console.warn('⚠️ No token provided for WebSocket connection');
      return;
    }

    try {
      setConnectionState(prev => ({ ...prev, status: 'connecting', error: null }));
      dispatch(setConnectionStatus({ status: 'connecting' }));

      await WebSocketClient.connect(token, options);
      
      setConnectionState(prev => ({ ...prev, status: 'connected', reconnectAttempts: 0 }));
      dispatch(setConnectionStatus({ status: 'connected' }));
      
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setConnectionState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
      dispatch(setConnectionStatus({ status: 'error', error: error.message }));
    }
  }, [dispatch, options]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    WebSocketClient.disconnect();
    setConnectionState({ status: 'disconnected', error: null, reconnectAttempts: 0 });
    dispatch(setConnectionStatus({ status: 'disconnected' }));
  }, [dispatch]);

  /**
   * Join skill room for collaborative features
   */
  const joinSkillRoom = useCallback((skillId) => {
    if (currentSkillRef.current !== skillId) {
      // Leave current room if different
      if (currentSkillRef.current) {
        WebSocketClient.leaveSkillRoom(currentSkillRef.current);
      }
      
      // Join new room
      WebSocketClient.joinSkillRoom(skillId);
      currentSkillRef.current = skillId;
    }
  }, []);

  /**
   * Leave current skill room
   */
  const leaveSkillRoom = useCallback(() => {
    if (currentSkillRef.current) {
      WebSocketClient.leaveSkillRoom(currentSkillRef.current);
      currentSkillRef.current = null;
    }
  }, []);

  /**
   * Add event listener
   */
  const addEventListener = useCallback((event, callback) => {
    WebSocketClient.on(event, callback);
    
    // Track listeners for cleanup
    if (!eventListenersRef.current.has(event)) {
      eventListenersRef.current.set(event, new Set());
    }
    eventListenersRef.current.get(event).add(callback);
  }, []);

  /**
   * Remove event listener
   */
  const removeEventListener = useCallback((event, callback) => {
    WebSocketClient.off(event, callback);
    
    // Remove from tracking
    const listeners = eventListenersRef.current.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }, []);

  /**
   * Setup default event handlers
   */
  useEffect(() => {
    // Node unlock notifications
    const handleNodeUnlock = (data) => {
      dispatch(addUnlockNotification({
        id: `unlock_${data.nodeId}_${Date.now()}`,
        type: 'node_unlock',
        title: 'Node Unlocked!',
        message: data.message,
        nodeId: data.nodeId,
        skillId: data.skillId,
        timestamp: data.timestamp,
        isOwnEvent: data.isOwnEvent
      }));
    };

    // Session progress updates
    const handleSessionProgress = (data) => {
      dispatch(addProgressUpdate({
        sessionId: data.sessionId,
        nodeId: data.nodeId,
        progress: data.progress,
        action: data.action,
        timestamp: data.timestamp
      }));
    };

    // Session completion
    const handleSessionComplete = (data) => {
      dispatch(addSessionUpdate({
        id: `session_${data.sessionId}_${Date.now()}`,
        type: 'session_complete',
        sessionId: data.sessionId,
        nodeId: data.nodeId,
        skillId: data.skillId,
        message: data.message,
        reflectionSummary: data.reflectionSummary,
        timestamp: data.timestamp
      }));
    };

    // Progress milestones
    const handleProgressMilestone = (data) => {
      dispatch(addUnlockNotification({
        id: `milestone_${data.skillId}_${Date.now()}`,
        type: 'progress_milestone',
        title: 'Milestone Reached!',
        message: data.message,
        skillId: data.skillId,
        milestone: data.milestone,
        totalProgress: data.totalProgress,
        timestamp: data.timestamp
      }));
    };

    // Session timeout warnings
    const handleTimeoutWarning = (data) => {
      dispatch(addSessionUpdate({
        id: `timeout_${data.sessionId}_${Date.now()}`,
        type: 'session_timeout_warning',
        sessionId: data.sessionId,
        nodeId: data.nodeId,
        message: data.message,
        timeRemaining: data.timeRemaining,
        timestamp: data.timestamp
      }));
    };

    // Connection events
    const handleConnectionConfirmed = (data) => {
      console.log('✅ WebSocket connection confirmed:', data);
    };

    const handleDisconnected = (data) => {
      setConnectionState(prev => ({ 
        ...prev, 
        status: 'disconnected', 
        error: data.reason 
      }));
      dispatch(setConnectionStatus({ status: 'disconnected', error: data.reason }));
    };

    const handleReconnectionFailed = () => {
      setConnectionState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: 'Reconnection failed' 
      }));
      dispatch(setConnectionStatus({ 
        status: 'error', 
        error: 'Failed to reconnect after multiple attempts' 
      }));
    };

    // Register event listeners
    addEventListener('node_unlocked', handleNodeUnlock);
    addEventListener('session_progress_updated', handleSessionProgress);
    addEventListener('session_completed', handleSessionComplete);
    addEventListener('progress_milestone_reached', handleProgressMilestone);
    addEventListener('session_timeout_warning', handleTimeoutWarning);
    addEventListener('connection_confirmed', handleConnectionConfirmed);
    addEventListener('disconnected', handleDisconnected);
    addEventListener('reconnection_failed', handleReconnectionFailed);

    // Cleanup function
    return () => {
      removeEventListener('node_unlocked', handleNodeUnlock);
      removeEventListener('session_progress_updated', handleSessionProgress);
      removeEventListener('session_completed', handleSessionComplete);
      removeEventListener('progress_milestone_reached', handleProgressMilestone);
      removeEventListener('session_timeout_warning', handleTimeoutWarning);
      removeEventListener('connection_confirmed', handleConnectionConfirmed);
      removeEventListener('disconnected', handleDisconnected);
      removeEventListener('reconnection_failed', handleReconnectionFailed);
    };
  }, [dispatch, addEventListener, removeEventListener]);

  /**
   * Auto-connect when user is available
   */
  useEffect(() => {
    if (user?.token && connectionState.status === 'disconnected') {
      connect(user.token);
    }
  }, [user?.token, connectionState.status, connect]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clean up all tracked event listeners
      eventListenersRef.current.forEach((listeners, event) => {
        listeners.forEach(callback => {
          WebSocketClient.off(event, callback);
        });
      });
      eventListenersRef.current.clear();
      
      // Leave current skill room
      leaveSkillRoom();
    };
  }, [leaveSkillRoom]);

  return {
    // Connection state
    isConnected: connectionState.status === 'connected',
    connectionStatus: connectionState.status,
    connectionError: connectionState.error,
    reconnectAttempts: connectionState.reconnectAttempts,
    
    // Connection methods
    connect,
    disconnect,
    
    // Room management
    joinSkillRoom,
    leaveSkillRoom,
    currentSkillRoom: currentSkillRef.current,
    
    // Event management
    addEventListener,
    removeEventListener,
    
    // Utility methods
    ping: () => WebSocketClient.ping(),
    getStatus: () => WebSocketClient.getStatus()
  };
};

export default useWebSocket;