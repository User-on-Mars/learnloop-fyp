import RoomXpService from '../RoomXpService.js';
import RoomXpLedger from '../../models/RoomXpLedger.js';
import RoomStreak from '../../models/RoomStreak.js';
import RoomMember from '../../models/RoomMember.js';
import User from '../../models/User.js';
import ErrorLoggingService from '../ErrorLoggingService.js';
import { ValidationError, DatabaseError } from '../../utils/errors.js';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../models/RoomXpLedger.js');
jest.mock('../../models/RoomStreak.js');
jest.mock('../../models/RoomMember.js');
jest.mock('../../models/User.js');
jest.mock('../ErrorLoggingService.js');

describe('RoomXpService', () => {
  const mockRoomId = new mongoose.Types.ObjectId();
  const mockUserId = 'user123';
  const mockSkillMapId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    ErrorLoggingService.logSystemEvent = jest.fn();
    ErrorLoggingService.logError = jest.fn();
  });

  describe('awardXp', () => {
    it('should award XP and create ledger entry', async () => {
      const mockLedgerEntry = {
        _id: new mongoose.Types.ObjectId(),
        roomId: mockRoomId,
        userId: mockUserId,
        skillMapId: mockSkillMapId,
        xpAmount: 50,
        earnedAt: new Date(),
        toObject: jest.fn().mockReturnThis()
      };

      RoomXpLedger.create = jest.fn().mockResolvedValue(mockLedgerEntry);

      const result = await RoomXpService.awardXp(
        mockRoomId.toString(),
        mockUserId,
        mockSkillMapId.toString(),
        50
      );

      expect(RoomXpLedger.create).toHaveBeenCalledWith({
        roomId: mockRoomId.toString(),
        userId: mockUserId,
        skillMapId: mockSkillMapId.toString(),
        xpAmount: 50,
        earnedAt: expect.any(Date)
      });

      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'room_xp_awarded',
        expect.objectContaining({
          roomId: mockRoomId.toString(),
          userId: mockUserId,
          xpAmount: 50
        })
      );

      expect(result).toBeDefined();
    });

    it('should return null for zero XP amount', async () => {
      const result = await RoomXpService.awardXp(
        mockRoomId.toString(),
        mockUserId,
        mockSkillMapId.toString(),
        0
      );

      expect(result).toBeNull();
      expect(RoomXpLedger.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for negative XP amount', async () => {
      await expect(
        RoomXpService.awardXp(
          mockRoomId.toString(),
          mockUserId,
          mockSkillMapId.toString(),
          -10
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing roomId', async () => {
      await expect(
        RoomXpService.awardXp(null, mockUserId, mockSkillMapId.toString(), 50)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing userId', async () => {
      await expect(
        RoomXpService.awardXp(mockRoomId.toString(), null, mockSkillMapId.toString(), 50)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing skillMapId', async () => {
      await expect(
        RoomXpService.awardXp(mockRoomId.toString(), mockUserId, null, 50)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getRoomLeaderboard', () => {
    it('should return sorted leaderboard with correct ranking', async () => {
      const mockMembers = [
        { userId: 'user1', roomId: mockRoomId },
        { userId: 'user2', roomId: mockRoomId },
        { userId: 'user3', roomId: mockRoomId }
      ];

      const mockUsers = [
        { firebaseUid: 'user1', name: 'Alice', email: 'alice@example.com' },
        { firebaseUid: 'user2', name: 'Bob', email: 'bob@example.com' },
        { firebaseUid: 'user3', name: 'Charlie', email: 'charlie@example.com' }
      ];

      RoomMember.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMembers)
      });

      RoomXpLedger.aggregate = jest.fn().mockResolvedValue([
        { _id: 'user1', totalXp: 100 },
        { _id: 'user2', totalXp: 150 },
        { _id: 'user3', totalXp: 75 }
      ]);

      RoomStreak.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userId: 'user1', currentStreak: 3 },
          { userId: 'user2', currentStreak: 5 },
          { userId: 'user3', currentStreak: 2 }
        ])
      });

      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      const result = await RoomXpService.getRoomLeaderboard(
        mockRoomId.toString(),
        'user1'
      );

      expect(result).toHaveLength(3);
      
      // Check sorting: user2 (150 XP) > user1 (100 XP) > user3 (75 XP)
      expect(result[0]).toMatchObject({
        rank: 1,
        userId: 'user2',
        username: 'Bob',
        totalXp: 150,
        currentStreak: 5,
        isCurrentUser: false
      });

      expect(result[1]).toMatchObject({
        rank: 2,
        userId: 'user1',
        username: 'Alice',
        totalXp: 100,
        currentStreak: 3,
        isCurrentUser: true
      });

      expect(result[2]).toMatchObject({
        rank: 3,
        userId: 'user3',
        username: 'Charlie',
        totalXp: 75,
        currentStreak: 2,
        isCurrentUser: false
      });
    });

    it('should sort by streak when XP is equal', async () => {
      const mockMembers = [
        { userId: 'user1', roomId: mockRoomId },
        { userId: 'user2', roomId: mockRoomId }
      ];

      const mockUsers = [
        { firebaseUid: 'user1', name: 'Alice', email: 'alice@example.com' },
        { firebaseUid: 'user2', name: 'Bob', email: 'bob@example.com' }
      ];

      RoomMember.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMembers)
      });

      RoomXpLedger.aggregate = jest.fn().mockResolvedValue([
        { _id: 'user1', totalXp: 100 },
        { _id: 'user2', totalXp: 100 }
      ]);

      RoomStreak.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userId: 'user1', currentStreak: 3 },
          { userId: 'user2', currentStreak: 5 }
        ])
      });

      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      const result = await RoomXpService.getRoomLeaderboard(
        mockRoomId.toString(),
        'user1'
      );

      // user2 should be first (same XP but higher streak)
      expect(result[0].userId).toBe('user2');
      expect(result[1].userId).toBe('user1');
    });

    it('should sort by username when XP and streak are equal', async () => {
      const mockMembers = [
        { userId: 'user1', roomId: mockRoomId },
        { userId: 'user2', roomId: mockRoomId }
      ];

      const mockUsers = [
        { firebaseUid: 'user1', name: 'Bob', email: 'bob@example.com' },
        { firebaseUid: 'user2', name: 'Alice', email: 'alice@example.com' }
      ];

      RoomMember.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMembers)
      });

      RoomXpLedger.aggregate = jest.fn().mockResolvedValue([
        { _id: 'user1', totalXp: 100 },
        { _id: 'user2', totalXp: 100 }
      ]);

      RoomStreak.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userId: 'user1', currentStreak: 3 },
          { userId: 'user2', currentStreak: 3 }
        ])
      });

      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      const result = await RoomXpService.getRoomLeaderboard(
        mockRoomId.toString(),
        'user1'
      );

      // Alice should be first (alphabetically before Bob)
      expect(result[0].username).toBe('Alice');
      expect(result[1].username).toBe('Bob');
    });

    it('should return empty array when room has no members', async () => {
      RoomMember.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      });

      const result = await RoomXpService.getRoomLeaderboard(
        mockRoomId.toString(),
        'user1'
      );

      expect(result).toEqual([]);
    });

    it('should throw ValidationError for missing roomId', async () => {
      await expect(
        RoomXpService.getRoomLeaderboard(null, 'user1')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserRoomXp', () => {
    it('should return total XP for user in room', async () => {
      RoomXpLedger.aggregate = jest.fn().mockResolvedValue([
        { _id: null, totalXp: 250 }
      ]);

      const result = await RoomXpService.getUserRoomXp(
        mockRoomId.toString(),
        mockUserId
      );

      expect(result).toBe(250);
      expect(RoomXpLedger.aggregate).toHaveBeenCalledWith([
        { $match: { roomId: mockRoomId.toString(), userId: mockUserId } },
        { $group: { _id: null, totalXp: { $sum: '$xpAmount' } } }
      ]);
    });

    it('should return 0 when user has no XP in room', async () => {
      RoomXpLedger.aggregate = jest.fn().mockResolvedValue([]);

      const result = await RoomXpService.getUserRoomXp(
        mockRoomId.toString(),
        mockUserId
      );

      expect(result).toBe(0);
    });

    it('should throw ValidationError for missing roomId', async () => {
      await expect(
        RoomXpService.getUserRoomXp(null, mockUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing userId', async () => {
      await expect(
        RoomXpService.getUserRoomXp(mockRoomId.toString(), null)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateStreak', () => {
    it('should create new streak record for first practice', async () => {
      RoomStreak.findOne = jest.fn().mockResolvedValue(null);
      
      const mockCreatedStreak = {
        roomId: mockRoomId,
        userId: mockUserId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: expect.any(Date),
        lastResetAt: null
      };

      RoomStreak.create = jest.fn().mockResolvedValue(mockCreatedStreak);

      const result = await RoomXpService.updateStreak(
        mockRoomId.toString(),
        mockUserId
      );

      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 1,
        isNewDay: true
      });

      expect(RoomStreak.create).toHaveBeenCalled();
    });

    it('should increment streak for consecutive day practice', async () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      const mockStreak = {
        roomId: mockRoomId,
        userId: mockUserId,
        currentStreak: 3,
        longestStreak: 5,
        lastActivityDate: yesterday,
        save: jest.fn().mockResolvedValue(true)
      };

      RoomStreak.findOne = jest.fn().mockResolvedValue(mockStreak);

      const result = await RoomXpService.updateStreak(
        mockRoomId.toString(),
        mockUserId
      );

      expect(result).toEqual({
        currentStreak: 4,
        longestStreak: 5,
        isNewDay: true
      });

      expect(mockStreak.currentStreak).toBe(4);
      expect(mockStreak.save).toHaveBeenCalled();
    });

    it('should update longest streak when current exceeds it', async () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      const mockStreak = {
        roomId: mockRoomId,
        userId: mockUserId,
        currentStreak: 5,
        longestStreak: 5,
        lastActivityDate: yesterday,
        save: jest.fn().mockResolvedValue(true)
      };

      RoomStreak.findOne = jest.fn().mockResolvedValue(mockStreak);

      const result = await RoomXpService.updateStreak(
        mockRoomId.toString(),
        mockUserId
      );

      expect(result).toEqual({
        currentStreak: 6,
        longestStreak: 6,
        isNewDay: true
      });

      expect(mockStreak.longestStreak).toBe(6);
    });

    it('should not change streak for same day practice', async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const mockStreak = {
        roomId: mockRoomId,
        userId: mockUserId,
        currentStreak: 3,
        longestStreak: 5,
        lastActivityDate: today,
        save: jest.fn()
      };

      RoomStreak.findOne = jest.fn().mockResolvedValue(mockStreak);

      const result = await RoomXpService.updateStreak(
        mockRoomId.toString(),
        mockUserId
      );

      expect(result).toEqual({
        currentStreak: 3,
        longestStreak: 5,
        isNewDay: false
      });

      expect(mockStreak.save).not.toHaveBeenCalled();
    });

    it('should reset streak for gap > 1 day', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
      threeDaysAgo.setUTCHours(0, 0, 0, 0);

      const mockStreak = {
        roomId: mockRoomId,
        userId: mockUserId,
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: threeDaysAgo,
        save: jest.fn().mockResolvedValue(true)
      };

      RoomStreak.findOne = jest.fn().mockResolvedValue(mockStreak);

      const result = await RoomXpService.updateStreak(
        mockRoomId.toString(),
        mockUserId
      );

      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 10,
        isNewDay: true
      });

      expect(mockStreak.currentStreak).toBe(1);
      expect(mockStreak.longestStreak).toBe(10); // Should retain longest
    });

    it('should throw ValidationError for missing roomId', async () => {
      await expect(
        RoomXpService.updateStreak(null, mockUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing userId', async () => {
      await expect(
        RoomXpService.updateStreak(mockRoomId.toString(), null)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('resetWeeklyStreaks', () => {
    it('should reset all streaks and retain longest streaks', async () => {
      const mockResult = {
        modifiedCount: 15
      };

      RoomStreak.updateMany = jest.fn().mockResolvedValue(mockResult);

      const result = await RoomXpService.resetWeeklyStreaks();

      expect(result).toEqual({
        resetCount: 15,
        timestamp: expect.any(Date)
      });

      expect(RoomStreak.updateMany).toHaveBeenCalledWith(
        {},
        {
          $set: {
            currentStreak: 0,
            lastResetAt: expect.any(Date)
          }
        }
      );

      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'room_weekly_streak_reset',
        expect.objectContaining({
          resetCount: 15
        })
      );
    });

    it('should handle zero modified records', async () => {
      const mockResult = {
        modifiedCount: 0
      };

      RoomStreak.updateMany = jest.fn().mockResolvedValue(mockResult);

      const result = await RoomXpService.resetWeeklyStreaks();

      expect(result.resetCount).toBe(0);
    });
  });
});
