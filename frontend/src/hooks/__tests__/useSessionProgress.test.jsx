/*  */import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useSessionProgress } from '../useSessionProgress';
import sessionManagementReducer from '../../store/slices/sessionManagementSlice';

// Mock the API
vi.mock('../../services/api', () => ({
  sessionAPI: {
    updateProgress: vi.fn(),
    getSessionHistory: vi.fn(),
  }
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
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

describe('useSessionProgress', () => {
  let store;
  
  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });
  
  it('should initialize with no session progress', () => {
    const { result } = renderHook(() => useSessionProgress(), {
      wrapper: createWrapper(store)
    });
    
    expect(result.current.sessionProgress).toBeNull();
    expect(result.current.sessionHistory).toEqual([]);
  });
  
  it('should provide progress management functions', () => {
    const { result } = renderHook(() => useSessionProgress(), {
      wrapper: createWrapper(store)
    });
    
    expect(typeof result.current.updateProgress).toBe('function');
    expect(typeof result.current.saveProgress).toBe('function');
    expect(typeof result.current.addCheckpoint).toBe('function');
    expect(typeof result.current.loadSessionHistory).toBe('function');
  });
  
  it('should provide utility functions', () => {
    const { result } = renderHook(() => useSessionProgress(), {
      wrapper: createWrapper(store)
    });
    
    expect(typeof result.current.calculateProgressPercentage).toBe('function');
    expect(typeof result.current.getProgressStats).toBe('function');
    expect(typeof result.current.getRecentCheckpoints).toBe('function');
    expect(typeof result.current.getProgressTrend).toBe('function');
  });
  
  it('should calculate progress percentage correctly', () => {
    const { result } = renderHook(() => useSessionProgress(), {
      wrapper: createWrapper(store)
    });
    
    expect(result.current.calculateProgressPercentage(0, 100)).toBe(0);
    expect(result.current.calculateProgressPercentage(50, 100)).toBe(50);
    expect(result.current.calculateProgressPercentage(100, 100)).toBe(100);
    expect(result.current.calculateProgressPercentage(150, 100)).toBe(100); // Capped at 100
    expect(result.current.calculateProgressPercentage(50, 0)).toBe(0); // Handle division by zero
  });
  
  it('should handle session progress updates', () => {
    const { result } = renderHook(() => useSessionProgress(), {
      wrapper: createWrapper(store)
    });
    
    // Set up an active session first
    const mockSession = {
      id: 'session1',
      nodeId: 'node1',
      skillId: 'skill1',
      status: 'active'
    };
    
    act(() => {
      store.dispatch({
        type: 'sessionManagement/setActiveSession',
        payload: mockSession
      });
    });
    
    // Update progress
    act(() => {
      result.current.updateProgress(75, {
        action: 'manual_update',
        timestamp: Date.now()
      });
    });
    
    const state = store.getState();
    const sessionProgress = state.sessionManagement.sessionProgress['session1'];
    
    expect(sessionProgress?.progress).toBe(75);
  });
  
  it('should get progress stats correctly', () => {
    const { result } = renderHook(() => useSessionProgress(), {
      wrapper: createWrapper(store)
    });
    
    // Set up session progress with checkpoints
    act(() => {
      store.dispatch({
        type: 'sessionManagement/updateLocalProgress',
        payload: {
          sessionId: 'session1',
          progress: 60,
          checkpoint: {
            action: 'checkpoint',
            completed: true,
            timestamp: Date.now()
          }
        }
      });
    });
    
    const stats = result.current.getProgressStats();
    expect(stats).toBeNull(); // No active session set
  });
});