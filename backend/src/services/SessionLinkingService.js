import Node from '../models/Node.js';
import LearningSession from '../models/LearningSession.js';
import Reflection from '../models/Reflection.js';
import mongoose from 'mongoose';
import dbMonitor from '../utils/dbMonitor.js';
import {
  ValidationError,
  StateTransitionError,
  NotFoundError,
  PermissionError,
  ReferentialIntegrityError,
  DatabaseError,
  ConflictError
} from '../utils/errors.js';
import ErrorLoggingService from './ErrorLoggingService.js';

class SessionLinkingService {
  /**
   * Link a session to a node
   * @param {string} sessionId - Session ID
   * @param {string} nodeId - Node ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async linkSessionToNode(sessionId, nodeId, userId) {
    // Validation
    if (!sessionId) {
      throw new ValidationError('sessionId', sessionId, { type: 'required' });
    }
    
    if (!nodeId) {
      throw new ValidationError('nodeId', nodeId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Verify node exists and belongs to user - Permission check
      const node = await Node.findOne({ _id: nodeId, userId });
      
      if (!node) {
        // Check if node exists but belongs to another user
        const nodeExists = await Node.findById(nodeId);
        if (nodeExists) {
          throw new PermissionError('Node', 'link_session', userId, { nodeId });
        }
        throw new NotFoundError('Node', nodeId, { userId });
      }

      // Verify node is not locked - State transition check
      if (node.status === 'Locked') {
        throw new StateTransitionError(
          'Locked',
          'session_active',
          'Cannot link session to locked node. Unlock the node first.',
          { nodeId, userId, sessionId }
        );
      }

      // Update session with nodeId and skillId
      const session = await dbMonitor.monitorWrite(
        () => LearningSession.findOneAndUpdate(
          { _id: sessionId, userId },
          { 
            nodeId: node._id,
            skillId: node.skillId
          },
          { new: true }
        ),
        'SessionLinkingService.linkSessionToNode - update session'
      );

      if (!session) {
        // Check if session exists but belongs to another user
        const sessionExists = await LearningSession.findById(sessionId);
        if (sessionExists) {
          throw new PermissionError('Session', 'link', userId, { sessionId });
        }
        throw new NotFoundError('Session', sessionId, { userId });
      }

      // Log successful linking
      await ErrorLoggingService.logSystemEvent('session_linked_to_node', {
        sessionId,
        nodeId,
        userId,
        skillId: node.skillId.toString(),
        timestamp: new Date().toISOString()
      });

      return session.toObject();
    } catch (error) {
      // Log error with context - Requirement 14.5
      await ErrorLoggingService.logError(error, {
        userId,
        sessionId,
        nodeId,
        operation: 'linkSessionToNode',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ValidationError || error instanceof StateTransitionError || 
          error instanceof PermissionError || error instanceof NotFoundError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('id', error.value, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('linkSessionToNode', error, { userId, sessionId, nodeId });
      }
      
      throw error;
    }
  }

  /**
   * Update node status when a session starts
   * @param {string} nodeId - Node ID
   * @param {string} userId - User ID
   * @returns {Promise<{node: Object, statusUpdated: boolean}>}
   */
  async updateNodeStatusOnSessionStart(nodeId, userId) {
    // Validation
    if (!nodeId) {
      throw new ValidationError('nodeId', nodeId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Fetch node
      const node = await Node.findOne({ _id: nodeId, userId });
      
      if (!node) {
        // Check if node exists but belongs to another user
        const nodeExists = await Node.findById(nodeId);
        if (nodeExists) {
          throw new PermissionError('Node', 'update_status', userId, { nodeId });
        }
        throw new NotFoundError('Node', nodeId, { userId });
      }

      let statusUpdated = false;

      // If node is Unlocked, change to In_Progress
      if (node.status === 'Unlocked') {
        node.status = 'In_Progress';
        await dbMonitor.monitorWrite(
          () => node.save(),
          'SessionLinkingService.updateNodeStatusOnSessionStart - save node'
        );
        statusUpdated = true;
        
        // Log status update
        await ErrorLoggingService.logSystemEvent('node_status_auto_updated', {
          nodeId,
          userId,
          oldStatus: 'Unlocked',
          newStatus: 'In_Progress',
          trigger: 'session_start',
          timestamp: new Date().toISOString()
        });
      }

      return {
        node: node.toObject(),
        statusUpdated
      };
    } catch (error) {
      // Log error with context
      await ErrorLoggingService.logError(error, {
        userId,
        nodeId,
        operation: 'updateNodeStatusOnSessionStart',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ValidationError || error instanceof PermissionError || error instanceof NotFoundError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('nodeId', nodeId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('updateNodeStatusOnSessionStart', error, { userId, nodeId });
      }
      
      throw error;
    }
  }

  /**
   * Get all content linked to a node
   * @param {string} nodeId - Node ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getNodeLinkedContent(nodeId, userId) {
    // Validation
    if (!nodeId) {
      throw new ValidationError('nodeId', nodeId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Verify node exists - Referential integrity check
      const node = await Node.findOne({ _id: nodeId, userId }).lean();
      
      if (!node) {
        // Check if node exists but belongs to another user
        const nodeExists = await Node.findById(nodeId).lean();
        if (nodeExists) {
          throw new PermissionError('Node', 'view_content', userId, { nodeId });
        }
        throw new NotFoundError('Node', nodeId, { userId });
      }

      // Fetch sessions linked to this node
      const sessions = await dbMonitor.monitorRead(
        () => LearningSession.find({ nodeId, userId })
          .select('_id duration startTime endTime status')
          .sort({ startTime: -1 })
          .lean(),
        'SessionLinkingService.getNodeLinkedContent - fetch sessions'
      );

      // Get session IDs
      const sessionIds = sessions.map(s => s._id);

      // Fetch reflections linked to these sessions
      const reflections = await dbMonitor.monitorRead(
        () => Reflection.find({
          userId,
          sessionId: { $in: sessionIds }
        })
          .select('_id content mood createdAt sessionId')
          .sort({ createdAt: -1 })
          .lean(),
        'SessionLinkingService.getNodeLinkedContent - fetch reflections'
      );

      // Note: Blockers would be fetched here when the Blocker model exists
      const blockers = [];

      return {
        sessions,
        reflections,
        blockers
      };
    } catch (error) {
      // Log error with context
      await ErrorLoggingService.logError(error, {
        userId,
        nodeId,
        operation: 'getNodeLinkedContent',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ValidationError || error instanceof PermissionError || error instanceof NotFoundError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('nodeId', nodeId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getNodeLinkedContent', error, { userId, nodeId });
      }
      
      throw error;
    }
  }

  /**
   * Create a new session linked to a node
   * @param {string} nodeId - Node ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async createSessionForNode(nodeId, userId) {
    // Validation
    if (!nodeId) {
      throw new ValidationError('nodeId', nodeId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      // Verify node exists and belongs to user - Permission check
      const node = await Node.findOne({ _id: nodeId, userId }).session(mongoSession);
      
      if (!node) {
        // Check if node exists but belongs to another user
        const nodeExists = await Node.findById(nodeId).session(mongoSession);
        if (nodeExists) {
          throw new PermissionError('Node', 'create_session', userId, { nodeId });
        }
        throw new NotFoundError('Node', nodeId, { userId });
      }

      // Verify node is not locked - State transition check
      if (node.status === 'Locked') {
        throw new StateTransitionError(
          'Locked',
          'session_active',
          'Cannot start session for locked node. Complete the previous node to unlock this one.',
          { nodeId, userId, order: node.order }
        );
      }

      // Check for existing active session - Conflict check
      const existingActiveSession = await LearningSession.findOne({
        userId,
        nodeId,
        status: 'active'
      }).session(mongoSession);

      if (existingActiveSession) {
        throw new ConflictError(
          'Session',
          'User already has an active session for this node. Complete or end the existing session first.',
          { nodeId, userId, existingSessionId: existingActiveSession._id.toString() }
        );
      }

      // Verify skill still exists - Referential integrity check
      const Skill = mongoose.model('Skill');
      const skill = await Skill.findById(node.skillId).session(mongoSession);
      
      if (!skill) {
        throw new ReferentialIntegrityError(
          'Node',
          nodeId,
          'Skill',
          'Parent skill not found - referential integrity violation. The skill may have been deleted.',
          { skillId: node.skillId.toString(), userId }
        );
      }

      // Create new session
      const session = new LearningSession({
        userId,
        nodeId: node._id,
        skillId: node.skillId,
        status: 'active',
        startTime: new Date(),
        duration: 0,
        currentProgress: 0
      });

      await dbMonitor.monitorWrite(
        () => session.save({ session: mongoSession }),
        'SessionLinkingService.createSessionForNode - save session'
      );

      let nodeStatusUpdated = false;

      // Update node status if Unlocked
      if (node.status === 'Unlocked') {
        node.status = 'In_Progress';
        await dbMonitor.monitorWrite(
          () => node.save({ session: mongoSession }),
          'SessionLinkingService.createSessionForNode - update node status'
        );
        nodeStatusUpdated = true;
      }

      await mongoSession.commitTransaction();

      // Log successful session creation
      await ErrorLoggingService.logSystemEvent('session_created_for_node', {
        sessionId: session._id.toString(),
        nodeId,
        userId,
        skillId: node.skillId.toString(),
        nodeStatusUpdated,
        timestamp: new Date().toISOString()
      });

      return {
        session: session.toObject(),
        nodeStatusUpdated
      };
    } catch (error) {
      await mongoSession.abortTransaction();
      
      // Log error with context - Requirement 14.5
      await ErrorLoggingService.logError(error, {
        userId,
        nodeId,
        operation: 'createSessionForNode',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ValidationError || error instanceof StateTransitionError || 
          error instanceof ConflictError || error instanceof ReferentialIntegrityError ||
          error instanceof PermissionError || error instanceof NotFoundError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('nodeId', nodeId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('createSessionForNode', error, { userId, nodeId });
      }
      
      throw error;
    } finally {
      mongoSession.endSession();
    }
  }
}

export default new SessionLinkingService();
