import RoomInvitation from '../models/RoomInvitation.js';
import Room from '../models/Room.js';
import RoomMember from '../models/RoomMember.js';
import User from '../models/User.js';
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
import SubscriptionService from './SubscriptionService.js';

/**
 * InvitationService - Manages room invitations and acceptance/decline logic
 * Requirements: 5.1-5.8, 6.1-6.4, 7.1-7.7, 8.1-8.8, 9.1-9.4
 */
class InvitationService {
  /**
   * Validate email format using regex
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid email format
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create a new invitation with validation
   * Requirements: 5.1-5.8, 6.1-6.4, 7.1-7.2
   * @param {string} roomId - Room ID
   * @param {string} ownerId - Owner user ID
   * @param {string} invitedEmail - Email address to invite
   * @returns {Promise<Object>} Created invitation
   */
  async createInvitation(roomId, ownerId, invitedEmail) {
    // Validate inputs
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!ownerId) {
      throw new ValidationError('ownerId', ownerId, { type: 'required' });
    }

    if (!invitedEmail) {
      throw new ValidationError('invitedEmail', invitedEmail, { type: 'required' });
    }

    // Requirement 5.3: Validate email format
    const trimmedEmail = invitedEmail.trim().toLowerCase();
    if (!this._isValidEmail(trimmedEmail)) {
      throw new ValidationError('invitedEmail', invitedEmail, { type: 'format', format: 'email' });
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

      // Verify ownership
      if (room.ownerId !== ownerId) {
        throw new PermissionError('Room', 'invite members', ownerId, { roomId });
      }

      // Requirement 6.3: Prevent self-invitation
      const owner = await User.findOne({ firebaseUid: ownerId });
      if (owner && owner.email.toLowerCase() === trimmedEmail) {
        throw new ConflictError('RoomInvitation', 'You cannot invite yourself');
      }

      // Requirement 5.4, 5.7: Check if email matches a registered user
      const invitedUser = await User.findOne({ email: trimmedEmail });
      if (!invitedUser) {
        throw new NotFoundError('User', trimmedEmail, { 
          message: 'No account found with this email' 
        });
      }

      // Requirement 6.2: Check if user is already a member
      const existingMember = await RoomMember.findOne({
        roomId,
        userId: invitedUser.firebaseUid
      });

      if (existingMember) {
        throw new ConflictError('RoomInvitation', 'User is already a member');
      }

      // Requirement 6.1: Check for pending invitation
      const existingInvitation = await RoomInvitation.findOne({
        roomId,
        invitedEmail: trimmedEmail,
        status: 'pending'
      });

      if (existingInvitation) {
        throw new ConflictError('RoomInvitation', 'Invitation already sent to this user');
      }

      // Check room capacity based on owner's subscription tier
      const memberCount = await RoomMember.countDocuments({ roomId });
      const memberCheck = await SubscriptionService.canAddRoomMember(room.ownerId, memberCount);
      if (!memberCheck.allowed) {
        const maxLabel = memberCheck.max === -1 ? 'unlimited' : memberCheck.max;
        throw new ConflictError('Room', `Room is full (${memberCount}/${maxLabel} members). ${memberCheck.tier === 'free' ? 'Upgrade to Pro for more members.' : ''}`);
      }

      // Requirement 7.1, 7.2: Create invitation with pending status and 7-day expiration
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const invitation = new RoomInvitation({
        roomId,
        invitedBy: ownerId,
        invitedEmail: trimmedEmail,
        invitedUserId: invitedUser.firebaseUid,
        status: 'pending',
        expiresAt
      });

      await invitation.save();

      await ErrorLoggingService.logSystemEvent('invitation_created', {
        roomId,
        ownerId,
        invitedEmail: trimmedEmail,
        invitedUserId: invitedUser.firebaseUid,
        expiresAt,
        timestamp: new Date().toISOString()
      });

      // Requirement 5.5-5.6: Send in-app and email notifications
      if (owner) {
        await NotificationService.sendInvitationCreatedNotification(
          invitation.toObject(),
          room,
          invitedUser,
          owner
        );
      }

      return invitation.toObject();
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || 
          error instanceof PermissionError || error instanceof ConflictError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        ownerId,
        roomId,
        invitedEmail,
        operation: 'createInvitation',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('roomId', roomId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('createInvitation', error, { ownerId, roomId, invitedEmail });
      }

      throw error;
    }
  }

  /**
   * Accept an invitation and add user to room
   * Requirements: 8.1-8.8
   * @param {string} invitationId - Invitation ID
   * @param {string} userId - User ID accepting the invitation
   * @returns {Promise<Object>} Updated invitation and membership
   */
  async acceptInvitation(invitationId, userId) {
    if (!invitationId) {
      throw new ValidationError('invitationId', invitationId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch invitation
      const invitation = await RoomInvitation.findById(invitationId).session(session);

      if (!invitation) {
        throw new NotFoundError('RoomInvitation', invitationId, { userId });
      }

      // Verify user is the invited user
      if (invitation.invitedUserId !== userId) {
        throw new PermissionError('RoomInvitation', 'accept', userId, { invitationId });
      }

      // Requirement 8.3: Verify invitation is still pending
      if (invitation.status !== 'pending') {
        throw new ConflictError('RoomInvitation', `Invitation is ${invitation.status}`);
      }

      // Requirement 7.7: Check if invitation has expired
      if (new Date() > invitation.expiresAt) {
        invitation.status = 'expired';
        await invitation.save({ session });
        throw new ConflictError('RoomInvitation', 'Invitation has expired');
      }

      // Verify room still exists
      const room = await Room.findOne({
        _id: invitation.roomId,
        deletedAt: null
      }).session(session);

      if (!room) {
        throw new NotFoundError('Room', invitation.roomId, { userId });
      }

      // Verify room has capacity based on owner's subscription tier
      const memberCount = await RoomMember.countDocuments({ 
        roomId: invitation.roomId 
      }).session(session);

      const memberCheck = await SubscriptionService.canAddRoomMember(room.ownerId, memberCount);
      if (!memberCheck.allowed) {
        // Keep invitation pending
        await session.abortTransaction();
        throw new ConflictError('Room', 'Room is full');
      }

      // Requirement 8.5: Add user to room_members with role "member"
      const membership = new RoomMember({
        roomId: invitation.roomId,
        userId,
        role: 'member'
      });

      await membership.save({ session });

      // Requirement 8.6: Update invitation status to "accepted"
      invitation.status = 'accepted';
      await invitation.save({ session });

      await session.commitTransaction();

      // Requirements 18.1-18.4: Initialize room progress for the new member
      try {
        await RoomNodeProgressService.initializeRoomProgress(
          invitation.roomId.toString(), 
          userId
        );
      } catch (progressError) {
        // Log but don't fail the invitation acceptance if progress initialization fails
        await ErrorLoggingService.logError(progressError, {
          roomId: invitation.roomId.toString(),
          userId,
          invitationId,
          operation: 'initializeRoomProgressOnInvitationAccept',
          timestamp: new Date().toISOString()
        });
      }

      await ErrorLoggingService.logSystemEvent('invitation_accepted', {
        invitationId,
        roomId: invitation.roomId,
        userId,
        timestamp: new Date().toISOString()
      });

      // Requirement 8.7: Send notification to owner when invitation is accepted
      const acceptedUser = await User.findOne({ firebaseUid: userId });
      const ownerUser = await User.findOne({ firebaseUid: room.ownerId });
      
      if (acceptedUser && ownerUser) {
        await NotificationService.sendInvitationAcceptedNotification(
          invitation.toObject(),
          room,
          acceptedUser,
          ownerUser
        );
      }

      return {
        invitation: invitation.toObject(),
        membership: membership.toObject()
      };
    } catch (error) {
      await session.abortTransaction();

      if (error instanceof ValidationError || error instanceof NotFoundError || 
          error instanceof PermissionError || error instanceof ConflictError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        userId,
        invitationId,
        operation: 'acceptInvitation',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('invitationId', invitationId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('acceptInvitation', error, { userId, invitationId });
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Decline an invitation
   * Requirements: 9.1-9.4
   * @param {string} invitationId - Invitation ID
   * @param {string} userId - User ID declining the invitation
   * @returns {Promise<Object>} Updated invitation
   */
  async declineInvitation(invitationId, userId) {
    if (!invitationId) {
      throw new ValidationError('invitationId', invitationId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Fetch invitation
      const invitation = await RoomInvitation.findById(invitationId);

      if (!invitation) {
        throw new NotFoundError('RoomInvitation', invitationId, { userId });
      }

      // Verify user is the invited user
      if (invitation.invitedUserId !== userId) {
        throw new PermissionError('RoomInvitation', 'decline', userId, { invitationId });
      }

      // Verify invitation is still pending
      if (invitation.status !== 'pending') {
        throw new ConflictError('RoomInvitation', `Invitation is already ${invitation.status}`);
      }

      // Requirement 9.1: Update invitation status to "declined"
      invitation.status = 'declined';
      await invitation.save();

      // Requirement 9.4: Do not add user to room_members (no action needed)

      await ErrorLoggingService.logSystemEvent('invitation_declined', {
        invitationId,
        roomId: invitation.roomId,
        userId,
        timestamp: new Date().toISOString()
      });

      // Requirement 9.2: Send notification to owner when invitation is declined
      const room = await Room.findById(invitation.roomId);
      const declinedUser = await User.findOne({ firebaseUid: userId });
      const ownerUser = await User.findOne({ firebaseUid: invitation.invitedBy });
      
      if (room && declinedUser && ownerUser) {
        await NotificationService.sendInvitationDeclinedNotification(
          invitation.toObject(),
          room,
          declinedUser,
          ownerUser
        );
      }

      return invitation.toObject();
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || 
          error instanceof PermissionError || error instanceof ConflictError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        userId,
        invitationId,
        operation: 'declineInvitation',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('invitationId', invitationId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('declineInvitation', error, { userId, invitationId });
      }

      throw error;
    }
  }

  /**
   * Get all pending invitations for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of pending invitations with room details
   */
  async getUserInvitations(userId) {
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Fetch all pending invitations for the user
      const invitations = await RoomInvitation.find({
        invitedUserId: userId,
        status: 'pending',
        expiresAt: { $gt: new Date() } // Only non-expired invitations
      })
        .sort({ createdAt: -1 })
        .lean();

      if (invitations.length === 0) {
        return [];
      }

      // Get room IDs
      const roomIds = invitations.map(inv => inv.roomId);

      // Fetch room details
      const rooms = await Room.find({
        _id: { $in: roomIds },
        deletedAt: null
      }).lean();

      // Create room lookup
      const roomLookup = rooms.reduce((acc, room) => {
        acc[room._id.toString()] = room;
        return acc;
      }, {});

      // Get owner IDs
      const ownerIds = invitations.map(inv => inv.invitedBy);

      // Fetch owner details
      const owners = await User.find({
        firebaseUid: { $in: ownerIds }
      }).select('firebaseUid name email').lean();

      // Create owner lookup
      const ownerLookup = owners.reduce((acc, owner) => {
        acc[owner.firebaseUid] = owner;
        return acc;
      }, {});

      // Combine invitation data with room and owner details
      const invitationsWithDetails = invitations.map(inv => ({
        ...inv,
        room: roomLookup[inv.roomId.toString()] || null,
        invitedByUser: ownerLookup[inv.invitedBy] || null
      }));

      return invitationsWithDetails;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        userId,
        operation: 'getUserInvitations',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getUserInvitations', error, { userId });
      }

      throw error;
    }
  }

  /**
   * Get recent notifications (last 10 invitations of all statuses) for the notification bell
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of recent invitations with room and inviter details
   */
  async getRecentNotifications(userId) {
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Fetch last 10 invitations regardless of status
      const invitations = await RoomInvitation.find({
        invitedUserId: userId
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (invitations.length === 0) {
        return [];
      }

      // Get room IDs
      const roomIds = invitations.map(inv => inv.roomId);

      // Fetch room details (include deleted rooms for history)
      const rooms = await Room.find({
        _id: { $in: roomIds }
      }).lean();

      const roomLookup = rooms.reduce((acc, room) => {
        acc[room._id.toString()] = room;
        return acc;
      }, {});

      // Get inviter IDs
      const ownerIds = [...new Set(invitations.map(inv => inv.invitedBy))];

      const owners = await User.find({
        firebaseUid: { $in: ownerIds }
      }).select('firebaseUid name email').lean();

      const ownerLookup = owners.reduce((acc, owner) => {
        acc[owner.firebaseUid] = owner;
        return acc;
      }, {});

      const notificationsWithDetails = invitations.map(inv => ({
        ...inv,
        room: roomLookup[inv.roomId.toString()] || null,
        invitedByUser: ownerLookup[inv.invitedBy] || null
      }));

      return notificationsWithDetails;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        userId,
        operation: 'getRecentNotifications',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getRecentNotifications', error, { userId });
      }

      throw error;
    }
  }

  /**
   * Get all invitations for a room (owner only)
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID (must be owner)
   * @returns {Promise<Array>} Array of invitations with user details
   */
  async getRoomInvitations(roomId, userId) {
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
        throw new PermissionError('Room', 'view invitations', userId, { roomId });
      }

      // Fetch all invitations for the room
      const invitations = await RoomInvitation.find({ roomId })
        .sort({ createdAt: -1 })
        .lean();

      if (invitations.length === 0) {
        return [];
      }

      // Get invited user IDs (filter out nulls)
      const invitedUserIds = invitations
        .map(inv => inv.invitedUserId)
        .filter(id => id !== null);

      // Fetch invited user details
      const users = await User.find({
        firebaseUid: { $in: invitedUserIds }
      }).select('firebaseUid name email').lean();

      // Create user lookup
      const userLookup = users.reduce((acc, user) => {
        acc[user.firebaseUid] = user;
        return acc;
      }, {});

      // Combine invitation data with user details
      const invitationsWithDetails = invitations.map(inv => ({
        ...inv,
        invitedUser: inv.invitedUserId ? userLookup[inv.invitedUserId] || null : null
      }));

      return invitationsWithDetails;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || 
          error instanceof PermissionError) {
        throw error;
      }

      await ErrorLoggingService.logError(error, {
        userId,
        roomId,
        operation: 'getRoomInvitations',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('roomId', roomId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getRoomInvitations', error, { userId, roomId });
      }

      throw error;
    }
  }

  /**
   * Expire pending invitations past their expiration date
   * Requirements: 7.5, 7.6
   * Background job method - should be called by cron scheduler
   * @returns {Promise<Object>} Count of expired invitations
   */
  async expireInvitations() {
    try {
      const now = new Date();

      // Requirement 7.5, 7.6: Update status to "expired" for pending invitations past expiration date
      const result = await RoomInvitation.updateMany(
        {
          status: 'pending',
          expiresAt: { $lte: now }
        },
        {
          $set: { status: 'expired' }
        }
      );

      await ErrorLoggingService.logSystemEvent('invitations_expired', {
        expiredCount: result.modifiedCount,
        timestamp: new Date().toISOString()
      });

      return {
        expiredCount: result.modifiedCount,
        timestamp: now.toISOString()
      };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        operation: 'expireInvitations',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('expireInvitations', error, {});
      }

      throw error;
    }
  }
}

export default new InvitationService();
