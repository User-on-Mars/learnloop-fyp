import RoomNodeProgress from '../models/RoomNodeProgress.js';
import Node from '../models/Node.js';
import RoomSkillMap from '../models/RoomSkillMap.js';
import RoomMember from '../models/RoomMember.js';
import mongoose from 'mongoose';
import ErrorLoggingService from './ErrorLoggingService.js';
import {
  ValidationError,
  NotFoundError,
  PermissionError,
  StateTransitionError,
  DatabaseError
} from '../utils/errors.js';

/**
 * RoomNodeProgressService - Manages room-specific node progress tracking.
 * Ensures complete isolation from personal skill map progress.
 * 
 * Requirements: 18.1-18.4 - Room Skill Map Progress Isolation
 */
class RoomNodeProgressService {
  
  /**
   * Valid status transitions for room node progress
   */
  VALID_TRANSITIONS = {
    'Locked': ['Unlocked'],
    'Unlocked': ['In_Progress', 'Completed'],
    'In_Progress': ['Completed', 'Unlocked'],
    'Completed': ['Unlocked'] // Allow re-doing nodes in rooms
  };

  /**
   * Check if a status transition is valid
   */
  isValidTransition(currentStatus, newStatus) {
    return this.VALID_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Initialize room node progress for a user when they join a room or when skill maps are added.
   * Creates progress records for all nodes in all room skill maps.
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {string} skillMapId - Optional specific skill map ID to initialize
   * @returns {Promise<Array>} Created progress records
   */
  async initializeRoomProgress(roomId, userId, skillMapId = null) {
    if (!roomId || !userId) {
      throw new ValidationError('roomId and userId are required');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verify user is a member of the room
      const membership = await RoomMember.findOne({ roomId, userId }).session(session);
      if (!membership) {
        throw new PermissionError('Room', 'access', userId, { roomId });
      }

      // Get skill maps for the room
      const query = { roomId };
      if (skillMapId) {
        query.skillMapId = skillMapId;
      }
      
      const roomSkillMaps = await RoomSkillMap.find(query).session(session);
      
      if (roomSkillMaps.length === 0) {
        await session.commitTransaction();
        return [];
      }

      const progressRecords = [];

      for (const roomSkillMap of roomSkillMaps) {
        // Get all nodes for this skill map
        const nodes = await Node.find({ 
          skillId: roomSkillMap.skillMapId 
        }).sort({ order: 1 }).session(session);

        for (const node of nodes) {
          // Check if progress record already exists
          const existingProgress = await RoomNodeProgress.findOne({
            roomId,
            userId,
            skillMapId: roomSkillMap.skillMapId,
            nodeId: node._id
          }).session(session);

          if (!existingProgress) {
            // Create new progress record
            // First node is unlocked, rest are locked
            const status = node.order === 1 ? 'Unlocked' : 'Locked';
            
            const progressRecord = new RoomNodeProgress({
              roomId,
              userId,
              skillMapId: roomSkillMap.skillMapId,
              nodeId: node._id,
              status
            });

            await progressRecord.save({ session });
            progressRecords.push(progressRecord.toObject());
          }
        }
      }

      await session.commitTransaction();

      await ErrorLoggingService.logSystemEvent('room_progress_initialized', {
        roomId,
        userId,
        skillMapId,
        recordsCreated: progressRecords.length,
        timestamp: new Date().toISOString()
      });

      return progressRecords;
    } catch (error) {
      await session.abortTransaction();
      
      await ErrorLoggingService.logError(error, {
        roomId,
        userId,
        skillMapId,
        operation: 'initializeRoomProgress',
        timestamp: new Date().toISOString()
      });
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get room node progress for a user in a specific skill map.
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {string} skillMapId - Skill map ID
   * @returns {Promise<Array>} Progress records with node details
   */
  async getRoomSkillMapProgress(roomId, userId, skillMapId) {
    if (!roomId || !userId || !skillMapId) {
      throw new ValidationError('roomId, userId, and skillMapId are required');
    }

    try {
      // Verify user is a member of the room
      const membership = await RoomMember.findOne({ roomId, userId });
      if (!membership) {
        throw new PermissionError('Room', 'access', userId, { roomId });
      }

      // Verify skill map is in the room
      const roomSkillMap = await RoomSkillMap.findOne({ roomId, skillMapId });
      if (!roomSkillMap) {
        throw new NotFoundError('RoomSkillMap', skillMapId, { roomId });
      }

      // Get progress records with node details
      const progressRecords = await RoomNodeProgress.aggregate([
        {
          $match: {
            roomId: new mongoose.Types.ObjectId(roomId),
            userId,
            skillMapId: new mongoose.Types.ObjectId(skillMapId)
          }
        },
        {
          $lookup: {
            from: 'nodes',
            localField: 'nodeId',
            foreignField: '_id',
            as: 'node'
          }
        },
        {
          $unwind: '$node'
        },
        {
          $sort: { 'node.order': 1 }
        },
        {
          $project: {
            _id: 1,
            roomId: 1,
            userId: 1,
            skillMapId: 1,
            nodeId: 1,
            status: 1,
            completedAt: 1,
            createdAt: 1,
            updatedAt: 1,
            node: {
              _id: '$node._id',
              order: '$node.order',
              title: '$node.title',
              description: '$node.description',
              isStart: '$node.isStart',
              isGoal: '$node.isGoal'
            }
          }
        }
      ]);

      return progressRecords;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        roomId,
        userId,
        skillMapId,
        operation: 'getRoomSkillMapProgress',
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * Update room node progress status.
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {string} nodeId - Node ID
   * @param {string} newStatus - New status
   * @returns {Promise<Object>} Updated progress and next node info
   */
  async updateRoomNodeStatus(roomId, userId, nodeId, newStatus) {
    if (!roomId || !userId || !nodeId || !newStatus) {
      throw new ValidationError('roomId, userId, nodeId, and newStatus are required');
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
      // Verify user is a member of the room
      const membership = await RoomMember.findOne({ roomId, userId }).session(session);
      if (!membership) {
        throw new PermissionError('Room', 'access', userId, { roomId });
      }

      // Get the progress record
      const progress = await RoomNodeProgress.findOne({
        roomId,
        userId,
        nodeId
      }).session(session);

      if (!progress) {
        throw new NotFoundError('RoomNodeProgress', nodeId, { roomId, userId });
      }

      // Validate transition
      if (!this.isValidTransition(progress.status, newStatus)) {
        throw new StateTransitionError(
          progress.status,
          newStatus,
          `Invalid status transition. Valid transitions from ${progress.status}: ${this.VALID_TRANSITIONS[progress.status]?.join(', ') || 'none'}`,
          { roomId, userId, nodeId }
        );
      }

      // Update progress status
      progress.status = newStatus;
      await progress.save({ session });

      let nextNodeProgress = null;

      // If node is completed, unlock next node
      if (newStatus === 'Completed') {
        // Get the node to find its order
        const node = await Node.findById(nodeId).session(session);
        if (node) {
          // Find next node in the same skill map
          const nextNode = await Node.findOne({
            skillId: node.skillId,
            order: node.order + 1
          }).session(session);

          if (nextNode) {
            // Find or create progress record for next node
            let nextProgress = await RoomNodeProgress.findOne({
              roomId,
              userId,
              skillMapId: progress.skillMapId,
              nodeId: nextNode._id
            }).session(session);

            if (!nextProgress) {
              // Create progress record if it doesn't exist
              nextProgress = new RoomNodeProgress({
                roomId,
                userId,
                skillMapId: progress.skillMapId,
                nodeId: nextNode._id,
                status: 'Locked'
              });
              await nextProgress.save({ session });
            }

            // Unlock next node if it's locked
            if (nextProgress.status === 'Locked') {
              nextProgress.status = 'Unlocked';
              await nextProgress.save({ session });
              nextNodeProgress = nextProgress.toObject();
            }
          }
        }
      }

      await session.commitTransaction();

      await ErrorLoggingService.logSystemEvent('room_node_progress_updated', {
        roomId,
        userId,
        nodeId,
        oldStatus: progress.status,
        newStatus,
        nextNodeUnlocked: nextNodeProgress !== null,
        timestamp: new Date().toISOString()
      });

      return {
        progress: progress.toObject(),
        nextNodeProgress
      };
    } catch (error) {
      await session.abortTransaction();
      
      await ErrorLoggingService.logError(error, {
        roomId,
        userId,
        nodeId,
        newStatus,
        operation: 'updateRoomNodeStatus',
        timestamp: new Date().toISOString()
      });
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Calculate room skill map completion percentage for a user.
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {string} skillMapId - Skill map ID
   * @returns {Promise<Object>} Progress statistics
   */
  async getRoomSkillMapStats(roomId, userId, skillMapId) {
    if (!roomId || !userId || !skillMapId) {
      throw new ValidationError('roomId, userId, and skillMapId are required');
    }

    try {
      const progressRecords = await RoomNodeProgress.find({
        roomId,
        userId,
        skillMapId
      });

      const total = progressRecords.length;
      const completed = progressRecords.filter(p => p.status === 'Completed').length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        completed,
        total,
        percent
      };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        roomId,
        userId,
        skillMapId,
        operation: 'getRoomSkillMapStats',
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * Clean up room progress when a user leaves a room or skill map is removed.
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - Optional user ID (if null, cleans all users)
   * @param {string} skillMapId - Optional skill map ID (if null, cleans all skill maps)
   * @returns {Promise<number>} Number of records deleted
   */
  async cleanupRoomProgress(roomId, userId = null, skillMapId = null) {
    if (!roomId) {
      throw new ValidationError('roomId is required');
    }

    try {
      const query = { roomId };
      if (userId) query.userId = userId;
      if (skillMapId) query.skillMapId = skillMapId;

      const result = await RoomNodeProgress.deleteMany(query);

      await ErrorLoggingService.logSystemEvent('room_progress_cleanup', {
        roomId,
        userId,
        skillMapId,
        recordsDeleted: result.deletedCount,
        timestamp: new Date().toISOString()
      });

      return result.deletedCount;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        roomId,
        userId,
        skillMapId,
        operation: 'cleanupRoomProgress',
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
}

export default new RoomNodeProgressService();