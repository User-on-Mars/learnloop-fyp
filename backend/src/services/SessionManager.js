import LearningSession from '../models/LearningSession.js';
import SessionCompletionEngine from './SessionCompletionEngine.js';
import cacheService from './CacheService.js';

/**
 * SessionManager - Core service for session lifecycle management
 */
class SessionManager {

  static SESSION_TIMEOUT = 14400; // 4 hours in seconds

  static async startSession(nodeId, userId) {
    try {
      // Check for existing active session for this node
      const existingActiveSession = await LearningSession.findOne({ userId, nodeId, status: 'active' });

      if (existingActiveSession) {
        const sessionAge = Math.floor((Date.now() - existingActiveSession.startTime.getTime()) / 1000);
        if (sessionAge > this.SESSION_TIMEOUT) {
          await this.abandonSession(existingActiveSession._id, 'timeout');
        } else {
          return {
            sessionId: existingActiveSession._id,
            nodeId,
            startTime: existingActiveSession.startTime,
            status: 'active',
            currentProgress: existingActiveSession.currentProgress,
            duration: sessionAge,
            isResumed: true,
            message: 'Resumed existing active session'
          };
        }
      }

      // Check for any other active sessions
      const otherActiveSession = await LearningSession.findOne({ userId, status: 'active' });
      if (otherActiveSession) {
        const sessionAge = Math.floor((Date.now() - otherActiveSession.startTime.getTime()) / 1000);
        if (sessionAge > this.SESSION_TIMEOUT) {
          await this.abandonSession(otherActiveSession._id, 'timeout');
        } else {
          throw new Error(`Another session is already active. Complete or abandon session ${otherActiveSession._id} first.`);
        }
      }

      const session = new LearningSession({
        userId,
        nodeId,
        status: 'active',
        startTime: new Date(),
        progressCheckpoints: [{ timestamp: new Date(), progress: 0, action: 'session_started', metadata: {} }]
      });

      await session.save();

      return {
        sessionId: session._id,
        nodeId,
        startTime: session.startTime,
        status: 'active',
        currentProgress: 0,
        duration: 0,
        isResumed: false,
        message: 'Session started successfully'
      };

    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }

  static async updateSession(sessionId, progressData) {
    try {
      const { progress, action, metadata = {} } = progressData;

      if (typeof progress !== 'number' || progress < 0 || progress > 100)
        throw new Error('Progress must be a number between 0 and 100');
      if (!action || typeof action !== 'string' || action.trim().length === 0)
        throw new Error('Action is required and must be a non-empty string');

      const session = await LearningSession.findOne({ _id: sessionId, status: 'active' });
      if (!session) throw new Error('Active session not found');

      const sessionDuration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
      if (sessionDuration > this.SESSION_TIMEOUT) {
        await this.abandonSession(sessionId, 'timeout', { lastProgress: progress, lastAction: action });
        throw new Error('Session has been automatically abandoned due to timeout. Progress has been preserved.');
      }

      session.currentProgress = progress;
      session.duration = sessionDuration;
      session.progressCheckpoints.push({ timestamp: new Date(), progress, action: action.trim(), metadata });
      await session.save();

      return {
        sessionId: session._id,
        currentProgress: session.currentProgress,
        duration: session.duration,
        checkpointAdded: true,
        timeRemaining: Math.max(0, this.SESSION_TIMEOUT - sessionDuration),
        message: 'Progress updated successfully'
      };

    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  static async completeSession(sessionId, reflectionData) {
    try {
      const session = await LearningSession.findOne({ _id: sessionId, status: 'active' });
      if (!session) throw new Error('Active session not found');

      // Calculate active time (only when session was not paused)
      // If duration field is set, use it (it tracks active time)
      // Otherwise calculate from start to now
      let activeDuration = session.duration || 0;
      if (!session.duration || session.duration === 0) {
        // Fallback: calculate from startTime to now
        // NOTE: This assumes session was never paused. For accurate active time,
        // the session should track pause/resume events
        activeDuration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
      }

      const sessionDuration = activeDuration;
      if (sessionDuration > this.SESSION_TIMEOUT) {
        await this.abandonSession(sessionId, 'timeout');
        throw new Error('Session has been automatically abandoned due to timeout');
      }

      const completionResult = await SessionCompletionEngine.processSessionReflection(sessionId, reflectionData);

      return {
        sessionId: completionResult.sessionId,
        status: 'completed',
        reflectionSaved: completionResult.reflectionSaved,
        nodeId: completionResult.nodeId,
        duration: sessionDuration,
        message: 'Session completed successfully'
      };

    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }

  static async getActiveSession(userId) {
    try {
      const cacheKey = `active_session_${userId}`;
      const cachedSession = await cacheService.getSessionData(cacheKey);
      if (cachedSession) {
        const sessionDuration = Math.floor((Date.now() - new Date(cachedSession.startTime).getTime()) / 1000);
        if (sessionDuration <= this.SESSION_TIMEOUT) {
          return { ...cachedSession, duration: sessionDuration, timeRemaining: Math.max(0, this.SESSION_TIMEOUT - sessionDuration) };
        } else {
          await cacheService.invalidateSessionCache(cacheKey);
        }
      }

      const activeSession = await LearningSession.findOne({ userId, status: 'active' });
      if (!activeSession) return null;

      const sessionDuration = Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000);
      if (sessionDuration > this.SESSION_TIMEOUT) {
        await this.abandonSession(activeSession._id, 'timeout');
        return null;
      }

      const sessionData = {
        sessionId: activeSession._id,
        nodeId: activeSession.nodeId,
        startTime: activeSession.startTime,
        duration: sessionDuration,
        currentProgress: activeSession.currentProgress,
        timeRemaining: Math.max(0, this.SESSION_TIMEOUT - sessionDuration),
        status: 'active'
      };

      await cacheService.cacheSessionData(cacheKey, sessionData, 300);
      return sessionData;

    } catch (error) {
      console.error('Error fetching active session:', error);
      throw error;
    }
  }

  static async getSessionHistory(nodeId, userId) {
    try {
      const sessions = await LearningSession.find({ userId, nodeId }).sort({ startTime: -1 });
      return {
        nodeId,
        sessionCount: sessions.length,
        totalTimeSpent: sessions.reduce((total, s) => total + (s.duration || 0), 0),
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        abandonedSessions: sessions.filter(s => s.status === 'abandoned').length,
        sessions: sessions.map(s => ({
          sessionId: s._id,
          status: s.status,
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.duration,
          progress: s.currentProgress,
          hasReflection: !!s.reflection,
          reflection: s.reflection
        }))
      };
    } catch (error) {
      console.error('Error fetching session history:', error);
      throw error;
    }
  }

  static async recoverSession(sessionId, userId) {
    try {
      const abandonedSession = await LearningSession.findOne({ _id: sessionId, userId, status: 'abandoned' });
      if (!abandonedSession) throw new Error('Abandoned session not found or access denied');

      const activeSession = await LearningSession.findOne({ userId, status: 'active' });
      if (activeSession) throw new Error('Cannot recover session while another session is active');

      const recoveredSession = new LearningSession({
        userId,
        nodeId: abandonedSession.nodeId,
        status: 'active',
        startTime: new Date(),
        currentProgress: abandonedSession.currentProgress,
        progressCheckpoints: [
          ...abandonedSession.progressCheckpoints,
          { timestamp: new Date(), progress: abandonedSession.currentProgress, action: 'session_recovered', metadata: { recoveredFromSession: sessionId } }
        ]
      });

      await recoveredSession.save();

      return {
        sessionId: recoveredSession._id,
        nodeId: abandonedSession.nodeId,
        recoveredProgress: abandonedSession.currentProgress,
        recoveredFromSession: sessionId,
        message: 'Session recovered successfully'
      };

    } catch (error) {
      console.error('Error recovering session:', error);
      throw error;
    }
  }

  static async abandonSession(sessionId, reason = 'unknown', preservationData = {}) {
    try {
      const session = await LearningSession.findById(sessionId);
      if (!session) throw new Error('Session not found');

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

      session.status = 'abandoned';
      session.endTime = endTime;
      session.duration = duration;
      session.progressCheckpoints.push({
        timestamp: endTime,
        progress: preservationData.lastProgress || session.currentProgress,
        action: `session_abandoned_${reason}`,
        metadata: { reason, preservationData, finalDuration: duration }
      });

      await session.save();

      return {
        sessionId: session._id,
        status: 'abandoned',
        reason,
        preservedProgress: session.currentProgress,
        duration,
        canRecover: true,
        message: `Session abandoned due to ${reason}. Progress has been preserved.`
      };

    } catch (error) {
      console.error('Error abandoning session:', error);
      throw error;
    }
  }

  static async cleanupOldSessions(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const result = await LearningSession.deleteMany({ status: 'abandoned', endTime: { $lt: cutoffDate } });
      return { deletedCount: result.deletedCount, cutoffDate, message: `Cleaned up ${result.deletedCount} old abandoned sessions` };
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
      throw error;
    }
  }
}

export default SessionManager;
