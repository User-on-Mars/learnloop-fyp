import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useActiveSession } from '../useActiveSession';
import sessionManagementReducer from '../../store/slices/sessionManagementSlice';

// Mock the API
vi.mock('../../services/api', () => ({
  sessionAPI: {
    startSession: vi.fn(),
    completeSession: vi.fn(),
    getActiveSession: vi.fn(),
    recoverSession: vi.fn(),
    abandonSession: vi.fn(),
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

describe('useActiveSession', () => {
  let store;
  
  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });
  
  it('should initialize with no active session', () => {
    const { result } = renderHook(() => useActiveSession(), {
      wrapper: createWrapper(store)
    });
    
    expect(result.current.activeSession).toBeNull();
    expect(result.current.isSessionActive).toBe(false);
    expect(result.current.sessionDuration).toBe(0);
  });
  
  it('should provide session management functions', () => {
    const { result } = renderHook(() => useActiveSession(), {
      wrapper: createWrapper(store)
    });
    
    expect(typeof result.current.startSession).toBe('function');
    expect(typeof result.current.completeSession).toBe('function');
    expect(typeof result.current.pauseSession).toBe('function');
    expect(typeof result.current.resumeSession).toBe('function');
    expect(typeof result.current.abandonSession).toBe('function');
  });
  
  it('should provide utility functions', () => {
    const { result } = renderHook(() => useActiveSession(), {
      wrapper: createWrapper(store)
    });
    
    expect(typeof result.current.formatDuration).toBe('function');
    expect(typeof result.current.getSessionProgress).toBe('function');
    expect(typeof result.current.isSessionPaused).toBe('function');
    expect(typeof result.current.getTimeRemaining).toBe('function');
  });
  
  it('should format duration correctly', () => {
    const { result } = renderHook(() => useActiveSession(), {
      wrapper: createWrapper(store)
    });
    
    expect(result.current.formatDuration(0)).toBe('0:00');
    expect(result.current.formatDuration(60000)).toBe('1:00');
    expect(result.current.formatDuration(3661000)).toBe('1:01:01');
  });
  
  it('should handle session state changes', () => {
    const { result } = renderHook(() => useActiveSession(), {
      wrapper: createWrapper(store)
    });
    
    const mockSession = {
      id: 'session1',
      nodeId: 'node1',
      skillId: 'skill1',
      status: 'active',
      startTime: new Date().toISOString()
    };
    
    act(() => {
      store.dispatch({
        type: 'sessionManagement/setActiveSession',
        payload: mockSession
      });
    });
    
    expect(result.current.activeSession).toEqual(mockSession);
    expect(result.current.isSessionActive).toBe(true);
  });
});