import RoomNodeProgressService from '../RoomNodeProgressService.js';
import RoomNodeProgress from '../../models/RoomNodeProgress.js';
import Node from '../../models/Node.js';
import RoomSkillMap from '../../models/RoomSkillMap.js';
import RoomMember from '../../models/RoomMember.js';
import mongoose from 'mongoose';
import { ValidationError, NotFoundError, PermissionError } from '../../utils/errors.js';

// Mock dependencies
jest.mock('../../models/RoomNodeProgress.js');
jest.mock('../../models/Node.js');
jest.mock('../../models/RoomSkillMap.js');
jest.mock('../../models/RoomMember.js');
jest.mock('../ErrorLoggingService.js');

describe('RoomNodeProgressService', () => {
  const mockRoomId = new mongoose.Types.ObjectId();
  const mockUserId = 'test-user-123';
  const mockSkillMapId = new mongoose.Types.ObjectId();
  const mockNodeId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeRoomProgress', () => {
    it('should initialize progress for all nodes in room skill maps', async () => {
      // Mock room membership
      RoomMember.findOne.mockResolvedValue({ roomId: mockRoomId, userId: mockUserId });

      // Mock room skill maps
      RoomSkillMap.find.mockResolvedValue([
        { roomId: mockRoomId, skillMapId: mockSkillMapId }
      ]);

      // Mock nodes
      Node.find.mockResolvedValue([
        { _id: mockNodeId, skillId: mockSkillMapId, order: 1 },
        { _id: new mongoose.Types.ObjectId(), skillId: mockSkillMapId, order: 2 }
      ]);

      // Mock existing progress check
      RoomNodeProgress.findOne.mockResolvedValue(null);

      // Mock save
      const mockSave = jest.fn().mockResolvedValue();
      RoomNodeProgress.mockImplementation(() => ({
        save: mockSave,
        toObject: () => ({ roomId: mockRoomId, userId: mockUserId })
      }));

      // Mock session
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

      const result = await RoomNodeProgressService.initializeRoomProgress(
        mockRoomId.toString(),
        mockUserId
      );

      expect(result).toHaveLength(2);
      expect(RoomNodeProgress).toHaveBeenCalledTimes(2);
      expect(mockSave).toHaveBeenCalledTimes(2);
    });

    it('should throw PermissionError if user is not a room member', async () => {
      RoomMember.findOne.mockResolvedValue(null);

      const mockSession = {
        startTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

      await expect(
        RoomNodeProgressService.initializeRoomProgress(mockRoomId.toString(), mockUserId)
      ).rejects.toThrow(PermissionError);
    });
  });

  describe('getRoomSkillMapProgress', () => {
    it('should return progress records with node details', async () => {
      // Mock room membership
      RoomMember.findOne.mockResolvedValue({ roomId: mockRoomId, userId: mockUserId });

      // Mock room skill map
      RoomSkillMap.findOne.mockResolvedValue({ roomId: mockRoomId, skillMapId: mockSkillMapId });

      // Mock aggregation result
      const mockProgressRecords = [
        {
          _id: new mongoose.Types.ObjectId(),
          roomId: mockRoomId,
          userId: mockUserId,
          skillMapId: mockSkillMapId,
          nodeId: mockNodeId,
          status: 'Unlocked',
          node: {
            _id: mockNodeId,
            order: 1,
            title: 'Node 1',
            description: 'First node'
          }
        }
      ];

      RoomNodeProgress.aggregate.mockResolvedValue(mockProgressRecords);

      const result = await RoomNodeProgressService.getRoomSkillMapProgress(
        mockRoomId.toString(),
        mockUserId,
        mockSkillMapId.toString()
      );

      expect(result).toEqual(mockProgressRecords);
      expect(RoomNodeProgress.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            roomId: mockRoomId,
            userId: mockUserId,
            skillMapId: mockSkillMapId
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
        expect.any(Object) // projection
      ]);
    });

    it('should throw PermissionError if user is not a room member', async () => {
      RoomMember.findOne.mockResolvedValue(null);

      await expect(
        RoomNodeProgressService.getRoomSkillMapProgress(
          mockRoomId.toString(),
          mockUserId,
          mockSkillMapId.toString()
        )
      ).rejects.toThrow(PermissionError);
    });

    it('should throw NotFoundError if skill map is not in room', async () => {
      RoomMember.findOne.mockResolvedValue({ roomId: mockRoomId, userId: mockUserId });
      RoomSkillMap.findOne.mockResolvedValue(null);

      await expect(
        RoomNodeProgressService.getRoomSkillMapProgress(
          mockRoomId.toString(),
          mockUserId,
          mockSkillMapId.toString()
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateRoomNodeStatus', () => {
    it('should update node status and unlock next node', async () => {
      const mockProgress = {
        roomId: mockRoomId,
        userId: mockUserId,
        nodeId: mockNodeId,
        skillMapId: mockSkillMapId,
        status: 'Unlocked',
        save: jest.fn().mockResolvedValue(),
        toObject: () => ({ status: 'Completed' })
      };

      const mockNextProgress = {
        roomId: mockRoomId,
        userId: mockUserId,
        nodeId: new mongoose.Types.ObjectId(),
        status: 'Locked',
        save: jest.fn().mockResolvedValue(),
        toObject: () => ({ status: 'Unlocked' })
      };

      // Mock room membership
      RoomMember.findOne.mockResolvedValue({ roomId: mockRoomId, userId: mockUserId });

      // Mock progress record
      RoomNodeProgress.findOne
        .mockResolvedValueOnce(mockProgress) // First call for current progress
        .mockResolvedValueOnce(mockNextProgress); // Second call for next progress

      // Mock node
      Node.findById
        .mockResolvedValueOnce({ _id: mockNodeId, order: 1, skillId: mockSkillMapId })
        .mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId(), order: 2 });

      // Mock next node
      Node.findOne.mockResolvedValue({ _id: new mongoose.Types.ObjectId(), order: 2 });

      // Mock RoomNodeProgress constructor for next progress
      RoomNodeProgress.mockImplementation(() => mockNextProgress);

      // Mock session
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

      const result = await RoomNodeProgressService.updateRoomNodeStatus(
        mockRoomId.toString(),
        mockUserId,
        mockNodeId.toString(),
        'Completed'
      );

      expect(result.progress).toBeDefined();
      expect(result.nextNodeProgress).toBeDefined();
      expect(mockProgress.save).toHaveBeenCalled();
      expect(mockNextProgress.save).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid status', async () => {
      await expect(
        RoomNodeProgressService.updateRoomNodeStatus(
          mockRoomId.toString(),
          mockUserId,
          mockNodeId.toString(),
          'InvalidStatus'
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getRoomSkillMapStats', () => {
    it('should calculate completion statistics', async () => {
      const mockProgressRecords = [
        { status: 'Completed' },
        { status: 'Completed' },
        { status: 'Unlocked' },
        { status: 'Locked' }
      ];

      RoomNodeProgress.find.mockResolvedValue(mockProgressRecords);

      const result = await RoomNodeProgressService.getRoomSkillMapStats(
        mockRoomId.toString(),
        mockUserId,
        mockSkillMapId.toString()
      );

      expect(result).toEqual({
        completed: 2,
        total: 4,
        percent: 50
      });
    });

    it('should return 0% for no progress records', async () => {
      RoomNodeProgress.find.mockResolvedValue([]);

      const result = await RoomNodeProgressService.getRoomSkillMapStats(
        mockRoomId.toString(),
        mockUserId,
        mockSkillMapId.toString()
      );

      expect(result).toEqual({
        completed: 0,
        total: 0,
        percent: 0
      });
    });
  });

  describe('cleanupRoomProgress', () => {
    it('should delete progress records for specified criteria', async () => {
      const mockDeleteResult = { deletedCount: 5 };
      RoomNodeProgress.deleteMany.mockResolvedValue(mockDeleteResult);

      const result = await RoomNodeProgressService.cleanupRoomProgress(
        mockRoomId.toString(),
        mockUserId,
        mockSkillMapId.toString()
      );

      expect(result).toBe(5);
      expect(RoomNodeProgress.deleteMany).toHaveBeenCalledWith({
        roomId: mockRoomId.toString(),
        userId: mockUserId,
        skillMapId: mockSkillMapId.toString()
      });
    });

    it('should throw ValidationError if roomId is missing', async () => {
      await expect(
        RoomNodeProgressService.cleanupRoomProgress(null)
      ).rejects.toThrow(ValidationError);
    });
  });
});