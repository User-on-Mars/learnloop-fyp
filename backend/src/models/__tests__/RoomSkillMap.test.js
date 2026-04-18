import mongoose from 'mongoose';
import RoomSkillMap from '../RoomSkillMap.js';
import Room from '../Room.js';
import Skill from '../Skill.js';

describe('RoomSkillMap Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await RoomSkillMap.deleteMany({});
    await Room.deleteMany({});
    await Skill.deleteMany({});
  });

  describe('Basic Model Validation', () => {
    test('should create a valid RoomSkillMap with required fields', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const roomSkillMapData = {
        roomId: room._id,
        skillMapId: skill._id,
        addedBy: 'user123'
      };

      const roomSkillMap = new RoomSkillMap(roomSkillMapData);
      const savedRoomSkillMap = await roomSkillMap.save();

      expect(savedRoomSkillMap._id).toBeDefined();
      expect(savedRoomSkillMap.roomId.toString()).toBe(room._id.toString());
      expect(savedRoomSkillMap.skillMapId.toString()).toBe(skill._id.toString());
      expect(savedRoomSkillMap.addedBy).toBe('user123');
      expect(savedRoomSkillMap.createdAt).toBeDefined();
      expect(savedRoomSkillMap.createdAt).toBeInstanceOf(Date);
    });

    test('should fail validation without required roomId', async () => {
      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const roomSkillMap = new RoomSkillMap({
        skillMapId: skill._id,
        addedBy: 'user123'
      });

      await expect(roomSkillMap.save()).rejects.toThrow();
    });

    test('should fail validation without required skillMapId', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const roomSkillMap = new RoomSkillMap({
        roomId: room._id,
        addedBy: 'user123'
      });

      await expect(roomSkillMap.save()).rejects.toThrow();
    });

    test('should fail validation without required addedBy', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const roomSkillMap = new RoomSkillMap({
        roomId: room._id,
        skillMapId: skill._id
      });

      await expect(roomSkillMap.save()).rejects.toThrow();
    });
  });

  describe('Unique Constraint', () => {
    test('should prevent duplicate skill maps in same room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      // Create first room skill map
      await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill._id,
        addedBy: 'user123'
      });

      // Attempt to create duplicate
      const duplicateRoomSkillMap = new RoomSkillMap({
        roomId: room._id,
        skillMapId: skill._id,
        addedBy: 'user456'
      });

      await expect(duplicateRoomSkillMap.save()).rejects.toThrow();
    });

    test('should allow same skill map in different rooms', async () => {
      const room1 = await Room.create({
        ownerId: 'user123',
        name: 'Room 1'
      });

      const room2 = await Room.create({
        ownerId: 'user456',
        name: 'Room 2'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      await RoomSkillMap.create({
        roomId: room1._id,
        skillMapId: skill._id,
        addedBy: 'user123'
      });

      const roomSkillMap2 = await RoomSkillMap.create({
        roomId: room2._id,
        skillMapId: skill._id,
        addedBy: 'user456'
      });

      expect(roomSkillMap2).toBeDefined();
      expect(roomSkillMap2.roomId.toString()).toBe(room2._id.toString());
    });

    test('should allow different skill maps in same room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill1 = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const skill2 = await Skill.create({
        userId: 'user123',
        name: 'React Fundamentals',
        nodeCount: 5
      });

      await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill1._id,
        addedBy: 'user123'
      });

      const roomSkillMap2 = await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill2._id,
        addedBy: 'user123'
      });

      expect(roomSkillMap2).toBeDefined();
      expect(roomSkillMap2.skillMapId.toString()).toBe(skill2._id.toString());
    });
  });

  describe('Default Values', () => {
    test('should set createdAt to current date by default', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const beforeCreate = new Date();
      
      const roomSkillMap = await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill._id,
        addedBy: 'user123'
      });

      const afterCreate = new Date();

      expect(roomSkillMap.createdAt).toBeDefined();
      expect(roomSkillMap.createdAt).toBeInstanceOf(Date);
      expect(roomSkillMap.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(roomSkillMap.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    test('should allow custom createdAt date', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const customDate = new Date('2024-01-01T00:00:00.000Z');

      const roomSkillMap = await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill._id,
        addedBy: 'user123',
        createdAt: customDate
      });

      expect(roomSkillMap.createdAt.toISOString()).toBe(customDate.toISOString());
    });
  });

  describe('Indexes', () => {
    test('should have roomId indexed', async () => {
      const indexes = RoomSkillMap.schema.indexes();
      const roomIdIndex = indexes.find(idx => idx[0].roomId);
      
      expect(roomIdIndex).toBeDefined();
    });

    test('should have skillMapId indexed', async () => {
      const indexes = RoomSkillMap.schema.indexes();
      const skillMapIdIndex = indexes.find(idx => idx[0].skillMapId);
      
      expect(skillMapIdIndex).toBeDefined();
    });

    test('should have compound unique index on roomId and skillMapId', async () => {
      const indexes = RoomSkillMap.schema.indexes();
      const compoundIndex = indexes.find(idx => 
        idx[0].roomId && idx[0].skillMapId && idx[1]?.unique === true
      );
      
      expect(compoundIndex).toBeDefined();
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
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const roomSkillMap = await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill._id,
        addedBy: 'user123'
      });

      const populatedRoomSkillMap = await RoomSkillMap.findById(roomSkillMap._id).populate('roomId');

      expect(populatedRoomSkillMap.roomId).toBeDefined();
      expect(populatedRoomSkillMap.roomId.name).toBe('Test Room');
      expect(populatedRoomSkillMap.roomId.ownerId).toBe('user123');
    });

    test('should populate skillMapId reference', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const roomSkillMap = await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill._id,
        addedBy: 'user123'
      });

      const populatedRoomSkillMap = await RoomSkillMap.findById(roomSkillMap._id).populate('skillMapId');

      expect(populatedRoomSkillMap.skillMapId).toBeDefined();
      expect(populatedRoomSkillMap.skillMapId.name).toBe('JavaScript Basics');
      expect(populatedRoomSkillMap.skillMapId.userId).toBe('user123');
    });

    test('should populate both roomId and skillMapId references', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const roomSkillMap = await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill._id,
        addedBy: 'user123'
      });

      const populatedRoomSkillMap = await RoomSkillMap.findById(roomSkillMap._id)
        .populate('roomId')
        .populate('skillMapId');

      expect(populatedRoomSkillMap.roomId).toBeDefined();
      expect(populatedRoomSkillMap.roomId.name).toBe('Test Room');
      expect(populatedRoomSkillMap.skillMapId).toBeDefined();
      expect(populatedRoomSkillMap.skillMapId.name).toBe('JavaScript Basics');
    });
  });

  describe('Query Operations', () => {
    test('should find all skill maps for a room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill1 = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const skill2 = await Skill.create({
        userId: 'user123',
        name: 'React Fundamentals',
        nodeCount: 5
      });

      await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill1._id,
        addedBy: 'user123'
      });

      await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill2._id,
        addedBy: 'user123'
      });

      const roomSkillMaps = await RoomSkillMap.find({ roomId: room._id });

      expect(roomSkillMaps).toHaveLength(2);
    });

    test('should find all rooms containing a specific skill map', async () => {
      const room1 = await Room.create({
        ownerId: 'user123',
        name: 'Room 1'
      });

      const room2 = await Room.create({
        ownerId: 'user456',
        name: 'Room 2'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      await RoomSkillMap.create({
        roomId: room1._id,
        skillMapId: skill._id,
        addedBy: 'user123'
      });

      await RoomSkillMap.create({
        roomId: room2._id,
        skillMapId: skill._id,
        addedBy: 'user456'
      });

      const roomsWithSkill = await RoomSkillMap.find({ skillMapId: skill._id });

      expect(roomsWithSkill).toHaveLength(2);
    });

    test('should find skill maps added by specific user', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill1 = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const skill2 = await Skill.create({
        userId: 'user456',
        name: 'React Fundamentals',
        nodeCount: 5
      });

      await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill1._id,
        addedBy: 'user123'
      });

      await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill2._id,
        addedBy: 'user456'
      });

      const skillMapsAddedByUser = await RoomSkillMap.find({ addedBy: 'user123' });

      expect(skillMapsAddedByUser).toHaveLength(1);
      expect(skillMapsAddedByUser[0].addedBy).toBe('user123');
    });

    test('should sort skill maps by createdAt ascending', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill1 = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const skill2 = await Skill.create({
        userId: 'user123',
        name: 'React Fundamentals',
        nodeCount: 5
      });

      const roomSkillMap1 = await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill1._id,
        addedBy: 'user123'
      });

      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const roomSkillMap2 = await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill2._id,
        addedBy: 'user123'
      });

      const sortedSkillMaps = await RoomSkillMap.find({ roomId: room._id }).sort({ createdAt: 1 });

      expect(sortedSkillMaps[0]._id.toString()).toBe(roomSkillMap1._id.toString());
      expect(sortedSkillMaps[1]._id.toString()).toBe(roomSkillMap2._id.toString());
    });
  });

  describe('Deletion Operations', () => {
    test('should delete a room skill map', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const roomSkillMap = await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill._id,
        addedBy: 'user123'
      });

      await RoomSkillMap.deleteOne({ _id: roomSkillMap._id });

      const deletedRoomSkillMap = await RoomSkillMap.findById(roomSkillMap._id);
      expect(deletedRoomSkillMap).toBeNull();
    });

    test('should delete all skill maps for a room', async () => {
      const room = await Room.create({
        ownerId: 'user123',
        name: 'Test Room'
      });

      const skill1 = await Skill.create({
        userId: 'user123',
        name: 'JavaScript Basics',
        nodeCount: 5
      });

      const skill2 = await Skill.create({
        userId: 'user123',
        name: 'React Fundamentals',
        nodeCount: 5
      });

      await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill1._id,
        addedBy: 'user123'
      });

      await RoomSkillMap.create({
        roomId: room._id,
        skillMapId: skill2._id,
        addedBy: 'user123'
      });

      await RoomSkillMap.deleteMany({ roomId: room._id });

      const remainingSkillMaps = await RoomSkillMap.find({ roomId: room._id });
      expect(remainingSkillMaps).toHaveLength(0);
    });
  });
});

