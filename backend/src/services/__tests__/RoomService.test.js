/**
 * RoomService Tests - Member Management and Skill Map Management Methods
 * 
 * Tests for getRoomMembers, kickMember, leaveRoom, addSkillMap, removeSkillMap, and getRoomSkillMaps methods
 * Validates Requirements: 10.1-10.6, 16.1-16.5, 17.1-17.3, 13.1-13.8, 34.1-34.6
 */

import { jest } from '@jest/globals';
import RoomService from '../RoomService.js';
import Room from '../../models/Room.js';
import RoomMember from '../../models/RoomMember.js';
import RoomSkillMap from '../../models/RoomSkillMap.js';
import User from '../../models/User.js';
import Skill from '../../models/Skill.js';
import ErrorLoggingService from '../ErrorLoggingService.js';
import {
  ValidationError,
  NotFoundError,
  PermissionError,
  ConflictError
} from '../../utils/errors.js';

// Mock the models
jest.mock('../../models/Room.js');
jest.mock('../../models/RoomMember.js');
jest.mock('../../models/RoomSkillMap.js');
jest.mock('../../models/User.js');
jest.mock('../../models/Skill.js');
jest.mock('../ErrorLoggingService.js');

describe('RoomService - Member Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ErrorLoggingService.logError = jest.fn();
    ErrorLoggingService.logSystemEvent = jest.fn();
  });

  describe('getRoomMembers', () => {
    it('should return all members with user details', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const mockMembers = [
        {
          _id: 'member1',
          roomId,
          userId: 'user123',
          role: 'owner',
          joinedAt: new Date('2024-01-01')
        },
        {
          _id: 'member2',
          roomId,
          userId: 'user456',
          role: 'member',
          joinedAt: new Date('2024-01-02')
        }
      ];

      const mockUsers = [
        {
          firebaseUid: 'user123',
          name: 'Alice',
          email: 'alice@example.com'
        },
        {
          firebaseUid: 'user456',
          name: 'Bob',
          email: 'bob@example.com'
        }
      ];

      RoomMember.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockMembers)
        })
      });

      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      const result = await RoomService.getRoomMembers(roomId);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user123');
      expect(result[0].role).toBe('owner');
      expect(result[0].user.name).toBe('Alice');
      expect(result[1].userId).toBe('user456');
      expect(result[1].role).toBe('member');
      expect(result[1].user.name).toBe('Bob');
    });

    it('should return empty array when room has no members', async () => {
      const roomId = '507f1f77bcf86cd799439011';

      RoomMember.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      const result = await RoomService.getRoomMembers(roomId);

      expect(result).toEqual([]);
    });

    it('should throw ValidationError when roomId is missing', async () => {
      await expect(RoomService.getRoomMembers(null)).rejects.toThrow(ValidationError);
      await expect(RoomService.getRoomMembers('')).rejects.toThrow(ValidationError);
    });

    it('should handle missing user details gracefully', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const mockMembers = [
        {
          _id: 'member1',
          roomId,
          userId: 'user123',
          role: 'owner',
          joinedAt: new Date('2024-01-01')
        }
      ];

      RoomMember.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockMembers)
        })
      });

      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]) // No users found
        })
      });

      const result = await RoomService.getRoomMembers(roomId);

      expect(result).toHaveLength(1);
      expect(result[0].user).toBeNull();
    });
  });

  describe('kickMember', () => {
    it('should successfully kick a member when owner', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const ownerId = 'owner123';
      const targetUserId = 'member456';

      const mockRoom = {
        _id: roomId,
        ownerId,
        name: 'Test Room',
        deletedAt: null
      };

      const mockMember = {
        _id: 'membership1',
        roomId,
        userId: targetUserId,
        role: 'member'
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);
      RoomMember.findOne = jest.fn().mockResolvedValue(mockMember);
      RoomMember.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await RoomService.kickMember(roomId, ownerId, targetUserId);

      expect(RoomMember.deleteOne).toHaveBeenCalledWith({
        roomId,
        userId: targetUserId
      });
      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'member_kicked',
        expect.objectContaining({
          roomId,
          ownerId,
          targetUserId
        })
      );
    });

    it('should throw PermissionError when non-owner tries to kick', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const nonOwnerId = 'user123';
      const targetUserId = 'member456';

      const mockRoom = {
        _id: roomId,
        ownerId: 'owner999',
        name: 'Test Room',
        deletedAt: null
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);

      await expect(
        RoomService.kickMember(roomId, nonOwnerId, targetUserId)
      ).rejects.toThrow(PermissionError);
    });

    it('should throw ConflictError when owner tries to kick themselves', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const ownerId = 'owner123';

      const mockRoom = {
        _id: roomId,
        ownerId,
        name: 'Test Room',
        deletedAt: null
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);

      await expect(
        RoomService.kickMember(roomId, ownerId, ownerId)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError when room does not exist', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const ownerId = 'owner123';
      const targetUserId = 'member456';

      Room.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        RoomService.kickMember(roomId, ownerId, targetUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when target user is not a member', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const ownerId = 'owner123';
      const targetUserId = 'nonmember456';

      const mockRoom = {
        _id: roomId,
        ownerId,
        name: 'Test Room',
        deletedAt: null
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);
      RoomMember.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        RoomService.kickMember(roomId, ownerId, targetUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when required parameters are missing', async () => {
      await expect(
        RoomService.kickMember(null, 'owner123', 'member456')
      ).rejects.toThrow(ValidationError);

      await expect(
        RoomService.kickMember('roomId', null, 'member456')
      ).rejects.toThrow(ValidationError);

      await expect(
        RoomService.kickMember('roomId', 'owner123', null)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('leaveRoom', () => {
    it('should successfully remove member when leaving', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'member456';

      const mockRoom = {
        _id: roomId,
        ownerId: 'owner123',
        name: 'Test Room',
        deletedAt: null
      };

      const mockMembership = {
        _id: 'membership1',
        roomId,
        userId,
        role: 'member'
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);
      RoomMember.findOne = jest.fn().mockResolvedValue(mockMembership);
      RoomMember.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await RoomService.leaveRoom(roomId, userId);

      expect(RoomMember.deleteOne).toHaveBeenCalledWith({
        roomId,
        userId
      });
      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'member_left',
        expect.objectContaining({
          roomId,
          userId
        })
      );
    });

    it('should throw ConflictError when owner tries to leave', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const ownerId = 'owner123';

      const mockRoom = {
        _id: roomId,
        ownerId,
        name: 'Test Room',
        deletedAt: null
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);

      await expect(
        RoomService.leaveRoom(roomId, ownerId)
      ).rejects.toThrow(ConflictError);

      await expect(
        RoomService.leaveRoom(roomId, ownerId)
      ).rejects.toThrow('Owners cannot leave rooms. Delete the room instead.');
    });

    it('should throw NotFoundError when room does not exist', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'member456';

      Room.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        RoomService.leaveRoom(roomId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when user is not a member', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'nonmember456';

      const mockRoom = {
        _id: roomId,
        ownerId: 'owner123',
        name: 'Test Room',
        deletedAt: null
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);
      RoomMember.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        RoomService.leaveRoom(roomId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when required parameters are missing', async () => {
      await expect(
        RoomService.leaveRoom(null, 'user123')
      ).rejects.toThrow(ValidationError);

      await expect(
        RoomService.leaveRoom('roomId', null)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('addSkillMap', () => {
    it('should successfully add skill map when user is owner', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'owner123';
      const skillMapId = '507f1f77bcf86cd799439022';

      const mockRoom = {
        _id: roomId,
        ownerId: userId,
        name: 'Test Room',
        deletedAt: null
      };

      const mockSkillMap = {
        _id: skillMapId,
        userId: 'creator123',
        name: 'JavaScript Basics',
        nodeCount: 10
      };

      const mockRoomSkillMap = {
        _id: 'rsm1',
        roomId,
        skillMapId,
        addedBy: userId,
        createdAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: 'rsm1',
          roomId,
          skillMapId,
          addedBy: userId,
          createdAt: new Date()
        })
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);
      Skill.findById = jest.fn().mockResolvedValue(mockSkillMap);
      RoomSkillMap.findOne = jest.fn().mockResolvedValue(null);
      RoomSkillMap.mockImplementation(() => mockRoomSkillMap);
      mockRoomSkillMap.save = jest.fn().mockResolvedValue(mockRoomSkillMap);

      const result = await RoomService.addSkillMap(roomId, userId, skillMapId);

      expect(result).toBeDefined();
      expect(mockRoomSkillMap.save).toHaveBeenCalled();
      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'skill_map_added',
        expect.objectContaining({
          roomId,
          userId,
          skillMapId
        })
      );
    });

    it('should throw PermissionError when non-owner tries to add skill map', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'member123';
      const skillMapId = '507f1f77bcf86cd799439022';

      const mockRoom = {
        _id: roomId,
        ownerId: 'owner999',
        name: 'Test Room',
        deletedAt: null
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);

      await expect(
        RoomService.addSkillMap(roomId, userId, skillMapId)
      ).rejects.toThrow(PermissionError);
    });

    it('should throw ConflictError when skill map already exists in room', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'owner123';
      const skillMapId = '507f1f77bcf86cd799439022';

      const mockRoom = {
        _id: roomId,
        ownerId: userId,
        name: 'Test Room',
        deletedAt: null
      };

      const mockSkillMap = {
        _id: skillMapId,
        userId: 'creator123',
        name: 'JavaScript Basics',
        nodeCount: 10
      };

      const existingMapping = {
        _id: 'rsm1',
        roomId,
        skillMapId,
        addedBy: userId
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);
      Skill.findById = jest.fn().mockResolvedValue(mockSkillMap);
      RoomSkillMap.findOne = jest.fn().mockResolvedValue(existingMapping);

      await expect(
        RoomService.addSkillMap(roomId, userId, skillMapId)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError when room does not exist', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'owner123';
      const skillMapId = '507f1f77bcf86cd799439022';

      Room.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        RoomService.addSkillMap(roomId, userId, skillMapId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when skill map does not exist', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'owner123';
      const skillMapId = '507f1f77bcf86cd799439022';

      const mockRoom = {
        _id: roomId,
        ownerId: userId,
        name: 'Test Room',
        deletedAt: null
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);
      Skill.findById = jest.fn().mockResolvedValue(null);

      await expect(
        RoomService.addSkillMap(roomId, userId, skillMapId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when required parameters are missing', async () => {
      await expect(
        RoomService.addSkillMap(null, 'user123', 'skill123')
      ).rejects.toThrow(ValidationError);

      await expect(
        RoomService.addSkillMap('room123', null, 'skill123')
      ).rejects.toThrow(ValidationError);

      await expect(
        RoomService.addSkillMap('room123', 'user123', null)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('removeSkillMap', () => {
    it('should successfully remove skill map when user is owner', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'owner123';
      const skillMapId = '507f1f77bcf86cd799439022';

      const mockRoom = {
        _id: roomId,
        ownerId: userId,
        name: 'Test Room',
        deletedAt: null
      };

      const mockRoomSkillMap = {
        _id: 'rsm1',
        roomId,
        skillMapId,
        addedBy: userId
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);
      RoomSkillMap.findOne = jest.fn().mockResolvedValue(mockRoomSkillMap);
      RoomSkillMap.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await RoomService.removeSkillMap(roomId, userId, skillMapId);

      expect(RoomSkillMap.deleteOne).toHaveBeenCalledWith({
        roomId,
        skillMapId
      });
      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'skill_map_removed',
        expect.objectContaining({
          roomId,
          userId,
          skillMapId
        })
      );
    });

    it('should throw PermissionError when non-owner tries to remove skill map', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'member123';
      const skillMapId = '507f1f77bcf86cd799439022';

      const mockRoom = {
        _id: roomId,
        ownerId: 'owner999',
        name: 'Test Room',
        deletedAt: null
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);

      await expect(
        RoomService.removeSkillMap(roomId, userId, skillMapId)
      ).rejects.toThrow(PermissionError);
    });

    it('should throw NotFoundError when room does not exist', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'owner123';
      const skillMapId = '507f1f77bcf86cd799439022';

      Room.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        RoomService.removeSkillMap(roomId, userId, skillMapId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when skill map is not in room', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'owner123';
      const skillMapId = '507f1f77bcf86cd799439022';

      const mockRoom = {
        _id: roomId,
        ownerId: userId,
        name: 'Test Room',
        deletedAt: null
      };

      Room.findOne = jest.fn().mockResolvedValue(mockRoom);
      RoomSkillMap.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        RoomService.removeSkillMap(roomId, userId, skillMapId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when required parameters are missing', async () => {
      await expect(
        RoomService.removeSkillMap(null, 'user123', 'skill123')
      ).rejects.toThrow(ValidationError);

      await expect(
        RoomService.removeSkillMap('room123', null, 'skill123')
      ).rejects.toThrow(ValidationError);

      await expect(
        RoomService.removeSkillMap('room123', 'user123', null)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getRoomSkillMaps', () => {
    it('should return all skill maps with details for room member', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'member123';

      const mockMembership = {
        _id: 'membership1',
        roomId,
        userId,
        role: 'member'
      };

      const mockRoomSkillMaps = [
        {
          _id: 'rsm1',
          roomId,
          skillMapId: '507f1f77bcf86cd799439022',
          addedBy: 'owner123',
          createdAt: new Date('2024-01-01')
        },
        {
          _id: 'rsm2',
          roomId,
          skillMapId: '507f1f77bcf86cd799439033',
          addedBy: 'owner123',
          createdAt: new Date('2024-01-02')
        }
      ];

      const mockSkillMaps = [
        {
          _id: '507f1f77bcf86cd799439022',
          userId: 'creator123',
          name: 'JavaScript Basics',
          nodeCount: 10,
          description: 'Learn JS fundamentals'
        },
        {
          _id: '507f1f77bcf86cd799439033',
          userId: 'creator456',
          name: 'Python Advanced',
          nodeCount: 15,
          description: 'Advanced Python topics'
        }
      ];

      RoomMember.findOne = jest.fn().mockResolvedValue(mockMembership);
      RoomSkillMap.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockRoomSkillMaps)
        })
      });
      Skill.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSkillMaps)
      });

      const result = await RoomService.getRoomSkillMaps(roomId, userId);

      expect(result).toHaveLength(2);
      expect(result[0].skillMapId).toBe('507f1f77bcf86cd799439022');
      expect(result[0].skillMap.name).toBe('JavaScript Basics');
      expect(result[1].skillMapId).toBe('507f1f77bcf86cd799439033');
      expect(result[1].skillMap.name).toBe('Python Advanced');
    });

    it('should return empty array when room has no skill maps', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'member123';

      const mockMembership = {
        _id: 'membership1',
        roomId,
        userId,
        role: 'member'
      };

      RoomMember.findOne = jest.fn().mockResolvedValue(mockMembership);
      RoomSkillMap.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      const result = await RoomService.getRoomSkillMaps(roomId, userId);

      expect(result).toEqual([]);
    });

    it('should throw PermissionError when user is not a member', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'nonmember123';

      RoomMember.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        RoomService.getRoomSkillMaps(roomId, userId)
      ).rejects.toThrow(PermissionError);
    });

    it('should handle missing skill map details gracefully', async () => {
      const roomId = '507f1f77bcf86cd799439011';
      const userId = 'member123';

      const mockMembership = {
        _id: 'membership1',
        roomId,
        userId,
        role: 'member'
      };

      const mockRoomSkillMaps = [
        {
          _id: 'rsm1',
          roomId,
          skillMapId: '507f1f77bcf86cd799439022',
          addedBy: 'owner123',
          createdAt: new Date('2024-01-01')
        }
      ];

      RoomMember.findOne = jest.fn().mockResolvedValue(mockMembership);
      RoomSkillMap.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockRoomSkillMaps)
        })
      });
      Skill.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]) // No skill maps found
      });

      const result = await RoomService.getRoomSkillMaps(roomId, userId);

      expect(result).toHaveLength(1);
      expect(result[0].skillMap).toBeNull();
    });

    it('should throw ValidationError when required parameters are missing', async () => {
      await expect(
        RoomService.getRoomSkillMaps(null, 'user123')
      ).rejects.toThrow(ValidationError);

      await expect(
        RoomService.getRoomSkillMaps('room123', null)
      ).rejects.toThrow(ValidationError);
    });
  });
});
