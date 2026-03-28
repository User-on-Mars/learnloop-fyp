import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect, useRef } from 'react';
import {
  startSession,
  completeSession,
  getActiveSession,
  recoverSession,
  abandonSession,
  startSessionTimer,
  pauseSessionTimer,
  resumeSessionTimer,
  updateSessionTimer,
  clearActiveSession,
  updateNodeProgressIntegration,
  updateSessionMetrics,
  addRealtimeSessionUpdate,
  selectActiveSession,
  selectSessionTimer,
  selectSessionDuration,
  selectIsSessionActive,
  selectSessionTimeoutWarning,
  selectShouldTimeoutSession,
  selectNodeProgressIntegration,
  selectSessionMetrics,
  selectSessionCompletionEligibility,
  selectSessionLoading,
  selectSessionErrors,
} from '../store/slices/sessionManagementSlice';
import {
  selectNodeById,
  selectLinearProgression,
  selectNodeCompletionRequirements,
  updateLinearProgression,
  updateNodeSessionData,
  processLinearUnlock,
} from '../store/slices/nodeProgressionSlice';
import {
  handleSessionComplete,
  handleProgressMilestone,
  addSystemNotification,
} from '../store/slices/unlockNotificationSlice';

/**
 * Hook for managing active learning sessions with linear progression support
 * Provides session lifecycle management, timer functionality, timeout handling,
 * and integration with node progression system
 */
