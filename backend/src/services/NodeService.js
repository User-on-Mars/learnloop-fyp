import Node from '../models/Node.js';
import LearningSession from '../models/LearningSession.js';
import Reflection from '../models/Reflection.js';
import Skill from '../models/Skill.js';
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
import cacheService from './CacheService.js';
import XpService from './XpService.js';

class NodeService {
  /**
   * Valid status transitions
   */
  VALID_TRANSITIONS = {
    'Locked': ['Unlocked'],
    'Unlocked': ['In_Progress', 'Completed'],
    'In_Progress': ['Unlocked', 'Completed'],
    'Completed': ['Unlocked', 'In_Progress']
  };

  /**
   * Check if a status transition is valid
   * @param {string} currentStatus - Current node status
   * @param {string} newStatus - Desired new status
   * @returns {boolean}
   */
  isValidTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus) {
      return true;
    }
    
    const allowedTransitions = this.VALID_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Update node status with transition validation and auto-unlock
   * @param {string} nodeId - Node ID
   * @param {string} newStatus - New status
   * @param {string} userId - User ID
   * @returns {Promise<{node: Object, nextNode: Object|null}>}
   */
  async updateNodeStatus(nodeId, newStatus, userId) {
    // Validation - Requirements 1.9, 1.10
    if (!nodeId) {
      throw new ValidationError('nodeId', nodeId, { type: 'required' });
    }
    
    if (!newStatus) {
      throw new ValidationError('newStatus', newStatus, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    const validStatuses = ['Locked', 'Unlocked', 'In_Progress', 'Completed'];
    if (!validStatuses.includes(newStatus)) {
      throw new ValidationError('newStatus', newStatus, { 
        type: 'enum', 
        values: validStatuses 
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch the node
      const node = await Node.findOne({ _id: nodeId, userId }).session(session);
      
      if (!node) {
        // Check if node exists but belongs to another user
        const nodeExists = await Node.findById(nodeId).session(session);
        if (nodeExists) {
          throw new PermissionError('Node', 'update', userId, { nodeId });
        }
        throw new NotFoundError('Node', nodeId, { userId });
      }

      // Validate transition - Requirements 5.5, 5.6, 5.7, 5.8
      if (!this.isValidTransition(node.status, newStatus)) {
        throw new StateTransitionError(
          node.status,
          newStatus,
          `Invalid status transition. Valid transitions from ${node.status}: ${this.VALID_TRANSITIONS[node.status]?.join(', ') || 'none'}`,
          { nodeId, userId, order: node.order }
        );
      }

      // Update node status
      node.status = newStatus;
      await dbMonitor.monitorWrite(
        () => node.save({ session }),
        'NodeService.updateNodeStatus - save node'
      );

      let nextNode = null;

      // If node is marked Completed, unlock next node
      if (newStatus === 'Completed') {
        const nextNodeDoc = await Node.findOne({
          skillId: node.skillId,
          order: node.order + 1
        }).session(session);

        if (nextNodeDoc && nextNodeDoc.status === 'Locked') {
          // Check if this is the GOAL node
          if (nextNodeDoc.isGoal) {
            // Verify all other nodes are completed
            const allNodes = await Node.find({ skillId: node.skillId }).session(session);
            const allOthersCompleted = allNodes
              .filter(n => !n.isGoal)
              .every(n => n.status === 'Completed');

            if (allOthersCompleted) {
              nextNodeDoc.status = 'Unlocked';
              await dbMonitor.monitorWrite(
                () => nextNodeDoc.save({ session }),
                'NodeService.updateNodeStatus - unlock GOAL node'
              );
              nextNode = nextNodeDoc.toObject();
            }
          } else {
            // Regular node, unlock it
            nextNodeDoc.status = 'Unlocked';
            await dbMonitor.monitorWrite(
              () => nextNodeDoc.save({ session }),
              'NodeService.updateNodeStatus - unlock next node'
            );
            nextNode = nextNodeDoc.toObject();
          }
        }
      }

      await session.commitTransaction();

      // Invalidate cache
      if (cacheService.isAvailable()) {
        await cacheService.invalidateSkillMapCache(node.skillId.toString(), userId);
        // Also invalidate the specific node cache
        await cacheService.invalidateNodeCache(nodeId, userId);
        if (nextNode) {
          await cacheService.invalidateNodeCache(nextNode._id.toString(), userId);
        }
        // Invalidate the all_skills progress cache
        await cacheService.invalidateNodeCache('all_skills', userId); // For skill list progress
      }

      // Log successful status update
      await ErrorLoggingService.logSystemEvent('node_status_updated', {
        nodeId,
        userId,
        oldStatus: node.status,
        newStatus,
        nextNodeUnlocked: nextNode !== null,
        timestamp: new Date().toISOString()
      });

      // Award skill map completion XP if all nodes are now completed (never blocks response)
      let skillMapXpAwarded = null;
      if (newStatus === 'Completed') {
        try {
          const allNodes = await Node.find({ skillId: node.skillId });
          const allCompleted = allNodes.every(n => n.status === 'Completed');
          if (allCompleted) {
            const skill = await Skill.findById(node.skillId);
            if (skill && skill.fromTemplate === true) {
              const xp = await XpService.awardXp(userId, 'skillmap_completion', 50, { skillMapId: node.skillId.toString() });
              if (xp) {
                skillMapXpAwarded = { type: 'skillmap_completion', amount: xp.finalAmount, skillMapName: skill.name };
              }
            }
          }
        } catch (xpError) {
          await ErrorLoggingService.logError(xpError, {
            userId,
            nodeId,
            skillId: node.skillId?.toString(),
            operation: 'skillmap_completion_xp_award'
          });
        }
      }

      return {
        node: node.toObject(),
        nextNode,
        skillMapXpAwarded
      };
    } catch (error) {
      await session.abortTransaction();
      
      // Log error with context - Requirement 14.5
      await ErrorLoggingService.logError(error, {
        userId,
        nodeId,
        newStatus,
        operation: 'updateNodeStatus',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ValidationError || error instanceof StateTransitionError || 
          error instanceof PermissionError || error instanceof NotFoundError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('nodeId', nodeId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('updateNodeStatus', error, { userId, nodeId, newStatus });
      }
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get node details with linked content
   * @param {string} nodeId - Node ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getNodeDetails(nodeId, userId) {
    // Validation - Requirements 1.9, 1.10
    if (!nodeId) {
      throw new ValidationError('nodeId', nodeId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Try to get from cache
      if (cacheService.isAvailable()) {
        const cachedDetails = await cacheService.getNodeState(nodeId, userId);
        if (cachedDetails) {
          console.log(`⚡ Cache hit: getNodeDetails ${nodeId}`);
          return cachedDetails;
        }
      }

      // Fetch node
      const node = await dbMonitor.monitorRead(
        () => Node.findOne({ _id: nodeId, userId }).lean(),
        'NodeService.getNodeDetails - fetch node'
      );
      
      if (!node) {
        // Check if node exists but belongs to another user - Permission check
        const nodeExists = await Node.findById(nodeId).lean();
        if (nodeExists) {
          throw new PermissionError('Node', 'view', userId, { nodeId });
        }
        throw new NotFoundError('Node', nodeId, { userId });
      }

    // Fetch linked sessions
    const sessions = await dbMonitor.monitorRead(
      () => LearningSession.find({ nodeId, userId })
        .select('_id duration startTime endTime status')
        .sort({ startTime: -1 })
        .lean(),
      'NodeService.getNodeDetails - fetch sessions'
    );

      // Get session IDs for fetching reflections
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
        'NodeService.getNodeDetails - fetch reflections'
      );

      // Note: Blockers would be fetched here when the Blocker model exists
      // For now, return empty array
      const blockers = [];

      const result = {
        node,
        sessions: sessions.map(s => ({
          _id: s._id,
          duration: s.duration,
          date: s.startTime,
          status: s.status
        })),
        reflections,
        blockers
      };

      // Cache node details
      if (cacheService.isAvailable()) {
        await cacheService.cacheNodeState(nodeId, userId, result);
      }

      // Log successful retrieval
      await ErrorLoggingService.logSystemEvent('node_details_retrieved', {
        nodeId,
        userId,
        sessionCount: sessions.length,
        reflectionCount: reflections.length,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      // Log error with context - Requirement 14.5
      await ErrorLoggingService.logError(error, {
        userId,
        nodeId,
        operation: 'getNodeDetails',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ValidationError || error instanceof PermissionError || error instanceof NotFoundError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('nodeId', nodeId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getNodeDetails', error, { userId, nodeId });
      }
      
      throw error;
    }
  }

  /**
   * Update node content (title and description)
   * @param {string} nodeId - Node ID
   * @param {Object} updates - Updates object with title and/or description
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async updateNodeContent(nodeId, updates, userId) {
    // Validation - Requirements 9.6, 9.7
    if (!nodeId) {
      throw new ValidationError('nodeId', nodeId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    const { title, description } = updates;

    // Validate title - Requirement 9.6
    if (title !== undefined) {
      if (typeof title !== 'string') {
        throw new ValidationError('title', title, { type: 'format', format: 'string' });
      }
      if (title.length > 200) {
        throw new ValidationError('title', title, { type: 'maxLength', max: 200 });
      }
    }

    // Validate description - Requirement 9.7
    if (description !== undefined) {
      if (typeof description !== 'string') {
        throw new ValidationError('description', description, { type: 'format', format: 'string' });
      }
      if (description.length > 2000) {
        throw new ValidationError('description', description, { type: 'maxLength', max: 2000 });
      }
    }

    try {
      // Fetch node
      const node = await Node.findOne({ _id: nodeId, userId });
      
      if (!node) {
        // Check if node exists but belongs to another user - Permission check
        const nodeExists = await Node.findById(nodeId);
        if (nodeExists) {
          throw new PermissionError('Node', 'update', userId, { nodeId });
        }
        throw new NotFoundError('Node', nodeId, { userId });
      }

      // Allow editing description for any status
      // Update fields
      if (title !== undefined) {
        node.title = title.trim();
      }
      if (description !== undefined) {
        node.description = description.trim();
      }

      await dbMonitor.monitorWrite(
        () => node.save(),
        'NodeService.updateNodeContent - save node'
      );

      // Invalidate cache
      if (cacheService.isAvailable()) {
        await cacheService.invalidateSkillMapCache(node.skillId.toString(), userId);
        await cacheService.invalidateNodeCache(nodeId, userId);
      }

      // Log successful update
      await ErrorLoggingService.logSystemEvent('node_content_updated', {
        nodeId,
        userId,
        titleUpdated: title !== undefined,
        descriptionUpdated: description !== undefined,
        timestamp: new Date().toISOString()
      });

      return node.toObject();
    } catch (error) {
      // Log error with context - Requirement 14.5
      await ErrorLoggingService.logError(error, {
        userId,
        nodeId,
        updates,
        operation: 'updateNodeContent',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ValidationError || error instanceof StateTransitionError || 
          error instanceof PermissionError || error instanceof NotFoundError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('nodeId', nodeId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('updateNodeContent', error, { userId, nodeId, updates });
      }
      
      throw error;
    }
  }

  /**
   * Create a new node in a skill map
   * @param {string} skillId - Skill ID
   * @param {string} userId - User ID
   * @param {Object} nodeData - Node data (title, description)
   * @returns {Promise<Object>} Created node
   */
  async createNode(skillId, userId, { title, description = '' }) {
    // Validation
    if (!skillId) {
      throw new ValidationError('skillId', skillId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new ValidationError('title', title, { type: 'required' });
    }

    if (title.length > 200) {
      throw new ValidationError('title', title, { type: 'maxLength', max: 200 });
    }

    if (description && description.length > 2000) {
      throw new ValidationError('description', description, { type: 'maxLength', max: 2000 });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Import Skill model
      const Skill = mongoose.model('Skill');
      
      // Verify skill exists and belongs to user
      const skill = await Skill.findOne({ _id: skillId, userId }).session(session);
      if (!skill) {
        const skillExists = await Skill.findById(skillId).session(session);
        if (skillExists) {
          throw new PermissionError('Skill', 'update', userId, { skillId });
        }
        throw new NotFoundError('Skill', skillId, { userId });
      }

      // Check node count limit (max 15 nodes total)
      const currentNodeCount = await Node.countDocuments({ skillId, userId }).session(session);
      if (currentNodeCount >= 15) {
        throw new ValidationError('nodes', currentNodeCount, { 
          type: 'maxLength', 
          max: 15,
          message: 'Cannot add more than 15 nodes to a skill map'
        });
      }

      // Find the highest order number and append after it
      const lastNode = await Node.findOne({ skillId, userId }).sort({ order: -1 }).session(session);
      const newOrder = lastNode ? lastNode.order + 1 : 1;

      // If this is the first node, make it unlocked
      const isFirstNode = !lastNode;

      // Create new node
      const newNode = new Node({
        skillId,
        userId,
        order: newOrder,
        title: title.trim(),
        description: description ? description.trim() : '',
        status: isFirstNode ? 'Unlocked' : 'Locked',
        isStart: isFirstNode,
        isGoal: false
      });

      await dbMonitor.monitorWrite(
        () => newNode.save({ session }),
        'NodeService.createNode - save new node'
      );

      // Update skill nodeCount
      skill.nodeCount = currentNodeCount + 1;
      await dbMonitor.monitorWrite(
        () => skill.save({ session }),
        'NodeService.createNode - update skill nodeCount'
      );

      await session.commitTransaction();

      // Post-commit operations (non-critical)
      try {
        if (cacheService.isAvailable()) {
          await cacheService.invalidateSkillMapCache(skillId, userId);
        }
        await ErrorLoggingService.logSystemEvent('node_created', {
          nodeId: newNode._id, skillId, userId, order: newOrder, timestamp: new Date().toISOString()
        });
      } catch (postErr) {
        console.warn('Post-commit cache/log error (non-critical):', postErr.message);
      }

      return newNode.toObject();
    } catch (error) {
      try { await session.abortTransaction(); } catch (_) { /* already committed or aborted */ }
      
      // Log error with context
      await ErrorLoggingService.logError(error, {
        userId,
        skillId,
        operation: 'createNode',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ValidationError || error instanceof PermissionError || 
          error instanceof NotFoundError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('skillId', skillId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('createNode', error, { userId, skillId });
      }
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete a node with validation and order recalculation
   * @param {string} nodeId - Node ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteNode(nodeId, userId) {
    // Validation - Requirements 11.5
    if (!nodeId) {
      throw new ValidationError('nodeId', nodeId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch node
      const node = await Node.findOne({ _id: nodeId, userId }).session(session);
      
      if (!node) {
        // Check if node exists but belongs to another user - Permission check
        const nodeExists = await Node.findById(nodeId).session(session);
        if (nodeExists) {
          throw new PermissionError('Node', 'delete', userId, { nodeId });
        }
        throw new NotFoundError('Node', nodeId, { userId });
      }

      // Pre-delete hook: Verify relationships - Requirement 14.2, 14.3
      // Prevent deletion of START or GOAL nodes
      if (node.isStart) {
        throw new ConflictError(
          'Node',
          'Cannot delete START node. The START node is required for skill progression.',
          { nodeId, userId, isStart: true }
        );
      }
      
      if (node.isGoal) {
        throw new ConflictError(
          'Node',
          'Cannot delete GOAL node. The GOAL node is required for skill completion.',
          { nodeId, userId, isGoal: true }
        );
      }

      // Check session count - referential integrity check - Requirement 11.5
      const sessionCount = await LearningSession.countDocuments({ nodeId }).session(session);
      
      if (sessionCount > 0) {
        throw new ReferentialIntegrityError(
          'Node',
          nodeId,
          'LearningSession',
          `Cannot delete node with ${sessionCount} linked session(s). This maintains data integrity and preserves your learning history.`,
          { sessionCount, userId }
        );
      }

      // Check if skill would have fewer than 2 nodes after deletion
      const nodeCount = await Node.countDocuments({ skillId: node.skillId }).session(session);
      
      if (nodeCount <= 2) {
        throw new ConflictError(
          'Node',
          'Cannot delete node - skill must have at least 2 nodes (START and GOAL).',
          { nodeId, userId, currentNodeCount: nodeCount }
        );
      }

      // Verify skill still exists - referential integrity check - Requirement 14.2
      const Skill = mongoose.model('Skill');
      const skill = await Skill.findById(node.skillId).session(session);
      
      if (!skill) {
        throw new ReferentialIntegrityError(
          'Node',
          nodeId,
          'Skill',
          'Parent skill not found - referential integrity violation. The skill may have been deleted.',
          { skillId: node.skillId.toString(), userId }
        );
      }

      // Verify skill ownership - Permission check
      if (skill.userId !== userId) {
        throw new PermissionError('Skill', 'modify', userId, { 
          skillId: skill._id.toString(),
          nodeId 
        });
      }

      // Delete the node
      await dbMonitor.monitorWrite(
        () => Node.deleteOne({ _id: nodeId }).session(session),
        'NodeService.deleteNode - delete node'
      );

      // Recalculate order numbers for remaining nodes
      const remainingNodes = await Node.find({ skillId: node.skillId })
        .sort({ order: 1 })
        .session(session);

      for (let i = 0; i < remainingNodes.length; i++) {
        remainingNodes[i].order = i + 1;
        await dbMonitor.monitorWrite(
          () => remainingNodes[i].save({ session }),
          `NodeService.deleteNode - reorder node ${i + 1}`
        );
      }

      // Update skill's nodeCount
      await dbMonitor.monitorWrite(
        () => Skill.updateOne(
          { _id: node.skillId },
          { nodeCount: remainingNodes.length },
          { session }
        ),
        'NodeService.deleteNode - update skill nodeCount'
      );

      // Orphan cleanup: Check for any nodes with invalid skillId references - Requirement 14.3
      const orphanedNodes = await Node.find({
        skillId: { $exists: true }
      }).session(session);

      const validSkillIds = new Set();
      for (const n of orphanedNodes) {
        const skillIdStr = n.skillId.toString();
        if (!validSkillIds.has(skillIdStr)) {
          const skillExists = await Skill.exists({ _id: n.skillId }).session(session);
          if (!skillExists) {
            console.warn(`Found orphaned node ${n._id} with invalid skillId ${n.skillId}`);
            await Node.deleteOne({ _id: n._id }, { session });
            
            // Log orphan cleanup
            await ErrorLoggingService.logSystemEvent('orphan_node_cleaned', {
              nodeId: n._id.toString(),
              skillId: skillIdStr,
              operation: 'deleteNode',
              timestamp: new Date().toISOString()
            });
          } else {
            validSkillIds.add(skillIdStr);
          }
        }
      }

      await session.commitTransaction();

      // Invalidate cache
      if (cacheService.isAvailable()) {
        await cacheService.invalidateSkillMapCache(node.skillId.toString(), userId);
        await cacheService.invalidateNodeCache(nodeId, userId);
        await cacheService.invalidateNodeCache('all_skills', userId);
      }
      
      // Log successful deletion
      await ErrorLoggingService.logSystemEvent('node_deleted', {
        nodeId,
        userId,
        skillId: node.skillId.toString(),
        remainingNodes: remainingNodes.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      await session.abortTransaction();
      
      // Log error with context - Requirement 14.5
      await ErrorLoggingService.logError(error, {
        userId,
        nodeId,
        operation: 'deleteNode',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ValidationError || error instanceof ConflictError || 
          error instanceof ReferentialIntegrityError || error instanceof PermissionError || 
          error instanceof NotFoundError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('nodeId', nodeId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('deleteNode', error, { userId, nodeId });
      }
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all nodes for a skill
   * @param {string} skillId - Skill ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getSkillNodes(skillId, userId) {
    // Validation
    if (!skillId) {
      throw new ValidationError('skillId', skillId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Try to get from cache
      if (cacheService.isAvailable()) {
        const cachedProgression = await cacheService.getUserProgression(userId, skillId);
        if (cachedProgression) {
          console.log(`⚡ Cache hit: getSkillNodes ${skillId}`);
          return cachedProgression;
        }
      }

      // Verify skill exists and user has permission - Referential integrity and permission check
      const Skill = mongoose.model('Skill');
      const skill = await Skill.findOne({ _id: skillId, userId }).lean();
      
      if (!skill) {
        // Check if skill exists but belongs to another user
        const skillExists = await Skill.findById(skillId).lean();
        if (skillExists) {
          throw new PermissionError('Skill', 'view', userId, { skillId });
        }
        throw new NotFoundError('Skill', skillId, { userId });
      }

      const nodes = await dbMonitor.monitorRead(
        () => Node.find({ skillId, userId })
          .select('_id skillId userId order title description status isStart isGoal sessionDefinitions completedSessions createdAt updatedAt')
          .sort({ order: 1 })
          .lean(),
        'NodeService.getSkillNodes - fetch nodes'
      );

      let enriched = nodes;
      if (nodes.length > 0) {
        const nodeIds = nodes.map((n) => n._id);
        const stats = await dbMonitor.monitorRead(
          () => LearningSession.aggregate([
            { $match: { userId, nodeId: { $in: nodeIds } } },
            {
              $group: {
                _id: '$nodeId',
                sessions_count: { $sum: 1 },
                last_practiced_at: { $max: '$startTime' }
              }
            }
          ]),
          'NodeService.getSkillNodes - session stats'
        );
        const statById = Object.fromEntries(
          stats.map((s) => [s._id.toString(), s])
        );
        enriched = nodes.map((n) => ({
          ...n,
          sessions_count: statById[n._id.toString()]?.sessions_count ?? 0,
          last_practiced_at: statById[n._id.toString()]?.last_practiced_at ?? null
        }));
      }

      if (cacheService.isAvailable()) {
        await cacheService.cacheUserProgression(userId, skillId, enriched, 300);
      }

      return enriched;
    } catch (error) {
      // Log error with context
      await ErrorLoggingService.logError(error, {
        userId,
        skillId,
        operation: 'getSkillNodes',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ValidationError || error instanceof PermissionError || error instanceof NotFoundError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('skillId', skillId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getSkillNodes', error, { userId, skillId });
      }
      
      throw error;
    }
  }
}

export default new NodeService();
