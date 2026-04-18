/**
 * Integration Test: Room Skill Map Progress Isolation
 * 
 * Requirements: 18.1-18.4 - Room Skill Map Progress Isolation
 * 
 * This test verifies that:
 * 1. Room skill map progress is tracked separately from personal progress
 * 2. Personal skill map progress is tracked separately from room progress  
 * 3. No synchronization occurs between room and personal progress
 * 4. Users can have different completion percentages for the same skill map template in different contexts
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js';
import { connectDB } from '../../config/db.js';
import User from '../../models/User.js';
import Skill from '../../models/Skill.js';
import Node from '../../models/Node.js';
import Room from '../../models/Room.js';
import RoomMember from '../../models/RoomMember.js';
import RoomSkillMap from '../../models/RoomSkillMap.js';
import RoomNodeProgress from '../../models/RoomNodeProgress.js';
import { generateTestToken } from '../../utils/testHelpers.js';

describe('Room Progress Isolation Integration Tests', () => {
  let testUser;
  let testToken;
  let personalSkillMap;
  let personalNodes;
  let testRoom;
  let roomSkillMap;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
    await Skill.deleteMany({ name: { $regex: /Test.*/ } });
    await Node.deleteMany({});
    await Room.deleteMany({ name: { $regex: /Test.*/ } });
    await RoomMember.deleteMany({});
    await RoomSkillMap.deleteMany({});
    await RoomNodeProgress.deleteMany({});

    // Create test user
    testUser = new User({
      firebaseUid: 'test-user-progress-isolation',
      email: 'test.progress@example.com',
      displayName: 'Test Progress User'
    });
    await testUser.save();

    testToken = generateTestToken(testUser.firebaseUid);

    // Create personal skill map with nodes
    personalSkillMap = new Skill({
      userId: testUser.firebaseUid,
      name: 'Test JavaScript Fundamentals',
      nodeCount: 3,
      description: 'Personal skill map for testing',
      status: 'active'
    });
    await personalSkillMap.save();

    // Create nodes for personal skill map
    personalNodes = [
      new Node({
        skillId: personalSkillMap._id,
        userId: testUser.firebaseUid,
        order: 1,
        title: 'Variables',
        description: 'Learn about variables',
        status: 'Unlocked',
        isStart: true
      }),
      new Node({
        skillId: personalSkillMap._id,
        userId: testUser.firebaseUid,
        order: 2,
        title: 'Functions',
        description: 'Learn about functions',
        status: 'Locked'
      }),
      new Node({
        skillId: personalSkillMap._id,
        userId: testUser.firebaseUid,
        order: 3,
        title: 'Objects',
        description: 'Learn about objects',
        status: 'Locked'
      })
    ];
    await Node.insertMany(personalNodes);

    // Create test room
    testRoom = new Room({
      ownerId: testUser.firebaseUid,
      name: 'Test JavaScript Room',
      description: 'Room for testing progress isolation'
    });
    await testRoom.save();

    // Add user as room member
    const roomMember = new RoomMember({
      roomId: testRoom._id,
      userId: testUser.firebaseUid,
      role: 'owner'
    });
    await roomMember.save();

    // Add the same skill map to the room
    roomSkillMap = new RoomSkillMap({
      roomId: testRoom._id,
      skillMapId: personalSkillMap._id,
      addedBy: testUser.firebaseUid
    });
    await roomSkillMap.save();

    // Initialize room progress (this should happen automatically when skill map is added)
    const roomProgressRecords = personalNodes.map((node, index) => new RoomNodeProgress({
      roomId: testRoom._id,
      userId: testUser.firebaseUid,
      skillMapId: personalSkillMap._id,
      nodeId: node._id,
      status: index === 0 ? 'Unlocked' : 'Locked'
    }));
    await RoomNodeProgress.insertMany(roomProgressRecords);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Progress Isolation Verification', () => {
    it('should track room and personal progress separately', async () => {
      // Complete first node in personal skill map
      const personalNodeUpdateResponse = await request(app)
        .patch(`/api/nodes/${personalNodes[0]._id}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'Completed' });

      expect(personalNodeUpdateResponse.status).toBe(200);

      // Verify personal node is completed
      const personalNodeAfter = await Node.findById(personalNodes[0]._id);
      expect(personalNodeAfter.status).toBe('Completed');

      // Verify second personal node is unlocked
      const personalNode2After = await Node.findById(personalNodes[1]._id);
      expect(personalNode2After.status).toBe('Unlocked');

      // Check room progress - should still be separate
      const roomProgressResponse = await request(app)
        .get(`/api/rooms/${testRoom._id}/progress/${personalSkillMap._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(roomProgressResponse.status).toBe(200);
      const roomProgress = roomProgressResponse.body;

      // Room progress should be independent - first node still unlocked, not completed
      const roomFirstNodeProgress = roomProgress.find(p => p.nodeId === personalNodes[0]._id.toString());
      const roomSecondNodeProgress = roomProgress.find(p => p.nodeId === personalNodes[1]._id.toString());

      expect(roomFirstNodeProgress.status).toBe('Unlocked'); // Not completed like personal
      expect(roomSecondNodeProgress.status).toBe('Locked'); // Not unlocked like personal
    });

    it('should allow different completion percentages in room vs personal', async () => {
      // Complete all nodes in personal skill map
      for (let i = 0; i < personalNodes.length; i++) {
        await request(app)
          .patch(`/api/nodes/${personalNodes[i]._id}/status`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ status: 'Completed' });
      }

      // Get personal skill map stats
      const personalStatsResponse = await request(app)
        .get(`/api/skills/${personalSkillMap._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(personalStatsResponse.status).toBe(200);

      // Verify all personal nodes are completed
      const personalNodesAfter = await Node.find({ skillId: personalSkillMap._id }).sort({ order: 1 });
      personalNodesAfter.forEach(node => {
        expect(node.status).toBe('Completed');
      });

      // Get room skill map stats
      const roomStatsResponse = await request(app)
        .get(`/api/rooms/${testRoom._id}/progress/${personalSkillMap._id}/stats`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(roomStatsResponse.status).toBe(200);
      const roomStats = roomStatsResponse.body;

      // Room should have 0% completion (no nodes completed in room context)
      expect(roomStats.completed).toBe(0);
      expect(roomStats.total).toBe(3);
      expect(roomStats.percent).toBe(0);

      // Complete first node in room context
      const roomNodeUpdateResponse = await request(app)
        .patch(`/api/rooms/${testRoom._id}/progress/nodes/${personalNodes[0]._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'Completed' });

      expect(roomNodeUpdateResponse.status).toBe(200);

      // Get updated room stats
      const updatedRoomStatsResponse = await request(app)
        .get(`/api/rooms/${testRoom._id}/progress/${personalSkillMap._id}/stats`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(updatedRoomStatsResponse.status).toBe(200);
      const updatedRoomStats = updatedRoomStatsResponse.body;

      // Room should now have 33% completion (1 out of 3 nodes)
      expect(updatedRoomStats.completed).toBe(1);
      expect(updatedRoomStats.total).toBe(3);
      expect(updatedRoomStats.percent).toBe(33);

      // Verify personal progress is still 100% (unchanged)
      const personalNodesStillCompleted = await Node.find({ skillId: personalSkillMap._id }).sort({ order: 1 });
      personalNodesStillCompleted.forEach(node => {
        expect(node.status).toBe('Completed');
      });
    });

    it('should not synchronize progress between room and personal contexts', async () => {
      // Complete first two nodes in room context
      await request(app)
        .patch(`/api/rooms/${testRoom._id}/progress/nodes/${personalNodes[0]._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'Completed' });

      await request(app)
        .patch(`/api/rooms/${testRoom._id}/progress/nodes/${personalNodes[1]._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'Completed' });

      // Verify room progress
      const roomProgressResponse = await request(app)
        .get(`/api/rooms/${testRoom._id}/progress/${personalSkillMap._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(roomProgressResponse.status).toBe(200);
      const roomProgress = roomProgressResponse.body;

      const roomFirstNodeProgress = roomProgress.find(p => p.nodeId === personalNodes[0]._id.toString());
      const roomSecondNodeProgress = roomProgress.find(p => p.nodeId === personalNodes[1]._id.toString());
      const roomThirdNodeProgress = roomProgress.find(p => p.nodeId === personalNodes[2]._id.toString());

      expect(roomFirstNodeProgress.status).toBe('Completed');
      expect(roomSecondNodeProgress.status).toBe('Completed');
      expect(roomThirdNodeProgress.status).toBe('Unlocked'); // Should be unlocked after completing second

      // Verify personal progress is unchanged (still all locked except first)
      const personalNodesAfter = await Node.find({ skillId: personalSkillMap._id }).sort({ order: 1 });
      expect(personalNodesAfter[0].status).toBe('Unlocked'); // Still unlocked, not completed
      expect(personalNodesAfter[1].status).toBe('Locked'); // Still locked, not completed
      expect(personalNodesAfter[2].status).toBe('Locked'); // Still locked, not unlocked

      // Complete first node in personal context
      await request(app)
        .patch(`/api/nodes/${personalNodes[0]._id}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'Completed' });

      // Verify personal progress updated
      const personalNodesAfterPersonalUpdate = await Node.find({ skillId: personalSkillMap._id }).sort({ order: 1 });
      expect(personalNodesAfterPersonalUpdate[0].status).toBe('Completed');
      expect(personalNodesAfterPersonalUpdate[1].status).toBe('Unlocked'); // Unlocked after completing first
      expect(personalNodesAfterPersonalUpdate[2].status).toBe('Locked');

      // Verify room progress is unchanged
      const roomProgressAfterPersonalUpdate = await request(app)
        .get(`/api/rooms/${testRoom._id}/progress/${personalSkillMap._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(roomProgressAfterPersonalUpdate.status).toBe(200);
      const roomProgressAfter = roomProgressAfterPersonalUpdate.body;

      const roomFirstNodeAfter = roomProgressAfter.find(p => p.nodeId === personalNodes[0]._id.toString());
      const roomSecondNodeAfter = roomProgressAfter.find(p => p.nodeId === personalNodes[1]._id.toString());
      const roomThirdNodeAfter = roomProgressAfter.find(p => p.nodeId === personalNodes[2]._id.toString());

      // Room progress should be unchanged
      expect(roomFirstNodeAfter.status).toBe('Completed');
      expect(roomSecondNodeAfter.status).toBe('Completed');
      expect(roomThirdNodeAfter.status).toBe('Unlocked');
    });

    it('should maintain separate XP tracking for room vs personal completion', async () => {
      // Complete first node in personal context
      const personalResponse = await request(app)
        .patch(`/api/nodes/${personalNodes[0]._id}/status`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'Completed' });

      expect(personalResponse.status).toBe(200);
      expect(personalResponse.body.nodeCompletionXpAwarded).toBeDefined();
      expect(personalResponse.body.nodeCompletionXpAwarded.type).toBe('node_completion'); // Personal XP

      // Complete first node in room context
      const roomResponse = await request(app)
        .patch(`/api/rooms/${testRoom._id}/progress/nodes/${personalNodes[0]._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'Completed' });

      expect(roomResponse.status).toBe(200);
      expect(roomResponse.body.nodeCompletionXpAwarded).toBeDefined();
      expect(roomResponse.body.nodeCompletionXpAwarded.type).toBe('room_node_completion'); // Room XP
      expect(roomResponse.body.nodeCompletionXpAwarded.roomId).toBe(testRoom._id.toString());
    });
  });

  describe('API Endpoint Validation', () => {
    it('should return 403 for non-room members accessing room progress', async () => {
      // Create another user
      const otherUser = new User({
        firebaseUid: 'other-user-123',
        email: 'other@example.com',
        displayName: 'Other User'
      });
      await otherUser.save();

      const otherToken = generateTestToken(otherUser.firebaseUid);

      // Try to access room progress as non-member
      const response = await request(app)
        .get(`/api/rooms/${testRoom._id}/progress/${personalSkillMap._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent skill map in room', async () => {
      const nonExistentSkillMapId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/rooms/${testRoom._id}/progress/${nonExistentSkillMapId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });

    it('should validate status transitions in room context', async () => {
      // Try invalid transition (Locked -> Completed)
      const response = await request(app)
        .patch(`/api/rooms/${testRoom._id}/progress/nodes/${personalNodes[1]._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ status: 'Completed' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('INVALID_TRANSITION');
    });
  });
});