export const useActiveSession = () => {
  const dispatch = useDispatch();
  const timerRef = useRef(null);
  const progressTrackingRef = useRef(null);
  
  // Selectors
  const activeSession = useSelector(selectActiveSession);
  const sessionTimer = useSelector(state => 
    activeSession ? selectSessionTimer(state, activeSession.id) : null
  );
  const sessionDuration = useSelector(state => 
    activeSession ? selectSessionDuration(state, activeSession.id) : 0
  );
  const isSessionActive = useSelector(selectIsSessionActive);
  const timeoutWarning = useSelector(selectSessionTimeoutWarning);
  const shouldTimeout = useSelector(selectShouldTimeoutSession);
  const loading = useSelector(selectSessionLoading);
  const errors = useSelector(selectSessionErrors);
  
  // Node progression integration
  const currentNode = useSelector(state => 
    activeSession ? selectNodeById(state, activeSession.nodeId) : null
  );
  const nodeProgressIntegration = useSelector(state => 
    activeSession ? selectNodeProgressIntegration(state, activeSession.nodeId) : null
  );
  const sessionMetrics = useSelector(state => 
    activeSession ? selectSessionMetrics(state, activeSession.id) : null
  );
  const completionEligibility = useSelector(state => 
    activeSession ? selectSessionCompletionEligibility(state, activeSession.nodeId) : null
  );
  const nodeCompletionRequirements = useSelector(state => 
    activeSession ? selectNodeCompletionRequirements(state, activeSession.nodeId) : null
  );
  const linearProgression = useSelector(state => 
    activeSession && currentNode ? selectLinearProgression(state, currentNode.skillId) : null
  );
  
  // Timer management
  useEffect(() => {
    if (activeSession && sessionTimer?.isRunning) {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - sessionTimer.startTime;
        dispatch(updateSessionTimer({
          sessionId: activeSession.id,
          elapsed
        }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeSession, sessionTimer?.isRunning, dispatch]);
  
  // Auto-timeout handling
  useEffect(() => {
    if (shouldTimeout && activeSession) {
      console.warn('Session timeout reached, automatically abandoning session');
      handleAbandonSession(activeSession.id);
    }
  }, [shouldTimeout, activeSession]);
  
  // Enhanced session management functions with linear progression support
  const handleStartSession = useCallback(async (nodeId, skillId, options = {}) => {
    try {
      const result = await dispatch(startSession({ 
        nodeId, 
        skillId,
        ...options 
      })).unwrap();
      
      // Start the timer
      dispatch(startSessionTimer({ sessionId: result.session.id }));
      
      // Initialize node progress integration
      dispatch(updateNodeProgressIntegration({
        nodeId,
        integrationData: {
          sessionStarted: true,
          startTime: Date.now(),
          progressionStatus: 'in_progress',
        }
      }));
      
      // Initialize session metrics
      dispatch(updateSessionMetrics({
        sessionId: result.session.id,
        metrics: {
          focusTime: 0,
          distractionCount: 0,
          effectivenessScore: 100,
          startTime: Date.now(),
        }
      }));
      
      // Add realtime update
      dispatch(addRealtimeSessionUpdate({
        type: 'progressUpdates',
        data: {
          sessionId: result.session.id,
          nodeId,
          action: 'session_started',
          timestamp: Date.now(),
        }
      }));
      
      return result;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }, [dispatch]);
  
  const handleCompleteSession = useCallback(async (sessionId, reflectionData) => {
    try {
      // Pause timer before completing
      if (sessionTimer?.isRunning) {
        dispatch(pauseSessionTimer({ sessionId }));
      }
      
      const result = await dispatch(completeSession({ sessionId, reflectionData })).unwrap();
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Update node session data
      if (activeSession) {
        dispatch(updateNodeSessionData({
          nodeId: activeSession.nodeId,
          sessionData: {
            sessionCount: (nodeCompletionRequirements?.sessionCount || 0) + 1,
            totalTimeSpent: (nodeCompletionRequirements?.totalTimeSpent || 0) + sessionDuration,
            averageReflectionScore: reflectionData.understanding,
            lastSessionAt: Date.now(),
          }
        }));
        
        // Update node progress integration
        dispatch(updateNodeProgressIntegration({
          nodeId: activeSession.nodeId,
          integrationData: {
            sessionCompleted: true,
            completionTime: Date.now(),
            reflectionScore: reflectionData.understanding,
            progressionStatus: result.nodeCompleted ? 'completed' : 'in_progress',
          }
        }));
        
        // Handle linear progression unlock if node is completed
        if (result.nodeCompleted && result.unlockedNodes?.length > 0) {
          dispatch(processLinearUnlock({
            skillId: currentNode?.skillId,
            completedNodeId: activeSession.nodeId,
            unlockedNodeIds: result.unlockedNodes,
            progressionUpdate: {
              completedNodes: (linearProgression?.completedNodes || 0) + 1,
              currentNodeIndex: (linearProgression?.currentNodeIndex || 0) + 1,
              nextUnlockableNode: result.unlockedNodes[0],
            }
          }));
        }
        
        // Dispatch session completion notification
        dispatch(handleSessionComplete({
          sessionId,
          nodeId: activeSession.nodeId,
          nodeTitle: currentNode?.title,
          reflectionScore: reflectionData.understanding,
          duration: sessionDuration,
          nodeCompleted: result.nodeCompleted,
          unlockedNodes: result.unlockedNodes,
        }));
        
        // Add realtime update
        dispatch(addRealtimeSessionUpdate({
          type: 'completionEvents',
          data: {
            sessionId,
            nodeId: activeSession.nodeId,
            action: 'session_completed',
            nodeCompleted: result.nodeCompleted,
            unlockedNodes: result.unlockedNodes,
            timestamp: Date.now(),
          }
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Failed to complete session:', error);
      // Resume timer if completion failed
      if (sessionTimer && !sessionTimer.isRunning) {
        dispatch(resumeSessionTimer({ sessionId }));
      }
      throw error;
    }
  }, [dispatch, sessionTimer, activeSession, sessionDuration, nodeCompletionRequirements, currentNode, linearProgression]);
  
  const handlePauseSession = useCallback(() => {
    if (activeSession && sessionTimer?.isRunning) {
      dispatch(pauseSessionTimer({ sessionId: activeSession.id }));
    }
  }, [dispatch, activeSession, sessionTimer]);
  
  const handleResumeSession = useCallback(() => {
    if (activeSession && sessionTimer && !sessionTimer.isRunning) {
      dispatch(resumeSessionTimer({ sessionId: activeSession.id }));
    }
  }, [dispatch, activeSession, sessionTimer]);
  
  const handleRecoverSession = useCallback(async (sessionId) => {
    try {
      const result = await dispatch(recoverSession(sessionId)).unwrap();
      
      // Start timer for recovered session
      dispatch(startSessionTimer({ sessionId: result.session.id }));
      
      return result;
    } catch (error) {
      console.error('Failed to recover session:', error);
      throw error;
    }
  }, [dispatch]);
  
  const handleAbandonSession = useCallback(async (sessionId) => {
    try {
      // Pause timer before abandoning
      if (sessionTimer?.isRunning) {
        dispatch(pauseSessionTimer({ sessionId }));
      }
      
      const result = await dispatch(abandonSession(sessionId)).unwrap();
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to abandon session:', error);
      throw error;
    }
  }, [dispatch, sessionTimer]);
  
  const handleLoadActiveSession = useCallback(async () => {
    try {
      const result = await dispatch(getActiveSession()).unwrap();
      
      // If there's an active session, set up the timer
      if (result.session) {
        dispatch(startSessionTimer({ sessionId: result.session.id }));
      }
      
      return result;
    } catch (error) {
      console.error('Failed to load active session:', error);
      throw error;
    }
  }, [dispatch]);
  
  // Enhanced utility functions with linear progression support
  const formatDuration = useCallback((milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }, []);
  
  const getSessionProgress = useCallback(() => {
    if (!activeSession || !sessionTimer) return 0;
    
    // Enhanced progress calculation based on session metrics and node requirements
    const duration = sessionTimer.isRunning ? Date.now() - sessionTimer.startTime : sessionTimer.elapsed;
    const minimumTime = nodeCompletionRequirements?.minimumSessionTime || 300000; // 5 minutes default
    
    // Base progress from time spent
    const timeProgress = Math.min(60, (duration / minimumTime) * 60);
    
    // Additional progress from effectiveness and focus
    const effectivenessBonus = (sessionMetrics?.effectivenessScore || 0) * 0.3;
    const focusBonus = sessionMetrics?.focusTime ? (sessionMetrics.focusTime / duration) * 10 : 0;
    
    return Math.min(100, timeProgress + effectivenessBonus + focusBonus);
  }, [activeSession, sessionTimer, nodeCompletionRequirements, sessionMetrics]);
  
  const getLinearProgressionStatus = useCallback(() => {
    if (!currentNode || !linearProgression) return null;
    
    return {
      currentNodeIndex: linearProgression.currentNodeIndex || 0,
      totalNodes: linearProgression.totalNodes || 0,
      completedNodes: linearProgression.completedNodes || 0,
      progressPercentage: linearProgression.totalNodes > 0 
        ? (linearProgression.completedNodes / linearProgression.totalNodes) * 100 
        : 0,
      nextUnlockableNode: linearProgression.nextUnlockableNode,
      isOnTrack: completionEligibility?.isEligible || false,
    };
  }, [currentNode, linearProgression, completionEligibility]);
  
  const getSessionEffectiveness = useCallback(() => {
    if (!sessionMetrics || !sessionTimer) return null;
    
    const duration = sessionTimer.isRunning ? Date.now() - sessionTimer.startTime : sessionTimer.elapsed;
    const focusPercentage = duration > 0 ? (sessionMetrics.focusTime / duration) * 100 : 0;
    
    return {
      effectivenessScore: sessionMetrics.effectivenessScore || 0,
      focusTime: sessionMetrics.focusTime || 0,
      focusPercentage,
      distractionCount: sessionMetrics.distractionCount || 0,
      averageDistractionsPerHour: duration > 0 ? (sessionMetrics.distractionCount / (duration / 3600000)) : 0,
    };
  }, [sessionMetrics, sessionTimer]);
  
  const canCompleteSession = useCallback(() => {
    if (!activeSession || !completionEligibility) return false;
    
    return completionEligibility.isEligible && 
           completionEligibility.progress >= 80 &&
           completionEligibility.effectivenessScore >= 60;
  }, [activeSession, completionEligibility]);
  
  const getNodeUnlockPreview = useCallback(() => {
    if (!currentNode || !linearProgression || !canCompleteSession()) return null;
    
    // Predict which nodes might unlock upon completion
    const currentIndex = linearProgression.currentNodeIndex || 0;
    const nextNodeIndex = currentIndex + 1;
    
    return {
      willUnlockNext: nextNodeIndex < (linearProgression.totalNodes || 0),
      nextNodeIndex,
      estimatedUnlockTime: Date.now() + (getTimeRemaining() || 0),
    };
  }, [currentNode, linearProgression, canCompleteSession, getTimeRemaining]);
  
  const isSessionPaused = useCallback(() => {
    return activeSession && sessionTimer && !sessionTimer.isRunning;
  }, [activeSession, sessionTimer]);
  
  const getTimeRemaining = useCallback(() => {
    if (!activeSession || !sessionTimer) return null;
    
    const maxDuration = 4 * 60 * 60 * 1000; // 4 hours
    const elapsed = sessionTimer.isRunning ? Date.now() - sessionTimer.startTime : sessionTimer.elapsed;
    const remaining = maxDuration - elapsed;
    
    return Math.max(0, remaining);
  }, [activeSession, sessionTimer]);
  
  return {
    // Session state
    activeSession,
    isSessionActive,
    sessionDuration,
    timeoutWarning,
    shouldTimeout,
    
    // Node progression integration
    currentNode,
    nodeProgressIntegration,
    sessionMetrics,
    completionEligibility,
    nodeCompletionRequirements,
    linearProgression,
    
    // Session management
    startSession: handleStartSession,
    completeSession: handleCompleteSession,
    pauseSession: handlePauseSession,
    resumeSession: handleResumeSession,
    recoverSession: handleRecoverSession,
    abandonSession: handleAbandonSession,
    loadActiveSession: handleLoadActiveSession,
    
    // Enhanced utility functions
    formatDuration,
    getSessionProgress,
    getLinearProgressionStatus,
    getSessionEffectiveness,
    canCompleteSession,
    getNodeUnlockPreview,
    isSessionPaused,
    getTimeRemaining,
    
    // Loading and error states
    loading,
    errors,
  };
};