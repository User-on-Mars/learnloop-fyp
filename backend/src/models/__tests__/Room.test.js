import mongoose from 'mongoose';
import Room from '../Room.js';

describe('Room Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Room.deleteMany({});
  });

  describe('Basic Model Validation', () => {
    test('should create a valid Room with required fields', async () => {
      const roomData = {
        ownerId: 'user123',
        name: 'JavaScript Study Group'
      };

      const room = new Room(roomData);
      const savedRoom = await room.save();

      expect(savedRoom._id).toBeDefined();
      expect(savedRoom.ownerId).toBe('user123');
      expect(savedRoom.name).toBe('JavaScript Study Group');
      expect(savedRoom.description).toBe(''); // default value
      expect(savedRoom.deletedAt).toBeNull(); // default value
      expect(savedRoom.createdAt).toBeDefined();
      expect(savedRoom.updatedAt).toBeDefined();
    });

    test('should create a Room with optional description', async () => {
      const roomData = {
        ownerId: 'user123',
        name: 'Python Learners',
        description: 'Learning Python together'
      };

      const room = new Room(roomData);
      const savedRoom = await room.save();

      expect(savedRoom.description).toBe('Learning Python together');
    });

    test('should fail validation without required ownerId', async () => {
      const room = new Room({
        name: 'Test Room'
      });

      await expect(room.save()).rejects.toThrow();
    });

    test('should fail validation without required name', async () => {
      const room = new Room({
        ownerId: 'user123'
      });

      await expect(room.save()).rejects.toThrow();
    });
  });

  describe('Field Validation', () => {
    test('should trim whitespace from name', async () => {
      const room = new Room({
        ownerId: 'user123',
        name: '  Test Room  '
      });

      const savedRoom = await room.save();
      expect(savedRoom.name).toBe('Test Room');
    });

    test('should trim whitespace from description', async () => {
      const room = new Room({
        ownerId: 'user123',
        name: 'Test Room',
        description: '  Test Description  '
      });

      const savedRoom = await room.save();
      expect(savedRoom.description).toBe('Test Description');
    });

    test('should enforce name minimum length of 1 character', async () => {
      const room = new Room({
        ownerId: 'user123',
        name: ''
      });

      await expect(room.save()).rejects.toThrow();
    });

    test('should enforce name maximum length of 50 characters', async () => {
      const room = new Room({
        ownerId: 'user123',
        name: 'a'.repeat(51)
      });

      await expect(room.save()).rejects.toThrow();
    });

    test('should accept name with exactly 50 characters', async () => {
      const room = new Room({
        ownerId: 'user123',
        name: 'a'.repeat(50)
      });

      const savedRoom = await room.save();
      expect(savedRoom.name).toHaveLength(50);
    });

    test('should enforce description maximum length of 200 characters', async () => {
      const room = new Room({
        ownerId: 'user123',
        name: 'Test Room',
        description: 'a'.repeat(201)
      });

      await expect(room.save()).rejects.toThrow();
    });

    test('should accept description with exactly 200 characters', async () => {
      const room = new Room({
        ownerId: 'user123',
        name: 'Test Room',
        description: 'a'.repeat(200)
      });

      const savedRoom = await room.save();
      expect(savedRoom.description).toHaveLength(200);
    });
  });

  describe('Soft Delete Functionality', () => {
    test('should support soft delete with deletedAt field', async () => {
      const room = new Room({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const savedRoom = await room.save();
      expect(savedRoom.deletedAt).toBeNull();

      // Soft delete
      savedRoom.deletedAt = new Date();
      const deletedRoom = await savedRoom.save();

      expect(deletedRoom.deletedAt).toBeDefined();
      expect(deletedRoom.deletedAt).toBeInstanceOf(Date);
    });

    test('should query non-deleted rooms', async () => {
      // Create active room
      await Room.create({
        ownerId: 'user123',
        name: 'Active Room'
      });

      // Create deleted room
      await Room.create({
        ownerId: 'user123',
        name: 'Deleted Room',
        deletedAt: new Date()
      });

      const activeRooms = await Room.find({ deletedAt: null });
      expect(activeRooms).toHaveLength(1);
      expect(activeRooms[0].name).toBe('Active Room');
    });
  });

  describe('Indexes', () => {
    test('should have ownerId indexed', async () => {
      const indexes = Room.schema.indexes();
      const ownerIdIndex = indexes.find(idx => idx[0].ownerId);
      
      expect(ownerIdIndex).toBeDefined();
    });

    test('should have compound index on ownerId and deletedAt', async () => {
      const indexes = Room.schema.indexes();
      const compoundIndex = indexes.find(idx => idx[0].ownerId && idx[0].deletedAt);
      
      expect(compoundIndex).toBeDefined();
    });

    test('should have createdAt indexed', async () => {
      const indexes = Room.schema.indexes();
      const createdAtIndex = indexes.find(idx => idx[0].createdAt);
      
      expect(createdAtIndex).toBeDefined();
    });
  });

  describe('Virtual Fields', () => {
    test('should define memberCount virtual', () => {
      const virtuals = Room.schema.virtuals;
      
      expect(virtuals.memberCount).toBeDefined();
    });

    test('memberCount virtual should reference RoomMember model', () => {
      const memberCountVirtual = Room.schema.virtuals.memberCount;
      
      expect(memberCountVirtual.options.ref).toBe('RoomMember');
      expect(memberCountVirtual.options.localField).toBe('_id');
      expect(memberCountVirtual.options.foreignField).toBe('roomId');
      expect(memberCountVirtual.options.count).toBe(true);
    });
  });

  describe('Timestamps', () => {
    test('should automatically set createdAt and updatedAt', async () => {
      const room = new Room({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const savedRoom = await room.save();

      expect(savedRoom.createdAt).toBeDefined();
      expect(savedRoom.updatedAt).toBeDefined();
      expect(savedRoom.createdAt).toBeInstanceOf(Date);
      expect(savedRoom.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt on modification', async () => {
      const room = new Room({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const savedRoom = await room.save();
      const originalUpdatedAt = savedRoom.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedRoom.name = 'Updated Room';
      const updatedRoom = await savedRoom.save();

      expect(updatedRoom.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
