import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { sessionAPI } from '../../api/client';

// Async thunks for session management
export const startSession = createAsyncThunk(
  'sessionManagement/startSession',
  async ({ nodeId, skillId }, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.startSession(nodeId, skillId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateSessionProgress = createAsyncThunk(
  'sessionManagement/updateProgress',
  async ({ sessionId, progress, action, metadata }, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.updateProgress(sessionId, progress, action, metadata);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const completeSession = createAsyncThunk(
  'sessionManagement/completeSession',
  async ({ sessionId, reflectionData }, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.completeSession(sessionId, reflectionData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getActiveSession = createAsyncThunk(
  'sessionManagement/getActiveSession',
  async (_, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.getActiveSession();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getSessionHistory = createAsyncThunk(
  'sessionManagement/getSessionHistory',
  async (nodeId, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.getSessionHistory(nodeId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const recoverSession = createAsyncThunk(
  'sessionManagement/recoverSession',
  async (sessionId, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.recoverSession(sessionId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const abandonSession = createAsyncThunk(
  'sessionManagement/abandonSession',
  async (sessionId, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.abandonSession(sessionId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  // Active session tracking
  activeSession: null, // Current learning session
  
  // Session history
  sessionHistory: {}, // { nodeId: [sessions] }
  
  // Session progress tracking
  sessionProgress: {}, // { sessionId: { progress, checkpoints, duration } }
  
  // Session timers (for UI display)
  sessionTimers: {}, // { sessionId: { startTime, elapsed, isRunning } }
  
  // Loading states
  loading: {
    startSession: false,
    updateProgress: false,
    completeSession: false,
    getActiveSession: false,
    getSessionHistory: false,
    recoverSession: false,
    abandonSession: false,
  },
  
  // Error states
  errors: {
    startSession: null,
    updateProgress: null,
    completeSession: null,
    getActiveSession: null,
    getSessionHistory: null,
    recoverSession: null,
    abandonSession: null,
  },
  
  // Session state integration with node progression
  nodeProgressIntegration: {}, // { nodeId: { progressionStatus, unlockEligibility, completionCriteria } }
  
  // Enhanced session tracking
  sessionMetrics: {}, // { sessionId: { focusTime, distractionCount, effectivenessScore } }
  
  // Real-time session updates
  realtimeSessionUpdates: {
    progressUpdates: [], // Recent progress update events
    reflectionUpdates: [], // Recent reflection submissions
    completionEvents: [], // Recent session completion events
  },
  
  // Session settings
  settings: {
    autoSaveInterval: 30000, // 30 seconds
    sessionTimeoutWarning: 3.5 * 60 * 60 * 1000, // 3.5 hours in ms
    sessionTimeout: 4 * 60 * 60 * 1000, // 4 hours in ms
    soundEnabled: true,
    enableProgressTracking: true,
    enableRealtimeUpdates: true,
  },
  
  // Last updated timestamps
  lastUpdated: {
    activeSession: null,
    sessionHistory: {},
  },
};

const sessionManagementSlice = createSlice({
  name: 'sessionManagement',
  initialState,
  reducers: {
    // Session timer management
    startSessionTimer: (state, action) => {
      const { sessionId } = action.payload;
      state.sessionTimers[sessionId] = {
        startTime: Date.now(),
        elapsed: 0,
        isRunning: true,
      };
    },
    
    pauseSessionTimer: (state, action) => {
      const { sessionId } = action.payload;
      if (state.sessionTimers[sessionId]) {
        state.sessionTimers[sessionId].isRunning = false;
      }
    },
    
    resumeSessionTimer: (state, action) => {
      const { sessionId } = action.payload;
      if (state.sessionTimers[sessionId]) {
        state.sessionTimers[sessionId].isRunning = true;
        state.sessionTimers[sessionId].startTime = Date.now() - state.sessionTimers[sessionId].elapsed;
      }
    },
    
    updateSessionTimer: (state, action) => {
      const { sessionId, elapsed } = action.payload;
      if (state.sessionTimers[sessionId]) {
        state.sessionTimers[sessionId].elapsed = elapsed;
      }
    },
    
    // Session progress updates
    updateLocalProgress: (state, action) => {
      const { sessionId, progress, checkpoint } = action.payload;
      
      if (!state.sessionProgress[sessionId]) {
        state.sessionProgress[sessionId] = {
          progress: 0,
          checkpoints: [],
          duration: 0,
        };
      }
      
      state.sessionProgress[sessionId].progress = progress;
      
      if (checkpoint) {
        state.sessionProgress[sessionId].checkpoints.push({
          timestamp: Date.now(),
          progress,
          ...checkpoint,
        });
      }
    },
    
    // Session state management
    setActiveSession: (state, action) => {
      state.activeSession = action.payload;
      state.lastUpdated.activeSession = Date.now();
    },
    
    clearActiveSession: (state) => {
      if (state.activeSession) {
        // Clean up timer
        delete state.sessionTimers[state.activeSession.id];
        delete state.sessionProgress[state.activeSession.id];
      }
      state.activeSession = null;
      state.lastUpdated.activeSession = Date.now();
    },
    
    // Node progression integration
    updateNodeProgressIntegration: (state, action) => {
      const { nodeId, integrationData } = action.payload;
      state.nodeProgressIntegration[nodeId] = {
        ...state.nodeProgressIntegration[nodeId],
        ...integrationData,
      };
    },
    
    updateSessionMetrics: (state, action) => {
      const { sessionId, metrics } = action.payload;
      state.sessionMetrics[sessionId] = {
        ...state.sessionMetrics[sessionId],
        ...metrics,
      };
    },
    
    addRealtimeSessionUpdate: (state, action) => {
      const { type, data } = action.payload;
      const update = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        ...data,
      };
      
      if (state.realtimeSessionUpdates[type]) {
        state.realtimeSessionUpdates[type].unshift(update);
        
        // Keep only recent updates (last 50)
        if (state.realtimeSessionUpdates[type].length > 50) {
          state.realtimeSessionUpdates[type] = state.realtimeSessionUpdates[type].slice(0, 50);
        }
      }
    },
    
    clearRealtimeSessionUpdates: (state, action) => {
      const updateType = action.payload;
      if (updateType && state.realtimeSessionUpdates[updateType]) {
        state.realtimeSessionUpdates[updateType] = [];
      } else {
        // Clear all updates
        Object.keys(state.realtimeSessionUpdates).forEach(key => {
          state.realtimeSessionUpdates[key] = [];
        });
      }
    },
    
    // Settings management
    updateSessionSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // Error management
    clearSessionErrors: (state, action) => {
      const errorType = action.payload;
      if (errorType) {
        state.errors[errorType] = null;
      } else {
        // Clear all errors
        Object.keys(state.errors).forEach(key => {
          state.errors[key] = null;
        });
      }
    },
    
    // Reset state
    resetSessionManagement: (state) => {
      return { ...initialState, settings: state.settings };
    },
  },
  
  extraReducers: (builder) => {
    // Start Session
    builder
      .addCase(startSession.pending, (state) => {
        state.loading.startSession = true;
        state.errors.startSession = null;
      })
      .addCase(startSession.fulfilled, (state, action) => {
        state.loading.startSession = false;
        state.activeSession = action.payload.session;
        state.lastUpdated.activeSession = Date.now();
        
        // Initialize timer
        state.sessionTimers[action.payload.session.id] = {
          startTime: Date.now(),
          elapsed: 0,
          isRunning: true,
        };
      })
      .addCase(startSession.rejected, (state, action) => {
        state.loading.startSession = false;
        state.errors.startSession = action.payload;
      });
    
    // Update Session Progress
    builder
      .addCase(updateSessionProgress.pending, (state) => {
        state.loading.updateProgress = true;
        state.errors.updateProgress = null;
      })
      .addCase(updateSessionProgress.fulfilled, (state, action) => {
        state.loading.updateProgress = false;
        const { sessionId, progress } = action.payload;
        
        // Update local progress tracking
        if (!state.sessionProgress[sessionId]) {
          state.sessionProgress[sessionId] = {
            progress: 0,
            checkpoints: [],
            duration: 0,
          };
        }
        state.sessionProgress[sessionId].progress = progress;
      })
      .addCase(updateSessionProgress.rejected, (state, action) => {
        state.loading.updateProgress = false;
        state.errors.updateProgress = action.payload;
      });
    
    // Complete Session
    builder
      .addCase(completeSession.pending, (state) => {
        state.loading.completeSession = true;
        state.errors.completeSession = null;
      })
      .addCase(completeSession.fulfilled, (state, action) => {
        state.loading.completeSession = false;
        const { sessionId, completionResult } = action.payload;
        
        // Clear active session if it's the one being completed
        if (state.activeSession && state.activeSession.id === sessionId) {
          delete state.sessionTimers[sessionId];
          delete state.sessionProgress[sessionId];
          state.activeSession = null;
        }
        
        state.lastUpdated.activeSession = Date.now();
      })
      .addCase(completeSession.rejected, (state, action) => {
        state.loading.completeSession = false;
        state.errors.completeSession = action.payload;
      });
    
    // Get Active Session
    builder
      .addCase(getActiveSession.pending, (state) => {
        state.loading.getActiveSession = true;
        state.errors.getActiveSession = null;
      })
      .addCase(getActiveSession.fulfilled, (state, action) => {
        state.loading.getActiveSession = false;
        state.activeSession = action.payload.session;
        state.lastUpdated.activeSession = Date.now();
        
        // Restore timer if session exists
        if (action.payload.session) {
          const sessionId = action.payload.session.id;
          const sessionStartTime = new Date(action.payload.session.startTime).getTime();
          const elapsed = Date.now() - sessionStartTime;
          
          state.sessionTimers[sessionId] = {
            startTime: sessionStartTime,
            elapsed,
            isRunning: action.payload.session.status === 'active',
          };
        }
      })
      .addCase(getActiveSession.rejected, (state, action) => {
        state.loading.getActiveSession = false;
        state.errors.getActiveSession = action.payload;
      });
    
    // Get Session History
    builder
      .addCase(getSessionHistory.pending, (state) => {
        state.loading.getSessionHistory = true;
        state.errors.getSessionHistory = null;
      })
      .addCase(getSessionHistory.fulfilled, (state, action) => {
        state.loading.getSessionHistory = false;
        const { nodeId, sessions } = action.payload;
        state.sessionHistory[nodeId] = sessions;
        state.lastUpdated.sessionHistory[nodeId] = Date.now();
      })
      .addCase(getSessionHistory.rejected, (state, action) => {
        state.loading.getSessionHistory = false;
        state.errors.getSessionHistory = action.payload;
      });
    
    // Recover Session
    builder
      .addCase(recoverSession.pending, (state) => {
        state.loading.recoverSession = true;
        state.errors.recoverSession = null;
      })
      .addCase(recoverSession.fulfilled, (state, action) => {
        state.loading.recoverSession = false;
        state.activeSession = action.payload.session;
        state.lastUpdated.activeSession = Date.now();
        
        // Restore timer
        const sessionId = action.payload.session.id;
        const sessionStartTime = new Date(action.payload.session.startTime).getTime();
        const elapsed = Date.now() - sessionStartTime;
        
        state.sessionTimers[sessionId] = {
          startTime: sessionStartTime,
          elapsed,
          isRunning: true,
        };
      })
      .addCase(recoverSession.rejected, (state, action) => {
        state.loading.recoverSession = false;
        state.errors.recoverSession = action.payload;
      });
    
    // Abandon Session
    builder
      .addCase(abandonSession.pending, (state) => {
        state.loading.abandonSession = true;
        state.errors.abandonSession = null;
      })
      .addCase(abandonSession.fulfilled, (state, action) => {
        state.loading.abandonSession = false;
        const { sessionId } = action.payload;
        
        // Clear session if it's the active one
        if (state.activeSession && state.activeSession.id === sessionId) {
          delete state.sessionTimers[sessionId];
          delete state.sessionProgress[sessionId];
          state.activeSession = null;
        }
        
        state.lastUpdated.activeSession = Date.now();
      })
      .addCase(abandonSession.rejected, (state, action) => {
        state.loading.abandonSession = false;
        state.errors.abandonSession = action.payload;
      });
  },
});

export const {
  startSessionTimer,
  pauseSessionTimer,
  resumeSessionTimer,
  updateSessionTimer,
  updateLocalProgress,
  setActiveSession,
  clearActiveSession,
  updateNodeProgressIntegration,
  updateSessionMetrics,
  addRealtimeSessionUpdate,
  clearRealtimeSessionUpdates,
  updateSessionSettings,
  clearSessionErrors,
  resetSessionManagement,
} = sessionManagementSlice.actions;

// Selectors
export const selectActiveSession = (state) => state.sessionManagement.activeSession;
export const selectSessionHistory = (state, nodeId) => state.sessionManagement.sessionHistory[nodeId] || [];
export const selectSessionProgress = (state, sessionId) => state.sessionManagement.sessionProgress[sessionId];
export const selectSessionTimer = (state, sessionId) => state.sessionManagement.sessionTimers[sessionId];
export const selectNodeProgressIntegration = (state, nodeId) => state.sessionManagement.nodeProgressIntegration[nodeId];
export const selectSessionMetrics = (state, sessionId) => state.sessionManagement.sessionMetrics[sessionId];
export const selectRealtimeSessionUpdates = (state) => state.sessionManagement.realtimeSessionUpdates;
export const selectSessionSettings = (state) => state.sessionManagement.settings;
export const selectSessionLoading = (state) => state.sessionManagement.loading;
export const selectSessionErrors = (state) => state.sessionManagement.errors;

// Complex selectors
export const selectSessionDuration = (state, sessionId) => {
  const timer = state.sessionManagement.sessionTimers[sessionId];
  if (!timer) return 0;
  
  if (timer.isRunning) {
    return Date.now() - timer.startTime;
  }
  return timer.elapsed;
};

export const selectIsSessionActive = (state) => {
  return state.sessionManagement.activeSession !== null;
};

export const selectSessionTimeoutWarning = (state) => {
  const activeSession = state.sessionManagement.activeSession;
  if (!activeSession) return false;
  
  const timer = state.sessionManagement.sessionTimers[activeSession.id];
  if (!timer) return false;
  
  const duration = timer.isRunning ? Date.now() - timer.startTime : timer.elapsed;
  return duration >= state.sessionManagement.settings.sessionTimeoutWarning;
};

export const selectShouldTimeoutSession = (state) => {
  const activeSession = state.sessionManagement.activeSession;
  if (!activeSession) return false;
  
  const timer = state.sessionManagement.sessionTimers[activeSession.id];
  if (!timer) return false;
  
  const duration = timer.isRunning ? Date.now() - timer.startTime : timer.elapsed;
  return duration >= state.sessionManagement.settings.sessionTimeout;
};

// Enhanced selectors for session management
export const selectSessionProgressWithMetrics = (state, sessionId) => {
  const progress = state.sessionManagement.sessionProgress[sessionId];
  const metrics = state.sessionManagement.sessionMetrics[sessionId];
  
  if (!progress) return null;
  
  return {
    ...progress,
    metrics: metrics || {},
    effectivenessScore: metrics?.effectivenessScore || 0,
    focusTime: metrics?.focusTime || 0,
    distractionCount: metrics?.distractionCount || 0,
  };
};

export const selectSessionCompletionEligibility = (state, nodeId) => {
  const activeSession = state.sessionManagement.activeSession;
  const nodeIntegration = state.sessionManagement.nodeProgressIntegration[nodeId];
  const sessionHistory = state.sessionManagement.sessionHistory[nodeId] || [];
  
  if (!activeSession || activeSession.nodeId !== nodeId) return null;
  
  const sessionProgress = state.sessionManagement.sessionProgress[activeSession.id];
  const sessionMetrics = state.sessionManagement.sessionMetrics[activeSession.id];
  
  const completedSessions = sessionHistory.filter(s => s.status === 'completed').length;
  const averageReflectionScore = sessionHistory.length > 0 
    ? sessionHistory.reduce((sum, s) => sum + (s.reflection?.understanding || 0), 0) / sessionHistory.length
    : 0;
  
  return {
    isEligible: sessionProgress?.progress >= 80 && (sessionMetrics?.effectivenessScore || 0) >= 60,
    progress: sessionProgress?.progress || 0,
    effectivenessScore: sessionMetrics?.effectivenessScore || 0,
    completedSessions,
    averageReflectionScore,
    progressionStatus: nodeIntegration?.progressionStatus,
    unlockEligibility: nodeIntegration?.unlockEligibility,
  };
};

export const selectRecentSessionActivity = (state, timeWindow = 5 * 60 * 1000) => {
  const cutoff = Date.now() - timeWindow;
  const updates = state.sessionManagement.realtimeSessionUpdates;
  
  return {
    progressUpdates: updates.progressUpdates.filter(u => u.timestamp > cutoff),
    reflectionUpdates: updates.reflectionUpdates.filter(u => u.timestamp > cutoff),
    completionEvents: updates.completionEvents.filter(u => u.timestamp > cutoff),
  };
};

export const selectSessionPerformanceStats = (state, sessionId) => {
  const progress = state.sessionManagement.sessionProgress[sessionId];
  const metrics = state.sessionManagement.sessionMetrics[sessionId];
  const timer = state.sessionManagement.sessionTimers[sessionId];
  
  if (!progress || !timer) return null;
  
  const duration = timer.isRunning ? Date.now() - timer.startTime : timer.elapsed;
  const checkpoints = progress.checkpoints || [];
  
  return {
    duration,
    progress: progress.progress,
    checkpointCount: checkpoints.length,
    averageProgressPerCheckpoint: checkpoints.length > 0 ? progress.progress / checkpoints.length : 0,
    focusTime: metrics?.focusTime || 0,
    focusPercentage: duration > 0 ? ((metrics?.focusTime || 0) / duration) * 100 : 0,
    effectivenessScore: metrics?.effectivenessScore || 0,
    distractionCount: metrics?.distractionCount || 0,
  };
};

export default sessionManagementSlice.reducer;