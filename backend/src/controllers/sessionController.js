import { z } from 'zod';
import LearningSession from '../models/LearningSession.js';
import SessionCompletionEngine from '../services/SessionCompletionEngine.js';
import SessionManager from '../services/SessionManager.js';
import ErrorHandlingService from '../services/ErrorHandlingService.js';
import ErrorLoggingService from '../services/ErrorLoggingService.js';
import WebSocketService from '../services/WebSocketService.js';
import StreakService from '../services/StreakService.js';
import XpService from '../services/XpService.js';
import { withDatabaseRetry } from '../middleware/errorHandler.js';

// Validation schemas
const startSessionSchema = z.object({
  nodeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid node ID')
});

const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  action: z.string().trim().min(1).max(100),
  metadata: z.record(z.any()).optional().default({})
});

const completeSessionSchema = z.object({
  reflection: z.object({
    understanding: z.number().min(1).max(5),
    difficulty: z.number().min(1).max(5),
    notes: z.string().max(500).optional().default(''),
    completionConfidence: z.number().min(1).max(5),
    wouldRecommend: z.boolean().optional().default(true),
    tags: z.array(z.string().max(50)).optional().default([])
  })
});

/**
 * SessionController - Manages learning sessions and reflection data
 * Implements Requirements: 2.1, 2.2, 2.3, 2.4
 */
class SessionController {
  
