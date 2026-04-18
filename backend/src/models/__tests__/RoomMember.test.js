import mongoose from 'mongoose';
import RoomMember from '../RoomMember.js';
import Room from '../Room.js';

describe('RoomMember Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await RoomMember.deleteMany({});
    await Room.deleteMany({});
  });

  describe('Basic Model Validation', () => {
    test('should create a valid RoomMember with required fields', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const memberData = {
        roomId: room._id,
        userId: 'user123',
        role: 'owner'
      };

      const member = new RoomMember(memberData);
      const savedMember = await member.save();

      expect(savedMember._id).toBeDefined();
      expect(savedMember.roomId.toString()).toBe(room._id.toString());
      expect(savedMember.userId).toBe('user123');
      expect(savedMember.role).toBe('owner');
      expect(savedMember.joinedAt).toBeDefined();
      expect(savedMember.joinedAt).toBeInstanceOf(Date);
      expect(savedMember.createdAt).toBeDefined();
      expect(savedMember.updatedAt).toBeDefined();
    });

    test('should create a RoomMember with member role', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const member = new RoomMember({
        roomId: room._id,
        userId: 'user456',
        role: 'member'
      });

      const savedMember = await member.save();
      expect(savedMember.role).toBe('member');
    });

    test('should fail validation without required roomId', async () => {
      const member = new RoomMember({
        userId: 'user123',
        role: 'owner'
      });

      await expect(member.save()).rejects.toThrow();
    });

    test('should fail validation without required userId', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const member = new RoomMember({
        roomId: room._id,
        role: 'owner'
      });

      await expect(member.save()).rejects.toThrow();
    });

    test('should fail validation without required role', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const member = new RoomMember({
        roomId: room._id,
        userId: 'user123'
      });

      await expect(member.save()).rejects.toThrow();
    });
  });

  describe('Role Validation', () => {
    test('should accept owner role', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const member = new RoomMember({
        roomId: room._id,
        userId: 'user123',
        role: 'owner'
      });

      const savedMember = await member.save();
      expect(savedMember.role).toBe('owner');
    });

    test('should accept member role', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const member = new RoomMember({
        roomId: room._id,
        userId: 'user456',
        role: 'member'
      });

      const savedMember = await member.save();
      expect(savedMember.role).toBe('member');
    });

    test('should reject invalid role', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const member = new RoomMember({
        roomId: room._id,
        userId: 'user123',
        role: 'admin'
      });

      await expect(member.save()).rejects.toThrow();
    });
  });

  describe('Unique Constraint', () => {
    test('should prevent duplicate memberships (same roomId and userId)', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      // Create first member
      await RoomMember.create({
        roomId: room._id,
        userId: 'user123',
        role: 'owner'
      });

      // Attempt to create duplicate
      const duplicateMember = new RoomMember({
        roomId: room._id,
        userId: 'user123',
        role: 'member'
      });

      await expect(duplicateMember.save()).rejects.toThrow();
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

      await RoomMember.create({
        roomId: room1._id,
        userId: 'user123',
        role: 'owner'
      });

      const member2 = await RoomMember.create({
        roomId: room2._id,
        userId: 'user123',
        role: 'member'
      });

      expect(member2).toBeDefined();
      expect(member2.userId).toBe('user123');
    });

    test('should allow different users in same room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      await RoomMember.create({
        roomId: room._id,
        userId: 'user123',
        role: 'owner'
      });

      const member2 = await RoomMember.create({
        roomId: room._id,
        userId: 'user456',
        role: 'member'
      });

      expect(member2).toBeDefined();
      expect(member2.userId).toBe('user456');
    });
  });

  describe('Default Values', () => {
    test('should set joinedAt to current date by default', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const beforeCreate = new Date();
      
      const member = await RoomMember.create({
        roomId: room._id,
        userId: 'user123',
        role: 'owner'
      });

      const afterCreate = new Date();

      expect(member.joinedAt).toBeDefined();
      expect(member.joinedAt).toBeInstanceOf(Date);
      expect(member.joinedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(member.joinedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    test('should allow custom joinedAt date', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const customDate = new Date('2024-01-01T00:00:00.000Z');

      const member = await RoomMember.create({
        roomId: room._id,
        userId: 'user123',
        role: 'owner',
        joinedAt: customDate
      });

      expect(member.joinedAt.toISOString()).toBe(customDate.toISOString());
    });
  });

  describe('Indexes', () => {
    test('should have roomId indexed', async () => {
      const indexes = RoomMember.schema.indexes();
      const roomIdIndex = indexes.find(idx => idx[0].roomId);
      
      expect(roomIdIndex).toBeDefined();
    });

    test('should have userId indexed', async () => {
      const indexes = RoomMember.schema.indexes();
      const userIdIndex = indexes.find(idx => idx[0].userId);
      
      expect(userIdIndex).toBeDefined();
    });

    test('should have compound unique index on roomId and userId', async () => {
      const indexes = RoomMember.schema.indexes();
      const compoundIndex = indexes.find(idx => 
        idx[0].roomId && idx[0].userId && idx[1]?.unique === true
      );
      
      expect(compoundIndex).toBeDefined();
    });

    test('should have compound index on userId and createdAt', async () => {
      const indexes = RoomMember.schema.indexes();
      const userCreatedIndex = indexes.find(idx => 
        idx[0].userId && idx[0].createdAt
      );
      
      expect(userCreatedIndex).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    test('should automatically set createdAt and updatedAt', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const member = await RoomMember.create({
        roomId: room._id,
        userId: 'user123',
        role: 'owner'
      });

      expect(member.createdAt).toBeDefined();
      expect(member.updatedAt).toBeDefined();
      expect(member.createdAt).toBeInstanceOf(Date);
      expect(member.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt on modification', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const member = await RoomMember.create({
        roomId: room._id,
        userId: 'user123',
        role: 'owner'
      });

      const originalUpdatedAt = member.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      member.role = 'member';
      const updatedMember = await member.save();

      expect(updatedMember.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Reference Integrity', () => {
    test('should populate roomId reference', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const member = await RoomMember.create({
        roomId: room._id,
        userId: 'user123',
        role: 'owner'
      });

      const populatedMember = await RoomMember.findById(member._id).populate('roomId');

      expect(populatedMember.roomId).toBeDefined();
      expect(populatedMember.roomId.name).toBe('Test Room');
      expect(populatedMember.roomId.ownerId).toBe('user123');
    });
  });

  describe('Query Operations', () => {
    test('should find all members of a room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      await RoomMember.create({
        roomId: room._id,
        userId: 'user123',
        role: 'owner'
      });

      await RoomMember.create({
        roomId: room._id,
        userId: 'user456',
        role: 'member'
      });

      const members = await RoomMember.find({ roomId: room._id });

      expect(members).toHaveLength(2);
    });

    test('should find all rooms for a user', async () => {
      const room1 = await Room.create({
        ownerId: 'user123',
        name: 'Room 1'
      });

      const room2 = await Room.create({
        ownerId: 'user456',
        name: 'Room 2'
      });

      await RoomMember.create({
        roomId: room1._id,
        userId: 'user123',
        role: 'owner'
      });

      await RoomMember.create({
        roomId: room2._id,
        userId: 'user123',
        role: 'member'
      });

      const userRooms = await RoomMember.find({ userId: 'user123' });

      expect(userRooms).toHaveLength(2);
    });

    test('should sort user rooms by createdAt descending', async () => {
      const room1 = await Room.create({
        ownerId: 'user123',
        name: 'Room 1'
      });

      const room2 = await Room.create({
        ownerId: 'user456',
        name: 'Room 2'
      });

      const member1 = await RoomMember.create({
        roomId: room1._id,
        userId: 'user123',
        role: 'owner'
      });

      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const member2 = await RoomMember.create({
        roomId: room2._id,
        userId: 'user123',
        role: 'member'
      });

      const userRooms = await RoomMember.find({ userId: 'user123' }).sort({ createdAt: -1 });

      expect(userRooms[0]._id.toString()).toBe(member2._id.toString());
      expect(userRooms[1]._id.toString()).toBe(member1._id.toString());
    });
  });
});
