import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect, useRef } from 'react';
import {
  updateSessionProgress,
  getSessionHistory,
  updateLocalProgress,
  updateSessionMetrics,
  addRealtimeSessionUpdate,
  selectActiveSession,
  selectSessionProgress,
  selectSessionHistory,
  selectSessionSettings,
  selectSessionMetrics,
  selectSessionProgressWithMetrics,
  selectSessionPerformanceStats,
  selectRecentSessionActivity,
  selectSessionLoading,
  selectSessionErrors,
} from '../store/slices/sessionManagementSlice';
import {
  selectNodeById,
  selectLinearProgression,
  selectNodeCompletionRequirements,
  updateNodeProgressIntegration,
} from '../store/slices/nodeProgressionSlice';
import {
  handleProgressMilestone,
  addSystemNotification,
} from '../store/slices/unlockNotificationSlice';

/**
 * Hook for managing session progress tracking and updates with linear progression support
 * Provides progress monitoring, checkpoint management, history access, and node integration
 */
export const useSessionProgress = (nodeId = null) => {
  const dispatch = useDispatch();
  const autoSaveRef = useRef(null);
  const lastSavedProgressRef = useRef(0);
  const milestoneTrackingRef = useRef(new Set());
  
  // Selectors
  const activeSession = useSelector(selectActiveSession);
  const sessionProgress = useSelector(state => 
    activeSession ? selectSessionProgress(state, activeSession.id) : null
  );
  const sessionProgressWithMetrics = useSelector(state => 
    activeSession ? selectSessionProgressWithMetrics(state, activeSession.id) : null
  );
  const sessionHistory = useSelector(state => 
    nodeId ? selectSessionHistory(state, nodeId) : []
  );
  const sessionMetrics = useSelector(state => 
    activeSession ? selectSessionMetrics(state, activeSession.id) : null
  );
  const performanceStats = useSelector(state => 
    activeSession ? selectSessionPerformanceStats(state, activeSession.id) : null
  );
  const recentActivity = useSelector(selectRecentSessionActivity);
  const settings = useSelector(selectSessionSettings);
  const loading = useSelector(selectSessionLoading);
  const errors = useSelector(selectSessionErrors);
  
  // Node progression integration
  const currentNode = useSelector(state => 
    activeSession ? selectNodeById(state, activeSession.nodeId) : null
  );
  const linearProgression = useSelector(state => 
    activeSession && currentNode ? selectLinearProgression(state, currentNode.skillId) : null
  );
  const nodeCompletionRequirements = useSelector(state => 
    activeSession ? selectNodeCompletionRequirements(state, activeSession.nodeId) : null
  );
  
  // Enhanced auto-save with milestone tracking
  useEffect(() => {
    if (activeSession && sessionProgress && settings.autoSaveInterval > 0) {
      autoSaveRef.current = setInterval(() => {
        const currentProgress = sessionProgress.progress;
        
        // Check for milestone achievements
        const milestones = [25, 50, 75, 90];
        milestones.forEach(milestone => {
          if (currentProgress >= milestone && !milestoneTrackingRef.current.has(milestone)) {
            milestoneTrackingRef.current.add(milestone);
            
            // Dispatch milestone notification
            dispatch(handleProgressMilestone({
              sessionId: activeSession.id,
              nodeId: activeSession.nodeId,
              nodeTitle: currentNode?.title,
              milestone,
              progress: currentProgress,
            }));
            
            // Update node progress integration
            dispatch(updateNodeProgressIntegration({
              nodeId: activeSession.nodeId,
              integrationData: {
                milestoneReached: milestone,
                milestoneTime: Date.now(),
                progressionStatus: milestone >= 90 ? 'near_completion' : 'in_progress',
              }
            }));
          }
        });
        
        // Only save if progress has changed significantly (>5% change)
        if (Math.abs(currentProgress - lastSavedProgressRef.current) >= 5) {
          handleSaveProgress(currentProgress, {
            action: 'auto_save',
            timestamp: Date.now(),
            milestone: milestones.find(m => currentProgress >= m && !milestoneTrackingRef.current.has(m)),
          });
          lastSavedProgressRef.current = currentProgress;
        }
      }, settings.autoSaveInterval);
    }
    
    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
        autoSaveRef.current = null;
      }
    };
  }, [activeSession, sessionProgress, settings.autoSaveInterval, currentNode, dispatch]);
  
  // Enhanced progress management functions
  const handleUpdateProgress = useCallback((progress, checkpoint = null, metrics = {}) => {
    if (!activeSession) {
      console.warn('No active session to update progress for');
      return;
    }
    
    // Update local progress immediately for responsive UI
    dispatch(updateLocalProgress({
      sessionId: activeSession.id,
      progress,
      checkpoint,
    }));
    
    // Update session metrics if provided
    if (Object.keys(metrics).length > 0) {
      dispatch(updateSessionMetrics({
        sessionId: activeSession.id,
        metrics: {
          ...sessionMetrics,
          ...metrics,
          lastUpdated: Date.now(),
        }
      }));
    }
    
    // Add realtime update
    dispatch(addRealtimeSessionUpdate({
      type: 'progressUpdates',
      data: {
        sessionId: activeSession.id,
        nodeId: activeSession.nodeId,
        action: 'progress_updated',
        progress,
        checkpoint,
        metrics,
        timestamp: Date.now(),
      }
    }));
    
    // Update node progress integration
    dispatch(updateNodeProgressIntegration({
      nodeId: activeSession.nodeId,
      integrationData: {
        currentProgress: progress,
        lastProgressUpdate: Date.now(),
        progressionStatus: progress >= 90 ? 'near_completion' : 'in_progress',
        unlockEligibility: progress >= 80 && (metrics.effectivenessScore || 0) >= 60,
      }
    }));
  }, [dispatch, activeSession, sessionMetrics]);
  
  const handleSaveProgress = useCallback(async (progress, metadata = {}) => {
    if (!activeSession) {
      console.warn('No active session to save progress for');
      return;
    }
    
    try {
      const result = await dispatch(updateSessionProgress({
        sessionId: activeSession.id,
        progress,
        action: metadata.action || 'manual_save',
        metadata,
      })).unwrap();
      
      return result;
    } catch (error) {
      console.error('Failed to save session progress:', error);
      throw error;
    }
  }, [dispatch, activeSession]);
  
  const handleAddCheckpoint = useCallback((checkpointData) => {
    if (!activeSession || !sessionProgress) {
      console.warn('No active session to add checkpoint for');
      return;
    }
    
    const checkpoint = {
      timestamp: Date.now(),
      progress: sessionProgress.progress,
      ...checkpointData,
    };
    
    dispatch(updateLocalProgress({
      sessionId: activeSession.id,
      progress: sessionProgress.progress,
      checkpoint,
    }));
    
    // Also save to backend
    handleSaveProgress(sessionProgress.progress, {
      action: 'checkpoint',
      checkpoint,
    });
  }, [dispatch, activeSession, sessionProgress, handleSaveProgress]);
  
  const handleLoadSessionHistory = useCallback(async (targetNodeId) => {
    const nodeIdToUse = targetNodeId || nodeId;
    if (!nodeIdToUse) {
      console.warn('No node ID provided to load session history');
      return;
    }
    
    try {
      const result = await dispatch(getSessionHistory(nodeIdToUse)).unwrap();
      return result;
    } catch (error) {
      console.error('Failed to load session history:', error);
      throw error;
    }
  }, [dispatch, nodeId]);
  
  // Enhanced progress calculation utilities
  const calculateProgressPercentage = useCallback((current, total) => {
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (current / total) * 100));
  }, []);
  
  const getProgressStats = useCallback(() => {
    if (!sessionProgressWithMetrics) return null;
    
    const checkpoints = sessionProgressWithMetrics.checkpoints || [];
    const totalCheckpoints = checkpoints.length;
    const completedCheckpoints = checkpoints.filter(cp => cp.completed).length;
    const metrics = sessionProgressWithMetrics.metrics || {};
    
    return {
      currentProgress: sessionProgressWithMetrics.progress,
      totalCheckpoints,
      completedCheckpoints,
      progressPercentage: sessionProgressWithMetrics.progress,
      averageProgressPerCheckpoint: totalCheckpoints > 0 ? sessionProgressWithMetrics.progress / totalCheckpoints : 0,
      effectivenessScore: metrics.effectivenessScore || 0,
      focusTime: metrics.focusTime || 0,
      distractionCount: metrics.distractionCount || 0,
    };
  }, [sessionProgressWithMetrics]);
  
  const getLinearProgressionContext = useCallback(() => {
    if (!currentNode || !linearProgression) return null;
    
    return {
      skillId: currentNode.skillId,
      currentNodeIndex: linearProgression.currentNodeIndex || 0,
      totalNodes: linearProgression.totalNodes || 0,
      completedNodes: linearProgression.completedNodes || 0,
      skillProgressPercentage: linearProgression.totalNodes > 0 
        ? (linearProgression.completedNodes / linearProgression.totalNodes) * 100 
        : 0,
      nextUnlockableNode: linearProgression.nextUnlockableNode,
      nodeCompletionRequirements,
    };
  }, [currentNode, linearProgression, nodeCompletionRequirements]);
  
  const getSessionEffectivenessAnalysis = useCallback(() => {
    if (!performanceStats) return null;
    
    const effectiveness = performanceStats.effectivenessScore;
    const focusPercentage = performanceStats.focusPercentage;
    
    let analysis = 'good';
    let recommendations = [];
    
    if (effectiveness < 60) {
      analysis = 'needs_improvement';
      recommendations.push('Take regular breaks to maintain focus');
      recommendations.push('Minimize distractions in your environment');
    } else if (effectiveness < 80) {
      analysis = 'good';
      recommendations.push('You\'re doing well! Keep up the consistent effort');
    } else {
      analysis = 'excellent';
      recommendations.push('Outstanding focus! You\'re in the zone');
    }
    
    if (focusPercentage < 70) {
      recommendations.push('Try using focus techniques like the Pomodoro method');
    }
    
    return {
      analysis,
      effectiveness,
      focusPercentage,
      recommendations,
      strengths: effectiveness >= 80 ? ['High effectiveness', 'Good focus'] : ['Consistent effort'],
      areasForImprovement: effectiveness < 80 ? ['Focus management', 'Distraction control'] : [],
    };
  }, [performanceStats]);
  
  const predictSessionCompletion = useCallback(() => {
    if (!sessionProgressWithMetrics || !performanceStats) return null;
    
    const currentProgress = sessionProgressWithMetrics.progress;
    const progressRate = performanceStats.averageProgressPerCheckpoint;
    const effectivenessScore = sessionProgressWithMetrics.metrics?.effectivenessScore || 0;
    
    if (progressRate <= 0 || currentProgress >= 100) return null;
    
    const remainingProgress = 100 - currentProgress;
    const estimatedCheckpoints = Math.ceil(remainingProgress / progressRate);
    const averageCheckpointTime = 5 * 60 * 1000; // 5 minutes per checkpoint estimate
    
    // Adjust based on effectiveness
    const effectivenessMultiplier = effectivenessScore >= 80 ? 0.8 : effectivenessScore >= 60 ? 1.0 : 1.3;
    
    const estimatedTimeMs = estimatedCheckpoints * averageCheckpointTime * effectivenessMultiplier;
    
    return {
      estimatedTimeToCompletion: estimatedTimeMs,
      estimatedCheckpoints,
      confidenceLevel: effectivenessScore >= 70 ? 'high' : effectivenessScore >= 50 ? 'medium' : 'low',
      completionProbability: Math.min(95, Math.max(30, effectivenessScore + (currentProgress * 0.3))),
    };
  }, [sessionProgressWithMetrics, performanceStats]);
  
  const getRecentCheckpoints = useCallback((limit = 5) => {
    if (!sessionProgress || !sessionProgress.checkpoints) return [];
    
    return sessionProgress.checkpoints
      .slice(-limit)
      .reverse(); // Most recent first
  }, [sessionProgress]);
  
  const getProgressTrend = useCallback(() => {
    if (!sessionProgress || !sessionProgress.checkpoints || sessionProgress.checkpoints.length < 2) {
      return 'stable';
    }
    
    const checkpoints = sessionProgress.checkpoints;
    const recent = checkpoints.slice(-3); // Last 3 checkpoints
    
    if (recent.length < 2) return 'stable';
    
    const progressDiff = recent[recent.length - 1].progress - recent[0].progress;
    const timeDiff = recent[recent.length - 1].timestamp - recent[0].timestamp;
    
    if (timeDiff === 0) return 'stable';
    
    const rate = progressDiff / (timeDiff / 1000); // Progress per second
    
    if (rate > 0.1) return 'increasing';
    if (rate < -0.1) return 'decreasing';
    return 'stable';
  }, [sessionProgress]);
  
  const estimateTimeToCompletion = useCallback(() => {
    if (!sessionProgress || sessionProgress.progress >= 100) return 0;
    
    const trend = getProgressTrend();
    if (trend !== 'increasing') return null; // Can't estimate if not progressing
    
    const checkpoints = sessionProgress.checkpoints || [];
    if (checkpoints.length < 2) return null;
    
    const recent = checkpoints.slice(-3);
    const progressDiff = recent[recent.length - 1].progress - recent[0].progress;
    const timeDiff = recent[recent.length - 1].timestamp - recent[0].timestamp;
    
    if (progressDiff <= 0 || timeDiff <= 0) return null;
    
    const rate = progressDiff / timeDiff; // Progress per millisecond
    const remainingProgress = 100 - sessionProgress.progress;
    
    return remainingProgress / rate; // Milliseconds to completion
  }, [sessionProgress, getProgressTrend]);
  
  // Session history utilities
  const getSessionStats = useCallback(() => {
    if (!sessionHistory || sessionHistory.length === 0) return null;
    
    const completedSessions = sessionHistory.filter(s => s.status === 'completed');
    const totalDuration = sessionHistory.reduce((sum, s) => sum + (s.duration || 0), 0);
    const averageDuration = sessionHistory.length > 0 ? totalDuration / sessionHistory.length : 0;
    
    const averageReflectionScore = completedSessions.length > 0 
      ? completedSessions.reduce((sum, s) => {
          const reflection = s.reflection;
          if (!reflection) return sum;
          const avgScore = (reflection.understanding + reflection.difficulty + reflection.completionConfidence) / 3;
          return sum + avgScore;
        }, 0) / completedSessions.length
      : 0;
    
    return {
      totalSessions: sessionHistory.length,
      completedSessions: completedSessions.length,
      abandonedSessions: sessionHistory.filter(s => s.status === 'abandoned').length,
      totalDuration,
      averageDuration,
      averageReflectionScore,
    };
  }, [sessionHistory]);
  
  const getLastCompletedSession = useCallback(() => {
    if (!sessionHistory || sessionHistory.length === 0) return null;
    
    const completed = sessionHistory
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
    
    return completed[0] || null;
  }, [sessionHistory]);
  
  return {
    // Progress state
    sessionProgress,
    sessionProgressWithMetrics,
    sessionHistory,
    sessionMetrics,
    performanceStats,
    recentActivity,
    
    // Node progression integration
    currentNode,
    linearProgression,
    nodeCompletionRequirements,
    
    // Progress management
    updateProgress: handleUpdateProgress,
    saveProgress: handleSaveProgress,
    addCheckpoint: handleAddCheckpoint,
    loadSessionHistory: handleLoadSessionHistory,
    
    // Enhanced progress utilities
    calculateProgressPercentage,
    getProgressStats,
    getLinearProgressionContext,
    getSessionEffectivenessAnalysis,
    predictSessionCompletion,
    getRecentCheckpoints,
    getProgressTrend,
    estimateTimeToCompletion,
    
    // Session history utilities
    getSessionStats,
    getLastCompletedSession,
    
    // Loading and error states
    loading,
    errors,
  };
};