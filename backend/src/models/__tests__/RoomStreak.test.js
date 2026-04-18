import mongoose from 'mongoose';
import RoomStreak from '../RoomStreak.js';
import Room from '../Room.js';

describe('RoomStreak Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await RoomStreak.deleteMany({});
    await Room.deleteMany({});
  });

  describe('Basic Model Validation', () => {
    test('should create a valid RoomStreak with required fields', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streakData = {
        roomId: room._id,
        userId: 'user123'
      };

      const streak = new RoomStreak(streakData);
      const savedStreak = await streak.save();

      expect(savedStreak._id).toBeDefined();
      expect(savedStreak.roomId.toString()).toBe(room._id.toString());
      expect(savedStreak.userId).toBe('user123');
      expect(savedStreak.currentStreak).toBe(0);
      expect(savedStreak.longestStreak).toBe(0);
      expect(savedStreak.lastActivityDate).toBeNull();
      expect(savedStreak.lastResetAt).toBeNull();
      expect(savedStreak.createdAt).toBeDefined();
      expect(savedStreak.updatedAt).toBeDefined();
    });

    test('should fail validation without required roomId', async () => {
      const streak = new RoomStreak({
        userId: 'user123'
      });

      await expect(streak.save()).rejects.toThrow();
    });

    test('should fail validation without required userId', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = new RoomStreak({
        roomId: room._id
      });

      await expect(streak.save()).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    test('should set currentStreak to 0 by default', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      expect(streak.currentStreak).toBe(0);
    });

    test('should set longestStreak to 0 by default', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      expect(streak.longestStreak).toBe(0);
    });

    test('should set lastActivityDate to null by default', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      expect(streak.lastActivityDate).toBeNull();
    });

    test('should set lastResetAt to null by default', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      expect(streak.lastResetAt).toBeNull();
    });
  });

  describe('Field Validation', () => {
    test('should accept valid currentStreak value', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123',
        currentStreak: 5
      });

      expect(streak.currentStreak).toBe(5);
    });

    test('should reject negative currentStreak', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = new RoomStreak({
        roomId: room._id,
        userId: 'user123',
        currentStreak: -1
      });

      await expect(streak.save()).rejects.toThrow();
    });

    test('should accept valid longestStreak value', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123',
        longestStreak: 10
      });

      expect(streak.longestStreak).toBe(10);
    });

    test('should reject negative longestStreak', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = new RoomStreak({
        roomId: room._id,
        userId: 'user123',
        longestStreak: -1
      });

      await expect(streak.save()).rejects.toThrow();
    });

    test('should accept valid lastActivityDate', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const activityDate = new Date('2024-01-15T00:00:00.000Z');

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123',
        lastActivityDate: activityDate
      });

      expect(streak.lastActivityDate.toISOString()).toBe(activityDate.toISOString());
    });

    test('should accept valid lastResetAt', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const resetDate = new Date('2024-01-01T00:00:00.000Z');

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123',
        lastResetAt: resetDate
      });

      expect(streak.lastResetAt.toISOString()).toBe(resetDate.toISOString());
    });
  });

  describe('Unique Constraint', () => {
    test('should prevent duplicate streak records (same roomId and userId)', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      // Create first streak
      await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      // Attempt to create duplicate
      const duplicateStreak = new RoomStreak({
        roomId: room._id,
        userId: 'user123'
      });

      await expect(duplicateStreak.save()).rejects.toThrow();
    });

    test('should allow same user in different rooms', async () => {
      const room1 = await Room.create({
        ownerId: 'user123',
        name: 'Room 1'
      });

      const room2 = await Room.create({
        ownerId: 'user456',
        name: 'Room 2'
      });

      await RoomStreak.create({
        roomId: room1._id,
        userId: 'user123'
      });

      const streak2 = await RoomStreak.create({
        roomId: room2._id,
        userId: 'user123'
      });

      expect(streak2).toBeDefined();
      expect(streak2.userId).toBe('user123');
    });

    test('should allow different users in same room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      const streak2 = await RoomStreak.create({
        roomId: room._id,
        userId: 'user456'
      });

      expect(streak2).toBeDefined();
      expect(streak2.userId).toBe('user456');
    });
  });

  describe('Indexes', () => {
    test('should have roomId indexed', async () => {
      const indexes = RoomStreak.schema.indexes();
      const roomIdIndex = indexes.find(idx => idx[0].roomId);
      
      expect(roomIdIndex).toBeDefined();
    });

    test('should have userId indexed', async () => {
      const indexes = RoomStreak.schema.indexes();
      const userIdIndex = indexes.find(idx => idx[0].userId);
      
      expect(userIdIndex).toBeDefined();
    });

    test('should have compound unique index on roomId and userId', async () => {
      const indexes = RoomStreak.schema.indexes();
      const compoundIndex = indexes.find(idx => 
        idx[0].roomId && idx[0].userId && idx[1]?.unique === true
      );
      
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    test('should automatically set createdAt and updatedAt', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      expect(streak.createdAt).toBeDefined();
      expect(streak.updatedAt).toBeDefined();
      expect(streak.createdAt).toBeInstanceOf(Date);
      expect(streak.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt on modification', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      const originalUpdatedAt = streak.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      streak.currentStreak = 5;
      const updatedStreak = await streak.save();

      expect(updatedStreak.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Reference Integrity', () => {
    test('should populate roomId reference', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      const populatedStreak = await RoomStreak.findById(streak._id).populate('roomId');

      expect(populatedStreak.roomId).toBeDefined();
      expect(populatedStreak.roomId.name).toBe('Test Room');
      expect(populatedStreak.roomId.ownerId).toBe('user123');
    });
  });

  describe('Query Operations', () => {
    test('should find all streaks for a room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      await RoomStreak.create({
        roomId: room._id,
        userId: 'user456'
      });

      const streaks = await RoomStreak.find({ roomId: room._id });

      expect(streaks).toHaveLength(2);
    });

    test('should find all streaks for a user', async () => {
      const room1 = await Room.create({
        ownerId: 'user123',
        name: 'Room 1'
      });

      const room2 = await Room.create({
        ownerId: 'user456',
        name: 'Room 2'
      });

      await RoomStreak.create({
        roomId: room1._id,
        userId: 'user123'
      });

      await RoomStreak.create({
        roomId: room2._id,
        userId: 'user123'
      });

      const userStreaks = await RoomStreak.find({ userId: 'user123' });

      expect(userStreaks).toHaveLength(2);
    });

    test('should find specific streak by roomId and userId', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      await RoomStreak.create({
        roomId: room._id,
        userId: 'user456'
      });

      const streak = await RoomStreak.findOne({ 
        roomId: room._id, 
        userId: 'user123' 
      });

      expect(streak).toBeDefined();
      expect(streak.userId).toBe('user123');
    });
  });

  describe('Streak Update Scenarios', () => {
    test('should update currentStreak and longestStreak', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123'
      });

      streak.currentStreak = 7;
      streak.longestStreak = 7;
      streak.lastActivityDate = new Date();
      await streak.save();

      const updatedStreak = await RoomStreak.findById(streak._id);

      expect(updatedStreak.currentStreak).toBe(7);
      expect(updatedStreak.longestStreak).toBe(7);
      expect(updatedStreak.lastActivityDate).toBeDefined();
    });

    test('should reset currentStreak while preserving longestStreak', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const streak = await RoomStreak.create({
        roomId: room._id,
        userId: 'user123',
        currentStreak: 5,
        longestStreak: 10
      });

      streak.currentStreak = 0;
      streak.lastResetAt = new Date();
      await streak.save();

      const updatedStreak = await RoomStreak.findById(streak._id);

      expect(updatedStreak.currentStreak).toBe(0);
      expect(updatedStreak.longestStreak).toBe(10);
      expect(updatedStreak.lastResetAt).toBeDefined();
    });
  });
});