  /**
   * POST /sessions/start
   * Start a new learning session with node validation
   */
  static async startSession(req, res) {
    const startTime = Date.now();
    const context = {
      userId: req.user.id,
      operation: 'start_session'
    };

    try {
      const userId = req.user.id;
      
      // Enhanced validation with descriptive error messages
      let validatedData;
      try {
        validatedData = startSessionSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationError = ErrorHandlingService.createValidationError(
            'nodeId',
            req.body.nodeId,
            { type: 'format', format: 'MongoDB ObjectId (24 character hex string)' }
          );
          return res.status(422).json({
            error: 'Validation failed',
            message: 'Invalid node ID format',
            errors: [validationError],
            code: 'VALIDATION_ERROR'
          });
        }
        throw error;
      }
      
      const { nodeId } = validatedData;
      context.nodeId = nodeId;
      
      // Use SessionManager with enhanced error handling
      const result = await withDatabaseRetry(async () => {
        return await SessionManager.startSession(nodeId, userId);
      }, context);
      
      // Log performance metrics
      const duration = Date.now() - startTime;
      await ErrorLoggingService.logPerformance('start_session', duration, context);
      
      res.status(201).json(result);
      
    } catch (error) {
      // Enhanced error logging
      await ErrorLoggingService.logError(error, {
        ...context,
        duration: Date.now() - startTime
      });
      
      // Handle specific session errors with user-friendly messages
      if (error.message.includes('locked node')) {
        const unlockError = new Error(error.message);
        unlockError.code = 'UNLOCK_FORBIDDEN';
        unlockError.status = 403;
        unlockError.nodeId = context.nodeId;
        throw unlockError;
      }
      
      if (error.message.includes('already active')) {
        const sessionError = new Error('Another session is already active. Please complete or abandon the current session first.');
        sessionError.code = 'SESSION_CONFLICT';
        sessionError.status = 409;
        throw sessionError;
      }
      
      // Let error handler middleware handle the response
      throw error;
    }
  }
  
  /**
   * PUT /sessions/{id}/progress
   * Update session progress with tracking
   */
  static async updateProgress(req, res) {
    try {
      const { id: sessionId } = req.params;
      const userId = req.user.id;
      const validatedData = updateProgressSchema.parse(req.body);
      
      // Use SessionManager to update progress
      const result = await SessionManager.updateSession(sessionId, validatedData);
      
      // Broadcast progress update via WebSocket
      if (result.session) {
        try {
          WebSocketService.broadcastSessionProgress(userId, {
            sessionId,
            nodeId: result.session.nodeId,
            skillId: result.session.skillId,
            progress: result.currentProgress,
            action: validatedData.action
          });
        } catch (wsError) {
          // Log WebSocket error but don't fail the request
          await ErrorLoggingService.logError(wsError, {
            userId,
            operation: 'websocket_progress_notification',
            sessionId
          });
        }
      }
      
      res.json(result);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      // Handle timeout errors
      if (error.message.includes('timeout')) {
        return res.status(410).json({ 
          message: error.message 
        });
      }
      
      console.error('Error updating session progress:', error);
      res.status(500).json({ 
        message: 'Failed to update session progress', 
        error: error.message 
      });
    }
  }
  
  /**
   * POST /sessions/{id}/complete
   * Complete session with reflection validation
   */
  static async completeSession(req, res) {
    const startTime = Date.now();
    const context = {
      userId: req.user.id,
      sessionId: req.params.id,
      operation: 'complete_session'
    };

    try {
      const { id: sessionId } = req.params;
      const userId = req.user.id;
      
      // Enhanced reflection data validation
      let validatedData;
      try {
        validatedData = completeSessionSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationErrors = ErrorHandlingService.createReflectionValidationErrors(req.body.reflection || {});
          return res.status(422).json({
            error: 'Reflection validation failed',
            message: 'Please provide valid reflection data to complete your session',
            errors: validationErrors,
            code: 'REFLECTION_VALIDATION_ERROR'
          });
        }
        throw error;
      }
      
      // Use SessionManager with enhanced error handling
      const result = await withDatabaseRetry(async () => {
        return await SessionManager.completeSession(sessionId, validatedData.reflection);
      }, context);
      
      // Broadcast session completion via WebSocket
      if (result.sessionCompleted) {
        try {
          const session = await LearningSession.findById(sessionId);
          WebSocketService.broadcastSessionCompletion(userId, {
            sessionId,
            nodeId: session?.nodeId,
            reflectionData: validatedData.reflection
          });
        } catch (wsError) {
          await ErrorLoggingService.logError(wsError, {
            ...context,
            operation: 'websocket_completion_notification'
          });
        }
      }

      // Award XP for session completion (never blocks response)
      try {
        const minutesPracticed = (result.duration || 0) / 60;
        if (minutesPracticed >= 10) {
          const streakResult = await StreakService.processSession(userId, new Date());
          await XpService.awardXp(userId, 'session_completion', 10);
          if (streakResult.streakCount >= 1) {
            // Cap streak bonus at 35 XP (5 × 7 days max)
            const streakBonus = Math.min(5 * streakResult.streakCount, 35);
            await XpService.awardXp(userId, 'streak_bonus', streakBonus);
          }
        }
      } catch (xpError) {
        await ErrorLoggingService.logError(xpError, {
          ...context,
          operation: 'session_xp_award'
        });
      }
      
      // Log performance metrics
      const duration = Date.now() - startTime;
      await ErrorLoggingService.logPerformance('complete_session', duration, context);
      
      res.json(result);
      
    } catch (error) {
      // Enhanced error logging
      await ErrorLoggingService.logError(error, {
        ...context,
        duration: Date.now() - startTime
      });
      
      // Handle session timeout with recovery options
      if (error.message.includes('timeout')) {
        const timeoutError = ErrorHandlingService.createSessionTimeoutError(
          context.sessionId,
          error.preservedData || {}
        );
        const sessionError = new Error(timeoutError.userFriendly);
        sessionError.code = 'SESSION_TIMEOUT';
        sessionError.status = 410;
        sessionError.sessionId = context.sessionId;
        sessionError.preservedData = timeoutError.preservedData;
        throw sessionError;
      }
      
      // Let error handler middleware handle the response
      throw error;
    }
  }
  
  /**
   * GET /sessions/active
   * Get current active session for user
   */
  static async getActiveSession(req, res) {
    try {
      const userId = req.user.id;
      
      // Use SessionManager to get active session
      const activeSession = await SessionManager.getActiveSession(userId);
      
      if (!activeSession) {
        return res.json({ 
          activeSession: null,
          message: 'No active session found'
        });
      }
      
      res.json({
        activeSession
      });
      
    } catch (error) {
      console.error('Error fetching active session:', error);
      res.status(500).json({ 
        message: 'Failed to fetch active session', 
        error: error.message 
      });
    }
  }
  
  /**
   * GET /sessions/history/{nodeId}
   * Get session history for a specific node
   */
  static async getSessionHistory(req, res) {
    try {
      const { nodeId } = req.params;
      const userId = req.user.id;
      
      // Use SessionManager to get session history
      const result = await SessionManager.getSessionHistory(nodeId, userId);
      
      res.json(result);
      
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          message: error.message 
        });
      }
      
      console.error('Error fetching session history:', error);
      res.status(500).json({ 
        message: 'Failed to fetch session history', 
        error: error.message 
      });
    }
  }

  /**
   * POST /sessions/{id}/recover
   * Recover and resume an abandoned session
   */
  static async recoverSession(req, res) {
    try {
      const { id: sessionId } = req.params;
      const userId = req.user.id;
      
      // Use SessionManager to recover the session
      const result = await SessionManager.recoverSession(sessionId, userId);
      
      res.status(201).json(result);
      
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          message: error.message 
        });
      }
      
      if (error.message.includes('already active')) {
        return res.status(400).json({ 
          message: error.message 
        });
      }
      
      console.error('Error recovering session:', error);
      res.status(500).json({ 
        message: 'Failed to recover session', 
        error: error.message 
      });
    }
  }

  /**
   * POST /sessions/{id}/abandon
   * Manually abandon a session with progress preservation
   */
  static async abandonSession(req, res) {
    try {
      const { id: sessionId } = req.params;
      const userId = req.user.id;
      
      // Find and validate session belongs to user
      const session = await LearningSession.findOne({
        _id: sessionId,
        userId,
        status: 'active'
      });
      
      if (!session) {
        return res.status(404).json({ 
          message: 'Active session not found' 
        });
      }
      
      // Use SessionManager's abandon method
      const result = await SessionManager.abandonSession(sessionId, 'user_request');
      
      res.json(result);
      
    } catch (error) {
      console.error('Error abandoning session:', error);
      res.status(500).json({ 
        message: 'Failed to abandon session', 
        error: error.message 
      });
    }
  }
  
  /**
   * Evaluate if a node should be marked as completed based on session data
   * @param {string} nodeId - The node ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} Completion evaluation result
   */
  static async evaluateNodeCompletion(nodeId, userId) {
    try {
      // Get all completed sessions for this node
      const completedSessions = await LearningSession.find({
        userId,
        nodeId,
        status: 'completed',
        reflection: { $exists: true }
      });
      
      if (completedSessions.length === 0) {
        return {
          shouldComplete: false,
          criteria: {
            hasCompletedSession: false,
            hasReflection: false,
            averageUnderstanding: 0,
            averageConfidence: 0
          }
        };
      }
      
      // Calculate averages from reflection data
      const reflections = completedSessions.map(s => s.reflection);
      const avgUnderstanding = reflections.reduce((sum, r) => sum + r.understanding, 0) / reflections.length;
      const avgConfidence = reflections.reduce((sum, r) => sum + r.completionConfidence, 0) / reflections.length;
      
      // Node completion criteria:
      // - At least one completed session with reflection
      // - Average understanding >= 3
      // - Average completion confidence >= 3
      const shouldComplete = avgUnderstanding >= 3 && avgConfidence >= 3;
      
      return {
        shouldComplete,
        criteria: {
          hasCompletedSession: true,
          hasReflection: true,
          averageUnderstanding: avgUnderstanding,
          averageConfidence: avgConfidence,
          sessionCount: completedSessions.length,
          totalTimeSpent: completedSessions.reduce((sum, s) => sum + s.duration, 0)
        }
      };
      
    } catch (error) {
      console.error('Error evaluating node completion:', error);
      return {
        shouldComplete: false,
        criteria: {
          error: 'Evaluation failed'
        }
      };
    }
  }
}

export default SessionController;