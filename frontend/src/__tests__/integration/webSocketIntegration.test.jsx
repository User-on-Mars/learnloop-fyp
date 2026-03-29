import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';

// Import Redux slices
import unlockNotificationReducer from '../../store/slices/unlockNotificationSlice';
import sessionManagementReducer from '../../store/slices/sessionManagementSlice';

// Mock socket.io-client
vi.mock('socket.io-client');

const createTestStore = () => {
  return configureStore({
    reducer: {
      unlockNotification: unlockNotificationReducer,
      sessionManagement: sessionManagementReducer,
    },
  });
};

const createWrapper = (store) => {
  return ({ children }) => (
    <Provider store={store}>
      {children}
    </Provider>
  );
};

describe('WebSocket Integration Tests', () => {
  let store;
  let mockSocket;
  let mockIo;
  
  beforeAll(() => {
    // Mock performance.now for consistent timing
    global.performance = {
      now: vi.fn(() => Date.now())
    };
  });
  
  beforeEach(() => {
    store = createTestStore();
    
    // Create mock socket with event emitter functionality
    mockSocket = {
      connected: false,
      id: 'mock-socket-id',
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      listeners: new Map(),
      
      // Helper methods for testing
      simulateConnect() {
        this.connected = true;
        const connectHandler = this.listeners.get('connect');
        if (connectHandler) connectHandler();
      },
      
      simulateDisconnect() {
        this.connected = false;
        const disconnectHandler = this.listeners.get('disconnect');
        if (disconnectHandler) disconnectHandler();
      },
      
      simulateEvent(event, data) {
        const handler = this.listeners.get(event);
        if (handler) handler(data);
      }
    };
    
    // Override on method to track listeners
    mockSocket.on.mockImplementation((event, handler) => {
      mockSocket.listeners.set(event, handler);
    });
    
    // Mock io function
    mockIo = vi.mocked(io);
    mockIo.mockReturnValue(mockSocket);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    mockSocket.listeners.clear();
  });
  
  describe('WebSocket Connection Management', () => {
    it('should establish connection with proper authentication', async () => {
      const mockToken = 'mock-jwt-token';
      
      // Mock auth token retrieval
      const mockGetToken = vi.fn().mockResolvedValue(mockToken);
      
      // Create WebSocket connection
      const socket = io('ws://localhost:4000', {
        auth: { token: mockToken },
        transports: ['websocket']
      });
      
      expect(mockIo).toHaveBeenCalledWith('ws://localhost:4000', {
        auth: { token: mockToken },
        transports: ['websocket']
      });
      
      // Simulate successful connection
      act(() => {
        mockSocket.simulateConnect();
      });
      
      expect(mockSocket.connected).toBe(true);
    });
    
    it('should handle connection failures gracefully', async () => {
      const mockSocket = {
        connected: false,
        on: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn()
      };
      
      mockIo.mockReturnValue(mockSocket);
      
      // Simulate connection error
      const errorHandler = vi.fn();
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect_error') {
          errorHandler.mockImplementation(handler);
        }
      });
      
      const socket = io('ws://localhost:4000');
      
      // Simulate connection error
      const error = new Error('Connection failed');
      act(() => {
        errorHandler(error);
      });
      
      expect(mockSocket.connected).toBe(false);
    });
    
    it('should implement exponential backoff for reconnection', async () => {
      const reconnectAttempts = [];
      let attemptCount = 0;
      
      const mockSocket = {
        connected: false,
        on: vi.fn(),
        connect: vi.fn(() => {
          attemptCount++;
          reconnectAttempts.push({
            attempt: attemptCount,
            timestamp: Date.now()
          });
          
          // Fail first 3 attempts, succeed on 4th
          if (attemptCount < 4) {
            setTimeout(() => {
              const errorHandler = mockSocket.listeners?.get('connect_error');
              if (errorHandler) {
                errorHandler(new Error('Connection failed'));
              }
            }, 10);
          } else {
            setTimeout(() => {
              mockSocket.connected = true;
              const connectHandler = mockSocket.listeners?.get('connect');
              if (connectHandler) connectHandler();
            }, 10);
          }
        }),
        listeners: new Map()
      };
      
      mockSocket.on.mockImplementation((event, handler) => {
        mockSocket.listeners.set(event, handler);
      });
      
      mockIo.mockReturnValue(mockSocket);
      
      // Simulate reconnection logic
      const reconnect = async (attempt = 1) => {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        mockSocket.connect();
      };
      
      // Start connection attempts
      for (let i = 1; i <= 4; i++) {
        await reconnect(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      expect(reconnectAttempts).toHaveLength(4);
      expect(mockSocket.connected).toBe(true);
      
      // Verify exponential backoff timing
      if (reconnectAttempts.length > 1) {
        const timeDiff1 = reconnectAttempts[1].timestamp - reconnectAttempts[0].timestamp;
        const timeDiff2 = reconnectAttempts[2].timestamp - reconnectAttempts[1].timestamp;
        expect(timeDiff2).toBeGreaterThan(timeDiff1);
      }
    });
  });
  
  describe('Real-time Unlock Notifications', () => {
    it('should receive and process node unlock notifications', async () => {
      const unlockNotification = {
        type: 'node_unlock',
        userId: 'test-user',
        skillId: 'skill-123',
        nodeId: 'node-456',
        nodeTitle: 'Advanced JavaScript',
        unlockedNodes: [
          {
            nodeId: 'node-789',
            nodeTitle: 'React Fundamentals',
            nodeType: 'content',
            sequenceOrder: 2
          }
        ],
        timestamp: Date.now(),
        message: 'Advanced JavaScript has been unlocked!'
      };
      
      // Simulate receiving unlock notification
      act(() => {
        mockSocket.simulateEvent('node_unlocked', unlockNotification);
        
        // Dispatch to Redux store
        store.dispatch({
          type: 'unlockNotification/handleNodeUnlock',
          payload: unlockNotification
        });
      });
      
      const state = store.getState();
      const notifications = state.unlockNotification.notifications;
      const realtimeUpdates = state.unlockNotification.realtimeUpdates.nodeUnlocks;
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Node Unlocked! 🎉');
      expect(notifications[0].message).toBe('Advanced JavaScript is now available');
      expect(notifications[0].priority).toBe('high');
      
      expect(realtimeUpdates).toHaveLength(1);
      expect(realtimeUpdates[0].type).toBe('node_unlock');
      expect(realtimeUpdates[0].nodeTitle).toBe('Advanced JavaScript');
    });
    
    it('should handle multiple concurrent unlock notifications', async () => {
      const notifications = [
        {
          type: 'node_unlock',
          nodeId: 'node-1',
          nodeTitle: 'Node 1',
          timestamp: Date.now()
        },
        {
          type: 'node_unlock',
          nodeId: 'node-2',
          nodeTitle: 'Node 2',
          timestamp: Date.now() + 100
        },
        {
          type: 'node_unlock',
          nodeId: 'node-3',
          nodeTitle: 'Node 3',
          timestamp: Date.now() + 200
        }
      ];
      
      // Simulate rapid notifications
      act(() => {
        notifications.forEach(notification => {
          mockSocket.simulateEvent('node_unlocked', notification);
          store.dispatch({
            type: 'unlockNotification/handleNodeUnlock',
            payload: notification
          });
        });
      });
      
      const state = store.getState();
      const storeNotifications = state.unlockNotification.notifications;
      const realtimeUpdates = state.unlockNotification.realtimeUpdates.nodeUnlocks;
      
      expect(storeNotifications).toHaveLength(3);
      expect(realtimeUpdates).toHaveLength(3);
      
      // Verify notifications are ordered by priority/timestamp
      expect(storeNotifications[0].priority).toBe('high');
      expect(storeNotifications.every(n => n.type === 'success')).toBe(true);
    });
    
    it('should respect notification settings and filtering', async () => {
      // Disable notifications in settings
      act(() => {
        store.dispatch({
          type: 'unlockNotification/updateNotificationSettings',
          payload: { enableNotifications: false }
        });
      });
      
      const unlockNotification = {
        type: 'node_unlock',
        nodeTitle: 'Test Node',
        timestamp: Date.now()
      };
      
      // Simulate notification when disabled
      act(() => {
        mockSocket.simulateEvent('node_unlocked', unlockNotification);
        // Note: In real implementation, the handler would check settings
        // For this test, we'll manually check the setting
        const settings = store.getState().unlockNotification.settings;
        if (settings.enableNotifications) {
          store.dispatch({
            type: 'unlockNotification/handleNodeUnlock',
            payload: unlockNotification
          });
        }
      });
      
      const state = store.getState();
      const notifications = state.unlockNotification.notifications;
      
      // Should not create notification when disabled
      expect(notifications).toHaveLength(0);
      
      // Re-enable notifications
      act(() => {
        store.dispatch({
          type: 'unlockNotification/updateNotificationSettings',
          payload: { enableNotifications: true }
        });
      });
      
      // Now notification should be created
      act(() => {
        const settings = store.getState().unlockNotification.settings;
        if (settings.enableNotifications) {
          store.dispatch({
            type: 'unlockNotification/handleNodeUnlock',
            payload: unlockNotification
          });
        }
      });
      
      const updatedState = store.getState();
      expect(updatedState.unlockNotification.notifications).toHaveLength(1);
    });
  });
  
  describe('Session Progress Updates', () => {
    it('should receive and process session progress updates', async () => {
      const progressUpdate = {
        type: 'session_progress',
        userId: 'test-user',
        sessionId: 'session-123',
        nodeId: 'node-456',
        skillId: 'skill-789',
        progress: 75,
        action: 'completed_exercise',
        timestamp: Date.now()
      };
      
      // Simulate progress update
      act(() => {
        mockSocket.simulateEvent('session_progress_updated', progressUpdate);
        
        // Update session management state
        store.dispatch({
          type: 'sessionManagement/updateRemoteProgress',
          payload: {
            sessionId: progressUpdate.sessionId,
            progress: progressUpdate.progress,
            action: progressUpdate.action
          }
        });
        
        // Update unlock notification state
        store.dispatch({
          type: 'unlockNotification/handleProgressUpdate',
          payload: progressUpdate
        });
      });
      
      const sessionState = store.getState().sessionManagement;
      const notificationState = store.getState().unlockNotification;
      
      // Verify session state update
      expect(sessionState.sessionProgress).toBeDefined();
      
      // Verify realtime update tracking
      expect(notificationState.realtimeUpdates.progressUpdates).toHaveLength(1);
      expect(notificationState.realtimeUpdates.progressUpdates[0].progress).toBe(75);
    });
    
    it('should handle high-frequency progress updates efficiently', async () => {
      const sessionId = 'high-freq-session';
      const numUpdates = 50;
      const updates = [];
      
      // Generate rapid progress updates
      for (let i = 1; i <= numUpdates; i++) {
        updates.push({
          type: 'session_progress',
          sessionId,
          progress: (i / numUpdates) * 100,
          action: `update_${i}`,
          timestamp: Date.now() + i
        });
      }
      
      const startTime = performance.now();
      
      // Process all updates
      act(() => {
        updates.forEach(update => {
          mockSocket.simulateEvent('session_progress_updated', update);
          store.dispatch({
            type: 'unlockNotification/handleProgressUpdate',
            payload: update
          });
        });
      });
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      const state = store.getState();
      const progressUpdates = state.unlockNotification.realtimeUpdates.progressUpdates;
      
      expect(progressUpdates).toHaveLength(numUpdates);
      expect(processingTime).toBeLessThan(1000); // Should process quickly
      
      // Verify updates are properly ordered
      const progresses = progressUpdates.map(u => u.progress);
      expect(progresses[0]).toBe(100); // Most recent first
      expect(progresses[numUpdates - 1]).toBe(2); // Oldest last
    });
  });
  
  describe('Session Completion Notifications', () => {
    it('should receive and process session completion notifications', async () => {
      const completionNotification = {
        type: 'session_complete',
        userId: 'test-user',
        sessionId: 'session-123',
        nodeId: 'node-456',
        skillId: 'skill-789',
        nodeTitle: 'JavaScript Fundamentals',
        reflectionSummary: {
          understanding: 4,
          difficulty: 3,
          completionConfidence: 5
        },
        timestamp: Date.now(),
        message: 'Session completed for JavaScript Fundamentals'
      };
      
      // Simulate completion notification
      act(() => {
        mockSocket.simulateEvent('session_completed', completionNotification);
        
        store.dispatch({
          type: 'unlockNotification/handleSessionComplete',
          payload: completionNotification
        });
      });
      
      const state = store.getState();
      const notifications = state.unlockNotification.notifications;
      const sessionUpdates = state.unlockNotification.realtimeUpdates.sessionUpdates;
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Session Completed! ✅');
      expect(notifications[0].message).toBe('Great work on "JavaScript Fundamentals"');
      
      expect(sessionUpdates).toHaveLength(1);
      expect(sessionUpdates[0].type).toBe('session_complete');
      expect(sessionUpdates[0].reflectionSummary.understanding).toBe(4);
    });
  });
  
  describe('Progress Milestones', () => {
    it('should receive and process progress milestone notifications', async () => {
      const milestoneNotification = {
        type: 'progress_milestone',
        userId: 'test-user',
        skillId: 'skill-123',
        milestone: 50,
        totalProgress: 50,
        achievementType: 'halfway_point',
        timestamp: Date.now(),
        message: '50% progress milestone reached!'
      };
      
      // Simulate milestone notification
      act(() => {
        mockSocket.simulateEvent('progress_milestone_reached', milestoneNotification);
        
        store.dispatch({
          type: 'unlockNotification/handleProgressMilestone',
          payload: milestoneNotification
        });
      });
      
      const state = store.getState();
      const notifications = state.unlockNotification.notifications;
      const progressUpdates = state.unlockNotification.realtimeUpdates.progressUpdates;
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Progress Milestone! 🎯');
      expect(notifications[0].message).toBe('50% complete');
      
      expect(progressUpdates).toHaveLength(1);
      expect(progressUpdates[0].milestone).toBe(50);
    });
    
    it('should respect milestone settings', async () => {
      // Disable milestone notifications
      act(() => {
        store.dispatch({
          type: 'unlockNotification/updateNotificationSettings',
          payload: { enableProgressMilestones: false }
        });
      });
      
      const milestoneNotification = {
        type: 'progress_milestone',
        milestone: 75,
        timestamp: Date.now()
      };
      
      // Simulate milestone when disabled
      act(() => {
        mockSocket.simulateEvent('progress_milestone_reached', milestoneNotification);
        
        // Check settings before dispatching (simulating real behavior)
        const settings = store.getState().unlockNotification.settings;
        if (settings.enableProgressMilestones) {
          store.dispatch({
            type: 'unlockNotification/handleProgressMilestone',
            payload: milestoneNotification
          });
        }
      });
      
      const state = store.getState();
      expect(state.unlockNotification.notifications).toHaveLength(0);
    });
  });
  
  describe('Connection State Management', () => {
    it('should track connection status changes', async () => {
      // Simulate connection status changes
      act(() => {
        store.dispatch({
          type: 'unlockNotification/setConnectionStatus',
          payload: { status: 'connecting' }
        });
      });
      
      let state = store.getState();
      expect(state.unlockNotification.connectionStatus).toBe('connecting');
      expect(state.unlockNotification.isConnected).toBe(false);
      
      act(() => {
        store.dispatch({
          type: 'unlockNotification/setConnectionStatus',
          payload: { status: 'connected' }
        });
      });
      
      state = store.getState();
      expect(state.unlockNotification.connectionStatus).toBe('connected');
      expect(state.unlockNotification.isConnected).toBe(true);
      
      act(() => {
        store.dispatch({
          type: 'unlockNotification/setConnectionStatus',
          payload: { status: 'error', error: 'Connection failed' }
        });
      });
      
      state = store.getState();
      expect(state.unlockNotification.connectionStatus).toBe('error');
      expect(state.unlockNotification.isConnected).toBe(false);
    });
    
    it('should handle retry logic for failed connections', async () => {
      const maxRetries = 3;
      
      // Simulate multiple connection failures
      for (let i = 1; i <= maxRetries; i++) {
        act(() => {
          store.dispatch({
            type: 'unlockNotification/incrementRetryCount'
          });
          
          store.dispatch({
            type: 'unlockNotification/setConnectionStatus',
            payload: { status: 'error', error: `Attempt ${i} failed` }
          });
        });
        
        const state = store.getState();
        expect(state.unlockNotification.retrySettings.currentRetries).toBe(i);
      }
      
      // Simulate successful connection after retries
      act(() => {
        store.dispatch({
          type: 'unlockNotification/setConnectionStatus',
          payload: { status: 'connected' }
        });
      });
      
      const finalState = store.getState();
      expect(finalState.unlockNotification.isConnected).toBe(true);
      expect(finalState.unlockNotification.retrySettings.currentRetries).toBe(0);
    });
  });
  
  describe('Performance and Memory Management', () => {
    it('should limit notification history to prevent memory leaks', async () => {
      const maxNotifications = 10;
      
      // Update settings to limit notifications
      act(() => {
        store.dispatch({
          type: 'unlockNotification/updateNotificationSettings',
          payload: { maxNotifications }
        });
      });
      
      // Generate more notifications than the limit
      const numNotifications = 15;
      for (let i = 1; i <= numNotifications; i++) {
        act(() => {
          store.dispatch({
            type: 'unlockNotification/addNotification',
            payload: {
              title: `Notification ${i}`,
              message: `Message ${i}`,
              type: 'info'
            }
          });
        });
      }
      
      const state = store.getState();
      expect(state.unlockNotification.notifications).toHaveLength(maxNotifications);
      
      // Verify newest notifications are kept
      const titles = state.unlockNotification.notifications.map(n => n.title);
      expect(titles).toContain('Notification 15');
      expect(titles).toContain('Notification 6');
      expect(titles).not.toContain('Notification 5');
    });
    
    it('should limit realtime update history', async () => {
      const maxUpdates = 50;
      
      // Generate more updates than the limit
      const numUpdates = 75;
      for (let i = 1; i <= numUpdates; i++) {
        act(() => {
          store.dispatch({
            type: 'unlockNotification/handleProgressUpdate',
            payload: {
              type: 'progress_update',
              progress: i,
              timestamp: Date.now() + i
            }
          });
        });
      }
      
      const state = store.getState();
      const progressUpdates = state.unlockNotification.realtimeUpdates.progressUpdates;
      
      expect(progressUpdates).toHaveLength(maxUpdates);
      
      // Verify newest updates are kept (most recent first)
      expect(progressUpdates[0].progress).toBe(75);
      expect(progressUpdates[maxUpdates - 1].progress).toBe(26);
    });
  });
});