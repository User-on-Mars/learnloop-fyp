import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../useAuth';
import { useToast } from './ToastContext';
import {
  getActiveSession,
  selectActiveSession,
  selectSessionSettings,
  selectShouldTimeoutSession,
  selectSessionTimeoutWarning,
  updateSessionSettings,
  clearActiveSession,
  resetSessionManagement,
} from '../store/slices/sessionManagementSlice';
import {
  setConnectionStatus,
  handleNodeUnlock,
  handleSessionUpdate,
  handleProgressUpdate,
  addSystemNotification,
  selectIsConnected,
  selectConnectionStatus,
  selectShouldRetryConnection,
  selectNextRetryDelay,
  incrementRetryCount,
  resetRetryCount,
} from '../store/slices/unlockNotificationSlice';

const SessionContext = createContext(null);

/**
 * SessionProvider - Manages session state, WebSocket connections, and real-time updates
 * Integrates with Redux store and provides session management functionality
 */
export function SessionProvider({ children }) {
  const dispatch = useDispatch();
  const user = useAuth();
  const { showWarning, showError, showSuccess } = useToast();
  
  // WebSocket connection
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  
  // Selectors
  const activeSession = useSelector(selectActiveSession);
  const sessionSettings = useSelector(selectSessionSettings);
  const shouldTimeout = useSelector(selectShouldTimeoutSession);
  const timeoutWarning = useSelector(selectSessionTimeoutWarning);
  const isConnected = useSelector(selectIsConnected);
  const connectionStatus = useSelector(selectConnectionStatus);
  const shouldRetryConnection = useSelector(selectShouldRetryConnection);
  const nextRetryDelay = useSelector(selectNextRetryDelay);
  
  // WebSocket connection management
  const connectWebSocket = useCallback(async () => {
    if (!user) return;
    
    try {
      dispatch(setConnectionStatus({ status: 'connecting' }));
      
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
      const token = await user.getIdToken();
      
      wsRef.current = new WebSocket(`${wsUrl}?token=${token}`);
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        dispatch(setConnectionStatus({ status: 'connected' }));
        dispatch(resetRetryCount());
        
        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // 30 seconds
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        dispatch(setConnectionStatus({ status: 'disconnected' }));
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && user) {
          scheduleReconnection();
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        dispatch(setConnectionStatus({ status: 'error', error: error.message }));
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      dispatch(setConnectionStatus({ status: 'error', error: error.message }));
      scheduleReconnection();
    }
  }, [user, dispatch]);
  
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User logout');
      wsRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    dispatch(setConnectionStatus({ status: 'disconnected' }));
  }, [dispatch]);
  
  const scheduleReconnection = useCallback(() => {
    if (!shouldRetryConnection) return;
    
    const delay = nextRetryDelay;
    console.log(`🔄 Scheduling WebSocket reconnection in ${delay}ms`);
    
    dispatch(incrementRetryCount());
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (user) {
        connectWebSocket();
      }
    }, delay);
  }, [shouldRetryConnection, nextRetryDelay, user, connectWebSocket, dispatch]);
  
  // Enhanced WebSocket message handler with linear progression support
  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'node_unlock':
        dispatch(handleNodeUnlock(data.payload));
        if (sessionSettings.enableNotifications) {
          showSuccess(`🎉 ${data.payload.nodeTitle} unlocked!`, {
            duration: 5000,
          });
        }
        break;
        
      case 'session_update':
        dispatch(handleSessionUpdate(data.payload));
        break;
        
      case 'progress_update':
        dispatch(handleProgressUpdate(data.payload));
        break;
        
      case 'linear_progression_update':
        // Handle linear progression updates
        notifyLinearProgressionUpdate(data.payload);
        break;
        
      case 'session_milestone':
        // Handle session milestone notifications
        if (sessionSettings.enableProgressMilestones) {
          showSuccess(`🎯 ${data.payload.milestone}% progress milestone reached!`, {
            duration: 4000,
          });
        }
        break;
        
      case 'reflection_reminder':
        // Handle reflection reminders
        if (sessionSettings.enableReflectionReminders) {
          showWarning('Don\'t forget to reflect on your learning session', {
            duration: 6000,
          });
        }
        break;
        
      case 'pong':
        // Heartbeat response - connection is alive
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }, [dispatch, sessionSettings, showSuccess, showWarning, notifyLinearProgressionUpdate]);
  
  // Session timeout management
  useEffect(() => {
    if (timeoutWarning && !shouldTimeout) {
      showWarning('Session will timeout in 30 minutes. Save your progress!', {
        duration: 10000,
      });
    }
    
    if (shouldTimeout && activeSession) {
      showError('Session has timed out and will be abandoned.', {
        duration: 8000,
      });
      
      // Auto-abandon the session
      dispatch(clearActiveSession());
    }
  }, [timeoutWarning, shouldTimeout, activeSession, showWarning, showError, dispatch]);
  
  // Initialize session management
  useEffect(() => {
    if (user) {
      // Load active session on login
      dispatch(getActiveSession());
      
      // Connect WebSocket
      connectWebSocket();
    } else {
      // Clean up on logout
      disconnectWebSocket();
      dispatch(resetSessionManagement());
    }
    
    return () => {
      disconnectWebSocket();
    };
  }, [user, dispatch, connectWebSocket, disconnectWebSocket]);
  
  // Enhanced session management functions
  const updateSettings = useCallback((newSettings) => {
    dispatch(updateSessionSettings(newSettings));
    
    // Persist to localStorage with enhanced settings
    const settingsToSave = {
      ...sessionSettings,
      ...newSettings,
      lastUpdated: Date.now(),
    };
    
    localStorage.setItem('sessionSettings', JSON.stringify(settingsToSave));
    
    // Notify about settings change
    dispatch(addSystemNotification({
      title: 'Settings Updated',
      message: 'Session preferences have been saved',
      type: 'info',
      priority: 'low',
    }));
  }, [dispatch, sessionSettings]);
  
  // Enhanced WebSocket message sending with retry logic
  const sendWebSocketMessage = useCallback((message, options = {}) => {
    const { retry = true, maxRetries = 3 } = options;
    
    const attemptSend = (attempt = 1) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          ...message,
          timestamp: Date.now(),
          attempt,
        }));
        return true;
      } else if (retry && attempt < maxRetries) {
        // Retry after a short delay
        setTimeout(() => attemptSend(attempt + 1), 1000 * attempt);
        return false;
      }
      return false;
    };
    
    return attemptSend();
  }, []);
  
  // Session progress integration
  const broadcastSessionProgress = useCallback((progressData) => {
    if (activeSession && isConnected) {
      sendWebSocketMessage({
        type: 'session_progress_update',
        sessionId: activeSession.id,
        nodeId: activeSession.nodeId,
        ...progressData,
      });
    }
  }, [activeSession, isConnected, sendWebSocketMessage]);
  
  // Linear progression notifications
  const notifyLinearProgressionUpdate = useCallback((progressionData) => {
    if (sessionSettings.enableRealtimeUpdates) {
      dispatch(addSystemNotification({
        title: 'Progress Update',
        message: `${progressionData.completedNodes}/${progressionData.totalNodes} nodes completed`,
        type: 'info',
        priority: 'normal',
        data: progressionData,
      }));
    }
  }, [dispatch, sessionSettings.enableRealtimeUpdates]);
  
  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('sessionSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        dispatch(updateSessionSettings(parsed));
      } catch (error) {
        console.error('Error loading session settings:', error);
      }
    }
  }, [dispatch]);
  
  // Connection management functions
  const forceReconnect = useCallback(() => {
    disconnectWebSocket();
    dispatch(resetRetryCount());
    
    setTimeout(() => {
      if (user) {
        connectWebSocket();
      }
    }, 1000);
  }, [disconnectWebSocket, connectWebSocket, user, dispatch]);
  

  
  // Enhanced context value with linear progression support
  const contextValue = {
    // Session state
    activeSession,
    sessionSettings,
    timeoutWarning,
    shouldTimeout,
    
    // WebSocket state
    isConnected,
    connectionStatus,
    
    // Session management
    updateSettings,
    broadcastSessionProgress,
    notifyLinearProgressionUpdate,
    
    // Connection management
    forceReconnect,
    sendWebSocketMessage,
    
    // Utility functions
    formatDuration: (milliseconds) => {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      }
      return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    },
    
    // Enhanced utility functions
    formatProgressPercentage: (progress) => `${Math.round(progress)}%`,
    
    getSessionStatusColor: (status) => {
      switch (status) {
        case 'active': return 'green';
        case 'paused': return 'yellow';
        case 'completed': return 'blue';
        case 'abandoned': return 'red';
        default: return 'gray';
      }
    },
    
    getEffectivenessLevel: (score) => {
      if (score >= 80) return 'excellent';
      if (score >= 60) return 'good';
      if (score >= 40) return 'fair';
      return 'needs_improvement';
    },
  };
  
  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access session context
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export default SessionContext;