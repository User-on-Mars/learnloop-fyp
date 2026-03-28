import LearningSession from '../models/LearningSession.js';

/**
 * SessionCompletionEngine - Handles session completion evaluation and reflection processing
 */
class SessionCompletionEngine {

  static async processSessionReflection(sessionId, reflectionData) {
    try {
      const session = await LearningSession.findById(sessionId);
      if (!session) throw new Error('Session not found');
      if (session.status !== 'active') throw new Error(`Cannot complete session with status: ${session.status}`);

      this._validateReflectionData(reflectionData);

      session.reflection = {
        understanding: reflectionData.understanding,
        difficulty: reflectionData.difficulty,
        notes: reflectionData.notes || '',
        completionConfidence: reflectionData.completionConfidence,
        wouldRecommend: reflectionData.wouldRecommend !== false,
        tags: reflectionData.tags || []
      };

      session.status = 'completed';
      session.endTime = new Date();
      const durationMs = session.endTime.getTime() - session.startTime.getTime();
      session.duration = Math.floor(durationMs / 1000);

      await session.save();

      return {
        sessionCompleted: true,
        sessionId: session._id.toString(),
        nodeId: session.nodeId?.toString(),
        reflectionSaved: true,
      };

    } catch (error) {
      console.error('Error processing session reflection:', error);
      throw error;
    }
  }

  static _aggregateSessionData(sessions) {
    if (!sessions || sessions.length === 0) {
      return { totalSessions: 0, totalTime: 0, averageUnderstanding: 0, averageDifficulty: 0, averageConfidence: 0 };
    }

    const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalUnderstanding = sessions.reduce((sum, s) => sum + (s.reflection?.understanding || 0), 0);
    const totalDifficulty = sessions.reduce((sum, s) => sum + (s.reflection?.difficulty || 0), 0);
    const totalConfidence = sessions.reduce((sum, s) => sum + (s.reflection?.completionConfidence || 0), 0);
    const allTags = [...new Set(sessions.flatMap(s => s.reflection?.tags || []))];

    return {
      totalSessions: sessions.length,
      totalTime,
      averageUnderstanding: totalUnderstanding / sessions.length,
      averageDifficulty: totalDifficulty / sessions.length,
      averageConfidence: totalConfidence / sessions.length,
      averageSessionTime: totalTime / sessions.length,
      allTags,
    };
  }

  static _validateReflectionData(reflectionData) {
    if (!reflectionData) throw new Error('Reflection data is required');
    if (!reflectionData.understanding || reflectionData.understanding < 1 || reflectionData.understanding > 5)
      throw new Error('Understanding score must be between 1 and 5');
    if (!reflectionData.difficulty || reflectionData.difficulty < 1 || reflectionData.difficulty > 5)
      throw new Error('Difficulty score must be between 1 and 5');
    if (!reflectionData.completionConfidence || reflectionData.completionConfidence < 1 || reflectionData.completionConfidence > 5)
      throw new Error('Completion confidence score must be between 1 and 5');
    if (reflectionData.notes && reflectionData.notes.length > 500)
      throw new Error('Reflection notes cannot exceed 500 characters');
    if (reflectionData.tags) {
      if (!Array.isArray(reflectionData.tags)) throw new Error('Tags must be an array');
      for (const tag of reflectionData.tags) {
        if (typeof tag !== 'string' || tag.length > 50) throw new Error('Each tag must be a string with maximum 50 characters');
      }
    }
  }

  static async getNodeSessionHistory(nodeId, userId) {
    try {
      const sessions = await LearningSession.find({ nodeId, userId }).sort({ createdAt: -1 });
      const completedSessions = sessions.filter(s => s.status === 'completed');
      const aggregatedData = this._aggregateSessionData(completedSessions);
      return {
        allSessions: sessions,
        completedSessions,
        aggregatedData,
        activeSession: sessions.find(s => s.status === 'active') || null
      };
    } catch (error) {
      console.error('Error getting node session history:', error);
      throw error;
    }
  }
}

export default SessionCompletionEngine;
