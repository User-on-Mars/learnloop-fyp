import Room from '../models/Room.js';
import RoomMember from '../models/RoomMember.js';
import RoomSkillMap from '../models/RoomSkillMap.js';
import User from '../models/User.js';
import Skill from '../models/Skill.js';
import Node from '../models/Node.js';
import RoomNodeProgress from '../models/RoomNodeProgress.js';
import mongoose from 'mongoose';
import {
  ValidationError,
  NotFoundError,
  PermissionError,
  ConflictError,
  DatabaseError
} from '../utils/errors.js';
import ErrorLoggingService from './ErrorLoggingService.js';
import RoomNodeProgressService from './RoomNodeProgressService.js';
import NotificationService from './NotificationService.js';

/**
 * RoomService - Manages room creation, membership, and operations
 */
class RoomService {
  /**
   * Create a new room with ownership limit validation
   * @param {string} userId - User ID
   * @param {Object} data - { name, description }
   * @returns {Promise<Object>} Created room with owner membership
   */
  async createRoom(userId, { name, description = '', color = '#0d9488', icon = 'Users' }) {
    // Validate inputs
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    if (!name || name.trim().length < 1) {
      throw new ValidationError('name', name, { type: 'minLength', min: 1 });
    }

    if (name.trim().length > 20) {
      throw new ValidationError('name', name, { type: 'maxLength', max: 20 });
    }

    if (description && description.length > 200) {
      throw new ValidationError('description', description, { type: 'maxLength', max: 200 });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Requirement 3.1: Enforce 3-room ownership limit
      const ownedRoomsCount = await Room.countDocuments({
        ownerId: userId,
        deletedAt: null
      }).session(session);

      if (ownedRoomsCount >= 3) {
        throw new ConflictError('Room', 'You can only own up to 3 rooms');
      }

      // Create room
      const room = new Room({
        ownerId: userId,
        name: name.trim(),
        description: description.trim(),
        color: color || '#0d9488',
        icon: icon || 'Users'
      });

      await room.save({ session });

      // Requirement 2.9: Add owner to room_members with role "owner"
      const ownerMembership = new RoomMember({
        roomId: room._id,
        userId,
        role: 'owner'
      });

      await ownerMembership.save({ session });

      await session.commitTransaction();

      await ErrorLoggingService.logSystemEvent('room_created', {
        roomId: room._id,
        userId,
        name: room.name,
        timestamp: new Date().toISOString()
      });

      return room.toObject();
    } catch (error) {
      await session.abortTransaction();

      await ErrorLoggingService.logError(error, {
        userId,
        operation: 'createRoom',
        name,
        timestamp: new Date().toISOString()
      });

      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('createRoom', error, { userId, name });
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get room by ID with membership verification
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Room object
   */
  async getRoomById(roomId, userId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Fetch room
      const room = await Room.findOne({
        _id: roomId,
        deletedAt: null
      }).lean();

      if (!room) {
        throw new NotFoundError('Room', roomId, { userId });
      }

      // Verify membership
      const membership = await RoomMember.findOne({
        roomId,
        userId
      }).lean();

      if (!membership) {
        throw new PermissionError('Room', 'view', userId, { roomId });
      }

      return room;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof PermissionError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        userId,
        roomId,
        operation: 'getRoomById',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('roomId', roomId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getRoomById', error, { userId, roomId });
      }

      throw error;
    }
  }

  /**
   * Get all rooms where user is owner or member
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of rooms with role and member count
   */
  async getUserRooms(userId) {
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Get all room memberships for user
      const memberships = await RoomMember.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

      if (memberships.length === 0) {
        return [];
      }

      const roomIds = memberships.map(m => m.roomId);

      // Fetch all rooms (non-deleted only)
      const rooms = await Room.find({
        _id: { $in: roomIds },
        deletedAt: null
      }).lean();

      // Get member counts for all rooms
      const memberCounts = await RoomMember.aggregate([
        { $match: { roomId: { $in: roomIds } } },
        { $group: { _id: '$roomId', count: { $sum: 1 } } }
      ]);

      const memberCountMap = memberCounts.reduce((acc, item) => {
        acc[item._id.toString()] = item.count;
        return acc;
      }, {});

      // Create membership map for role lookup
      const membershipMap = memberships.reduce((acc, m) => {
        acc[m.roomId.toString()] = m.role;
        return acc;
      }, {});

      // Combine room data with role and member count
      const roomsWithDetails = rooms.map(room => ({
        ...room,
        role: membershipMap[room._id.toString()],
        memberCount: memberCountMap[room._id.toString()] || 0
      }));

      return roomsWithDetails;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        userId,
        operation: 'getUserRooms',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getUserRooms', error, { userId });
      }

      throw error;
    }
  }

  /**
   * Update room details (owner only)
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {Object} updates - { name?, description? }
   * @returns {Promise<Object>} Updated room
   */
  async updateRoom(roomId, userId, updates) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Fetch room
      const room = await Room.findOne({
        _id: roomId,
        deletedAt: null
      });

      if (!room) {
        throw new NotFoundError('Room', roomId, { userId });
      }

      // Verify ownership
      if (room.ownerId !== userId) {
        throw new PermissionError('Room', 'update', userId, { roomId });
      }

      // Validate and apply updates
      if (updates.name !== undefined) {
        const trimmedName = updates.name.trim();
        if (trimmedName.length < 1) {
          throw new ValidationError('name', updates.name, { type: 'minLength', min: 1 });
        }
        if (trimmedName.length > 20) {
          throw new ValidationError('name', updates.name, { type: 'maxLength', max: 20 });
        }
        room.name = trimmedName;
      }

      if (updates.description !== undefined) {
        const trimmedDesc = updates.description.trim();
        if (trimmedDesc.length > 200) {
          throw new ValidationError('description', updates.description, { type: 'maxLength', max: 200 });
        }
        room.description = trimmedDesc;
      }

      await room.save();

      await ErrorLoggingService.logSystemEvent('room_updated', {
        roomId,
        userId,
        updatedFields: Object.keys(updates),
        timestamp: new Date().toISOString()
      });

      return room.toObject();
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof PermissionError || error instanceof ValidationError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        userId,
        roomId,
        operation: 'updateRoom',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('roomId', roomId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('updateRoom', error, { userId, roomId });
      }

      throw error;
    }
  }

  /**
   * Soft delete room (owner only)
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteRoom(roomId, userId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Fetch room
      const room = await Room.findOne({
        _id: roomId,
        deletedAt: null
      });

      if (!room) {
        throw new NotFoundError('Room', roomId, { userId });
      }

      // Verify ownership
      if (room.ownerId !== userId) {
        throw new PermissionError('Room', 'delete', userId, { roomId });
      }

      // Requirement 12.1: Soft delete by setting deletedAt timestamp
      room.deletedAt = new Date();
      await room.save();

      await ErrorLoggingService.logSystemEvent('room_deleted', {
        roomId,
        userId,
        timestamp: new Date().toISOString()
      });

      // Requirement 11.5: Send notification to all members when room is deleted
      const members = await RoomMember.find({ roomId }).lean();
      if (members.length > 0) {
        await NotificationService.sendRoomDeletedNotification(
          room.toObject(),
          members
        );
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof PermissionError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        userId,
        roomId,
        operation: 'deleteRoom',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('roomId', roomId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('deleteRoom', error, { userId, roomId });
      }

      throw error;
    }
  }

  /**
   * Get all active members of a room with user details
   * Requirements: 10.1-10.6
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID (must be member)
   * @returns {Promise<Array>} Array of members with user details
   */
  async getRoomMembers(roomId, userId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Verify user is room member
      const membership = await RoomMember.findOne({
        roomId,
        userId
      });

      if (!membership) {
        throw new PermissionError('Room', 'view members', userId, { roomId });
      }

      // Fetch all active members for the room
      const members = await RoomMember.find({ roomId })
        .sort({ joinedAt: 1 })
        .lean();

      if (members.length === 0) {
        return [];
      }

      // Get user IDs
      const userIds = members.map(m => m.userId);

      // Fetch user details
      const users = await User.find({
        firebaseUid: { $in: userIds }
      }).select('firebaseUid name email').lean();

      // Create user map for quick lookup
      const userMap = users.reduce((acc, user) => {
        acc[user.firebaseUid] = user;
        return acc;
      }, {});

      // Combine member data with user details
      const membersWithDetails = members.map(member => ({
        _id: member._id,
        roomId: member.roomId,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        user: userMap[member.userId] || null
      }));

      return membersWithDetails;
    } catch (error) {
      if (error instanceof PermissionError || error instanceof ValidationError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        roomId,
        userId,
        operation: 'getRoomMembers',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('roomId', roomId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getRoomMembers', error, { roomId, userId });
      }

      throw error;
    }
  }

  /**
   * Kick a member from a room (owner only, cannot kick self)
   * Requirements: 10.1-10.6
   * @param {string} roomId - Room ID
   * @param {string} ownerId - Owner user ID
   * @param {string} targetUserId - User ID to kick
   * @returns {Promise<void>}
   */
  async kickMember(roomId, ownerId, targetUserId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!ownerId) {
      throw new ValidationError('ownerId', ownerId, { type: 'required' });
    }

    if (!targetUserId) {
      throw new ValidationError('targetUserId', targetUserId, { type: 'required' });
    }

    try {
      // Fetch room
      const room = await Room.findOne({
        _id: roomId,
        deletedAt: null
      });

      if (!room) {
        throw new NotFoundError('Room', roomId, { ownerId });
      }

      // Requirement 10.1: Verify ownership
      if (room.ownerId !== ownerId) {
        throw new PermissionError('Room', 'kick member', ownerId, { roomId });
      }

      // Requirement 10.6: Cannot kick self
      if (ownerId === targetUserId) {
        throw new ConflictError('RoomMember', 'Owners cannot kick themselves');
      }

      // Verify target is a member
      const targetMember = await RoomMember.findOne({
        roomId,
        userId: targetUserId
      });

      if (!targetMember) {
        throw new NotFoundError('RoomMember', targetUserId, { roomId });
      }

      // Requirement 10.3: Remove member from room_members
      await RoomMember.deleteOne({
        roomId,
        userId: targetUserId
      });

      await ErrorLoggingService.logSystemEvent('member_kicked', {
        roomId,
        ownerId,
        targetUserId,
        timestamp: new Date().toISOString()
      });

      // Requirement 10.4: Send notification when member is kicked
      const kickedUser = await User.findOne({ firebaseUid: targetUserId });
      if (kickedUser) {
        await NotificationService.sendMemberKickedNotification(
          room,
          kickedUser
        );
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof PermissionError || error instanceof ConflictError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        ownerId,
        roomId,
        targetUserId,
        operation: 'kickMember',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('roomId', roomId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('kickMember', error, { ownerId, roomId, targetUserId });
      }

      throw error;
    }
  }

  /**
   * Leave a room (members only, not owners)
   * Requirements: 16.1-16.5, 17.1-17.3
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async leaveRoom(roomId, userId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Fetch room
      const room = await Room.findOne({
        _id: roomId,
        deletedAt: null
      });

      if (!room) {
        throw new NotFoundError('Room', roomId, { userId });
      }

      // Requirement 17.1-17.3: Owners cannot leave rooms
      if (room.ownerId === userId) {
        throw new ConflictError('Room', 'Owners cannot leave rooms. Delete the room instead.');
      }

      // Verify user is a member
      const membership = await RoomMember.findOne({
        roomId,
        userId
      });

      if (!membership) {
        throw new NotFoundError('RoomMember', userId, { roomId });
      }

      // Requirement 16.2: Remove member from room_members
      await RoomMember.deleteOne({
        roomId,
        userId
      });

      await ErrorLoggingService.logSystemEvent('member_left', {
        roomId,
        userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        userId,
        roomId,
        operation: 'leaveRoom',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('roomId', roomId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('leaveRoom', error, { userId, roomId });
      }

      throw error;
    }
  }

  /**
   * Add a skill map to a room (owner only)
   * Requirements: 13.1-13.8
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID (must be owner)
   * @param {string} skillMapId - Skill map ID to add
   * @returns {Promise<Object>} Created RoomSkillMap record
   */
  async addSkillMap(roomId, userId, skillMapId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    if (!skillMapId) {
      throw new ValidationError('skillMapId', skillMapId, { type: 'required' });
    }

    try {
      // Fetch room
      const room = await Room.findOne({
        _id: roomId,
        deletedAt: null
      });

      if (!room) {
        throw new NotFoundError('Room', roomId, { userId });
      }

      // Verify user is room owner
      if (room.ownerId !== userId) {
        throw new PermissionError('Room', 'add skill map', userId, { roomId });
      }

      // Verify skill map exists
      const skillMap = await Skill.findById(skillMapId).lean();
      if (!skillMap) {
        throw new NotFoundError('Skill', skillMapId, { userId, roomId });
      }

      // Enforce 6 skill map limit per room
      const skillMapCount = await RoomSkillMap.countDocuments({ roomId });
      if (skillMapCount >= 6) {
        throw new ConflictError('RoomSkillMap', 'Room can have a maximum of 6 skill maps');
      }

      // Fetch nodes for this skill map to create an independent copy
      const nodes = await Node.find({ skillId: skillMapId }).sort({ order: 1 }).lean();

      // Create RoomSkillMap with embedded data (independent copy)
      const roomSkillMap = new RoomSkillMap({
        roomId,
        skillMapId, // keep reference for tracking
        addedBy: userId,
        name: skillMap.name || 'Untitled',
        description: skillMap.description || '',
        icon: skillMap.icon || 'Map',
        color: skillMap.color || '#2e5023',
        goal: skillMap.goal || '',
        nodes: nodes.map(n => ({
          title: n.title || 'Untitled Node',
          description: n.description || '',
          type: n.type || 'Learn',
          order: n.order || 0,
          status: 'Not Started',
          originalNodeId: n._id
        })),
        nodeCount: nodes.length
      });

      await roomSkillMap.save();

      await ErrorLoggingService.logSystemEvent('skill_map_added', {
        roomId,
        userId,
        skillMapId,
        roomSkillMapId: roomSkillMap._id,
        nodesCopied: nodes.length,
        timestamp: new Date().toISOString()
      });

      return roomSkillMap.toObject();
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof PermissionError || 
          error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        userId,
        roomId,
        skillMapId,
        operation: 'addSkillMap',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('id', error.value, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('addSkillMap', error, { userId, roomId, skillMapId });
      }

      throw error;
    }
  }

  /**
   * Create a room skill map directly from template data (no personal skill map created)
   */
  async addSkillMapFromTemplate(roomId, userId, templateData) {
    if (!roomId) throw new ValidationError('roomId', roomId, { type: 'required' });
    if (!userId) throw new ValidationError('userId', userId, { type: 'required' });

    try {
      const room = await Room.findOne({ _id: roomId, deletedAt: null });
      if (!room) throw new NotFoundError('Room', roomId, { userId });
      if (room.ownerId !== userId) throw new PermissionError('Room', 'add skill map', userId, { roomId });

      const skillMapCount = await RoomSkillMap.countDocuments({ roomId });
      if (skillMapCount >= 6) {
        throw new ConflictError('RoomSkillMap', 'Room can have a maximum of 6 skill maps');
      }

      const nodes = (templateData.nodes || []).map((n, i) => ({
        title: n.title || `Node ${i + 1}`,
        description: n.description || '',
        type: n.type || 'Learn',
        order: n.order ?? i,
        status: 'Not Started'
      }));

      const roomSkillMap = new RoomSkillMap({
        roomId,
        addedBy: userId,
        name: templateData.name || 'Untitled',
        description: templateData.description || '',
        icon: templateData.icon || 'Map',
        color: templateData.color || '#2e5023',
        goal: templateData.goal || '',
        nodes,
        nodeCount: nodes.length
      });

      await roomSkillMap.save();

      await ErrorLoggingService.logSystemEvent('room_skill_map_from_template', {
        roomId, userId, roomSkillMapId: roomSkillMap._id,
        nodeCount: nodes.length,
        timestamp: new Date().toISOString()
      });

      return roomSkillMap.toObject();
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof PermissionError ||
          error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Remove a skill map from a room (owner only)
   * Requirements: 34.1-34.6
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID (must be owner)
   * @param {string} skillMapId - Skill map ID to remove
   * @returns {Promise<void>}
   */
  async removeSkillMap(roomId, userId, roomSkillMapId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    if (!roomSkillMapId) {
      throw new ValidationError('roomSkillMapId', roomSkillMapId, { type: 'required' });
    }

    try {
      // Fetch room
      const room = await Room.findOne({
        _id: roomId,
        deletedAt: null
      });

      if (!room) {
        throw new NotFoundError('Room', roomId, { userId });
      }

      // Verify user is room owner
      if (room.ownerId !== userId) {
        throw new PermissionError('Room', 'remove skill map', userId, { roomId });
      }

      // Try finding by _id first, then by skillMapId for backward compat
      let roomSkillMap = await RoomSkillMap.findOne({ _id: roomSkillMapId, roomId });
      if (!roomSkillMap) {
        roomSkillMap = await RoomSkillMap.findOne({ roomId, skillMapId: roomSkillMapId });
      }

      if (!roomSkillMap) {
        throw new NotFoundError('RoomSkillMap', roomSkillMapId, { roomId });
      }

      await RoomSkillMap.deleteOne({ _id: roomSkillMap._id });

      await ErrorLoggingService.logSystemEvent('skill_map_removed', {
        roomId,
        userId,
        roomSkillMapId: roomSkillMap._id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof PermissionError || 
          error instanceof ValidationError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        userId,
        roomId,
        roomSkillMapId,
        operation: 'removeSkillMap',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('id', error.value, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('removeSkillMap', error, { userId, roomId, roomSkillMapId });
      }

      throw error;
    }
  }

  /**
   * Get all skill maps for a room with details
   * Requirements: 13.1-13.8, 34.1-34.6
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID (must be member)
   * @returns {Promise<Array>} Array of skill maps with metadata
   */
  async getRoomSkillMaps(roomId, userId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Verify user is room member
      const membership = await RoomMember.findOne({
        roomId,
        userId
      });

      if (!membership) {
        throw new PermissionError('Room', 'view skill maps', userId, { roomId });
      }

      // Fetch all RoomSkillMap records — they now contain embedded data
      const roomSkillMaps = await RoomSkillMap.find({ roomId })
        .sort({ createdAt: -1 })
        .lean();

      // Get user's progress for each skill map
      const progressRecords = await RoomNodeProgress.find({
        roomId,
        userId
      }).lean();

      // Group progress by skillMapId
      const progressByMap = {};
      progressRecords.forEach(p => {
        const mapId = p.skillMapId.toString();
        if (!progressByMap[mapId]) progressByMap[mapId] = [];
        progressByMap[mapId].push(p);
      });

      // Add completion data to each skill map
      const enriched = roomSkillMaps.map(sm => {
        const mapProgress = progressByMap[sm._id.toString()] || [];
        const completedCount = mapProgress.filter(p => p.status === 'Completed').length;
        const totalCount = sm.nodeCount || sm.nodes?.length || 0;
        return {
          ...sm,
          completedCount,
          completionPercentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
        };
      });

      return enriched;
    } catch (error) {
      if (error instanceof PermissionError || error instanceof ValidationError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        userId,
        roomId,
        operation: 'getRoomSkillMaps',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('roomId', roomId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getRoomSkillMaps', error, { userId, roomId });
      }

      throw error;
    }
  }
}

export default new RoomService();
