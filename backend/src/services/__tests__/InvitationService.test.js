import InvitationService from '../InvitationService.js';
import RoomInvitation from '../../models/RoomInvitation.js';
import Room from '../../models/Room.js';
import RoomMember from '../../models/RoomMember.js';
import User from '../../models/User.js';
import mongoose from 'mongoose';
import {
  ValidationError,
  NotFoundError,
  PermissionError,
  ConflictError
} from '../../utils/errors.js';

// Mock the models
jest.mock('../../models/RoomInvitation.js');
jest.mock('../../models/Room.js');
jest.mock('../../models/RoomMember.js');
jest.mock('../../models/User.js');
jest.mock('../ErrorLoggingService.js');

describe('InvitationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    it('should create invitation successfully with valid inputs', async () => {
      const roomId = new mongoose.Types.ObjectId();
      const ownerId = 'owner123';
      const invitedEmail = 'invited@example.com';

      // Mock room lookup
      Room.findOne.mockResolvedValue({
        _id: roomId,
        ownerId,
        name: 'Test Room',
        deletedAt: null
      });

      // Mock owner lookup
      User.findOne.mockImplementation(({ firebaseUid, email }) => {
        if (firebaseUid === ownerId) {
          return Promise.resolve({ firebaseUid: ownerId, email: 'owner@example.com' });
        }
        if (email === invitedEmail) {
          return Promise.resolve({ firebaseUid: 'invited123', email: invitedEmail });
        }
        return Promise.resolve(null);
      });

      // Mock no existing member
      RoomMember.findOne.mockResolvedValue(null);

      // Mock no existing invitation
      RoomInvitation.findOne.mockResolvedValue(null);

      // Mock member count
      RoomMember.countDocuments.mockResolvedValue(2);

      // Mock invitation save
      const mockInvitation = {
        _id: new mongoose.Types.ObjectId(),
        roomId,
        invitedBy: ownerId,
        invitedEmail,
        invitedUserId: 'invited123',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          roomId,
          invitedBy: ownerId,
          invitedEmail,
          status: 'pending'
        })
      };

      RoomInvitation.mockImplementation(() => mockInvitation);

      const result = await InvitationService.createInvitation(roomId.toString(), ownerId, invitedEmail);

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(mockInvitation.save).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid email format', async () => {
      const roomId = new mongoose.Types.ObjectId();
      const ownerId = 'owner123';
      const invalidEmail = 'not-an-email';

      await expect(
        InvitationService.createInvitation(roomId.toString(), ownerId, invalidEmail)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError when inviting yourself', async () => {
      const roomId = new mongoose.Types.ObjectId();
      const ownerId = 'owner123';
      const ownerEmail = 'owner@example.com';

      Room.findOne.mockResolvedValue({
        _id: roomId,
        ownerId,
        name: 'Test Room',
        deletedAt: null
      });

      User.findOne.mockResolvedValue({
        firebaseUid: ownerId,
        email: ownerEmail
      });

      await expect(
        InvitationService.createInvitation(roomId.toString(), ownerId, ownerEmail)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError when email not registered', async () => {
      const roomId = new mongoose.Types.ObjectId();
      const ownerId = 'owner123';
      const unregisteredEmail = 'notfound@example.com';

      Room.findOne.mockResolvedValue({
        _id: roomId,
        ownerId,
        name: 'Test Room',
        deletedAt: null
      });

      User.findOne.mockImplementation(({ firebaseUid, email }) => {
        if (firebaseUid === ownerId) {
          return Promise.resolve({ firebaseUid: ownerId, email: 'owner@example.com' });
        }
        return Promise.resolve(null);
      });

      await expect(
        InvitationService.createInvitation(roomId.toString(), ownerId, unregisteredEmail)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when user is already a member', async () => {
      const roomId = new mongoose.Types.ObjectId();
      const ownerId = 'owner123';
      const memberEmail = 'member@example.com';

      Room.findOne.mockResolvedValue({
        _id: roomId,
        ownerId,
        name: 'Test Room',
        deletedAt: null
      });

      User.findOne.mockImplementation(({ firebaseUid, email }) => {
        if (firebaseUid === ownerId) {
          return Promise.resolve({ firebaseUid: ownerId, email: 'owner@example.com' });
        }
        if (email === memberEmail) {
          return Promise.resolve({ firebaseUid: 'member123', email: memberEmail });
        }
        return Promise.resolve(null);
      });

      RoomMember.findOne.mockResolvedValue({
        roomId,
        userId: 'member123',
        role: 'member'
      });

      await expect(
        InvitationService.createInvitation(roomId.toString(), ownerId, memberEmail)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when pending invitation exists', async () => {
      const roomId = new mongoose.Types.ObjectId();
      const ownerId = 'owner123';
      const invitedEmail = 'invited@example.com';

      Room.findOne.mockResolvedValue({
        _id: roomId,
        ownerId,
        name: 'Test Room',
        deletedAt: null
      });

      User.findOne.mockImplementation(({ firebaseUid, email }) => {
        if (firebaseUid === ownerId) {
          return Promise.resolve({ firebaseUid: ownerId, email: 'owner@example.com' });
        }
        if (email === invitedEmail) {
          return Promise.resolve({ firebaseUid: 'invited123', email: invitedEmail });
        }
        return Promise.resolve(null);
      });

      RoomMember.findOne.mockResolvedValue(null);

      RoomInvitation.findOne.mockResolvedValue({
        roomId,
        invitedEmail,
        status: 'pending'
      });

      await expect(
        InvitationService.createInvitation(roomId.toString(), ownerId, invitedEmail)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when room is full', async () => {
      const roomId = new mongoose.Types.ObjectId();
      const ownerId = 'owner123';
      const invitedEmail = 'invited@example.com';

      Room.findOne.mockResolvedValue({
        _id: roomId,
        ownerId,
        name: 'Test Room',
        deletedAt: null
      });

      User.findOne.mockImplementation(({ firebaseUid, email }) => {
        if (firebaseUid === ownerId) {
          return Promise.resolve({ firebaseUid: ownerId, email: 'owner@example.com' });
        }
        if (email === invitedEmail) {
          return Promise.resolve({ firebaseUid: 'invited123', email: invitedEmail });
        }
        return Promise.resolve(null);
      });

      RoomMember.findOne.mockResolvedValue(null);
      RoomInvitation.findOne.mockResolvedValue(null);
      RoomMember.countDocuments.mockResolvedValue(5); // Room is full

      await expect(
        InvitationService.createInvitation(roomId.toString(), ownerId, invitedEmail)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('expireInvitations', () => {
    it('should expire pending invitations past expiration date', async () => {
      const mockResult = {
        modifiedCount: 3
      };

      RoomInvitation.updateMany.mockResolvedValue(mockResult);

      const result = await InvitationService.expireInvitations();

      expect(result.expiredCount).toBe(3);
      expect(RoomInvitation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          expiresAt: expect.any(Object)
        }),
        expect.objectContaining({
          $set: { status: 'expired' }
        })
      );
    });
  });

  describe('_isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(InvitationService._isValidEmail('test@example.com')).toBe(true);
      expect(InvitationService._isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(InvitationService._isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(InvitationService._isValidEmail('not-an-email')).toBe(false);
      expect(InvitationService._isValidEmail('@example.com')).toBe(false);
      expect(InvitationService._isValidEmail('user@')).toBe(false);
      expect(InvitationService._isValidEmail('user@domain')).toBe(false);
      expect(InvitationService._isValidEmail('')).toBe(false);
    });
  });
});
