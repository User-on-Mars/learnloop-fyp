import mongoose from 'mongoose';
import RoomXpLedger from '../RoomXpLedger.js';
import Room from '../Room.js';
import Skill from '../Skill.js';

describe('RoomXpLedger Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await RoomXpLedger.deleteMany({});
    await Room.deleteMany({});
    await Skill.deleteMany({});
  });

  describe('Basic Model Validation', () => {
    test('should create a valid RoomXpLedger with required fields', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const ledgerData = {
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 100
      };

      const ledger = new RoomXpLedger(ledgerData);
      const savedLedger = await ledger.save();

      expect(savedLedger._id).toBeDefined();
      expect(savedLedger.roomId.toString()).toBe(room._id.toString());
      expect(savedLedger.userId).toBe('user123');
      expect(savedLedger.skillMapId.toString()).toBe(skill._id.toString());
      expect(savedLedger.xpAmount).toBe(100);
      expect(savedLedger.earnedAt).toBeDefined();
      expect(savedLedger.earnedAt).toBeInstanceOf(Date);
    });

    test('should fail validation without required roomId', async () => {
      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const ledger = new RoomXpLedger({
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 100
      });

      await expect(ledger.save()).rejects.toThrow();
    });

    test('should fail validation without required userId', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const ledger = new RoomXpLedger({
        roomId: room._id,
        skillMapId: skill._id,
        xpAmount: 100
      });

      await expect(ledger.save()).rejects.toThrow();
    });

    test('should fail validation without required skillMapId', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const ledger = new RoomXpLedger({
        roomId: room._id,
        userId: 'user123',
        xpAmount: 100
      });

      await expect(ledger.save()).rejects.toThrow();
    });

    test('should fail validation without required xpAmount', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const ledger = new RoomXpLedger({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id
      });

      await expect(ledger.save()).rejects.toThrow();
    });
  });

  describe('XP Amount Validation', () => {
    test('should accept zero xpAmount', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const ledger = await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 0
      });

      expect(ledger.xpAmount).toBe(0);
    });

    test('should accept positive xpAmount', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const ledger = await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 500
      });

      expect(ledger.xpAmount).toBe(500);
    });

    test('should reject negative xpAmount', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const ledger = new RoomXpLedger({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: -50
      });

      await expect(ledger.save()).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    test('should set earnedAt to current date by default', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const beforeCreate = new Date();

      const ledger = await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 100
      });

      const afterCreate = new Date();

      expect(ledger.earnedAt).toBeDefined();
      expect(ledger.earnedAt).toBeInstanceOf(Date);
      expect(ledger.earnedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(ledger.earnedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    test('should allow custom earnedAt date', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const customDate = new Date('2024-01-01T00:00:00.000Z');

      const ledger = await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 100,
        earnedAt: customDate
      });

      expect(ledger.earnedAt.toISOString()).toBe(customDate.toISOString());
    });
  });

  describe('Indexes', () => {
    test('should have roomId indexed', async () => {
      const indexes = RoomXpLedger.schema.indexes();
      const roomIdIndex = indexes.find(idx => idx[0].roomId);

      expect(roomIdIndex).toBeDefined();
    });

    test('should have userId indexed', async () => {
      const indexes = RoomXpLedger.schema.indexes();
      const userIdIndex = indexes.find(idx => idx[0].userId);

      expect(userIdIndex).toBeDefined();
    });

    test('should have earnedAt indexed', async () => {
      const indexes = RoomXpLedger.schema.indexes();
      const earnedAtIndex = indexes.find(idx => idx[0].earnedAt);

      expect(earnedAtIndex).toBeDefined();
    });

    test('should have compound index on roomId, userId, and earnedAt', async () => {
      const indexes = RoomXpLedger.schema.indexes();
      const compoundIndex = indexes.find(idx =>
        idx[0].roomId && idx[0].userId && idx[0].earnedAt
      );

      expect(compoundIndex).toBeDefined();
      expect(compoundIndex[0].roomId).toBe(1);
      expect(compoundIndex[0].userId).toBe(1);
      expect(compoundIndex[0].earnedAt).toBe(-1);
    });

    test('should have compound index on roomId and earnedAt', async () => {
      const indexes = RoomXpLedger.schema.indexes();
      const roomEarnedIndex = indexes.find(idx =>
        idx[0].roomId && idx[0].earnedAt && !idx[0].userId
      );

      expect(roomEarnedIndex).toBeDefined();
      expect(roomEarnedIndex[0].roomId).toBe(1);
      expect(roomEarnedIndex[0].earnedAt).toBe(-1);
    });
  });

  describe('Reference Integrity', () => {
    test('should populate roomId reference', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const ledger = await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 100
      });

      const populatedLedger = await RoomXpLedger.findById(ledger._id).populate('roomId');

      expect(populatedLedger.roomId).toBeDefined();
      expect(populatedLedger.roomId.name).toBe('Test Room');
      expect(populatedLedger.roomId.ownerId).toBe('user123');
    });

    test('should populate skillMapId reference', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const ledger = await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 100
      });

      const populatedLedger = await RoomXpLedger.findById(ledger._id).populate('skillMapId');

      expect(populatedLedger.skillMapId).toBeDefined();
      expect(populatedLedger.skillMapId.name).toBe('JavaScript');
      expect(populatedLedger.skillMapId.userId).toBe('user123');
    });
  });

  describe('Query Operations', () => {
    test('should find all XP entries for a room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 100
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user456',
        skillMapId: skill._id,
        xpAmount: 200
      });

      const entries = await RoomXpLedger.find({ roomId: room._id });

      expect(entries).toHaveLength(2);
    });

    test('should find all XP entries for a user in a room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill1 = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const skill2 = await Skill.create({
        userId: 'user123',
        name: 'Python',
        description: 'Python skill map',
        nodeCount: 5
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill1._id,
        xpAmount: 100
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill2._id,
        xpAmount: 150
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user456',
        skillMapId: skill1._id,
        xpAmount: 200
      });

      const userEntries = await RoomXpLedger.find({ roomId: room._id, userId: 'user123' });

      expect(userEntries).toHaveLength(2);
      expect(userEntries.every(entry => entry.userId === 'user123')).toBe(true);
    });

    test('should sort entries by earnedAt descending', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const entry1 = await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 100,
        earnedAt: new Date('2024-01-01')
      });

      const entry2 = await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 200,
        earnedAt: new Date('2024-01-02')
      });

      const entries = await RoomXpLedger.find({ roomId: room._id }).sort({ earnedAt: -1 });

      expect(entries[0]._id.toString()).toBe(entry2._id.toString());
      expect(entries[1]._id.toString()).toBe(entry1._id.toString());
    });

    test('should aggregate total XP for a user in a room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill1 = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const skill2 = await Skill.create({
        userId: 'user123',
        name: 'Python',
        description: 'Python skill map',
        nodeCount: 5
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill1._id,
        xpAmount: 100
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill2._id,
        xpAmount: 150
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill1._id,
        xpAmount: 50
      });

      const result = await RoomXpLedger.aggregate([
        { $match: { roomId: room._id, userId: 'user123' } },
        { $group: { _id: null, totalXp: { $sum: '$xpAmount' } } }
      ]);

      expect(result[0].totalXp).toBe(300);
    });

    test('should aggregate XP by skill map for a user in a room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill1 = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const skill2 = await Skill.create({
        userId: 'user123',
        name: 'Python',
        description: 'Python skill map',
        nodeCount: 5
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill1._id,
        xpAmount: 100
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill2._id,
        xpAmount: 150
      });

      await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill1._id,
        xpAmount: 50
      });

      const result = await RoomXpLedger.aggregate([
        { $match: { roomId: room._id, userId: 'user123' } },
        { $group: { _id: '$skillMapId', totalXp: { $sum: '$xpAmount' } } },
        { $sort: { totalXp: -1 } }
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]._id.toString()).toBe(skill1._id.toString());
      expect(result[0].totalXp).toBe(150);
      expect(result[1]._id.toString()).toBe(skill2._id.toString());
      expect(result[1].totalXp).toBe(150);
    });
  });

  describe('Multiple Entries', () => {
    test('should allow multiple XP entries for same user, room, and skill', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript',
        description: 'JavaScript skill map',
        nodeCount: 5
      });

      const entry1 = await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 100
      });

      const entry2 = await RoomXpLedger.create({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id,
        xpAmount: 50
      });

      expect(entry1._id).toBeDefined();
      expect(entry2._id).toBeDefined();
      expect(entry1._id.toString()).not.toBe(entry2._id.toString());

      const entries = await RoomXpLedger.find({
        roomId: room._id,
        userId: 'user123',
        skillMapId: skill._id
      });

      expect(entries).toHaveLength(2);
    });
  });
});
