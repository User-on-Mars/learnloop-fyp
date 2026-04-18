import request from 'supertest';
import express from 'express';
import roomRoutes from '../rooms.js';
import RoomService from '../../services/RoomService.js';

// Mock the RoomService
jest.mock('../../services/RoomService.js');

// Mock the auth middleware
jest.mock('../../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

describe('Room Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/rooms', roomRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/rooms', () => {
    it('should create a new room with valid data', async () => {
      const mockRoom = {
        _id: 'room-123',
        ownerId: 'test-user-id',
        name: 'Test Room',
        description: 'Test Description',
        createdAt: new Date()
      };

      RoomService.createRoom.mockResolvedValue(mockRoom);

      const response = await request(app)
        .post('/api/rooms')
        .send({
          name: 'Test Room',
          description: 'Test Description'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockRoom);
      expect(RoomService.createRoom).toHaveBeenCalledWith('test-user-id', {
        name: 'Test Room',
        description: 'Test Description'
      });
    });

    it('should return 400 for missing room name', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .send({
          description: 'Test Description'
        });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for room name exceeding 50 characters', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .send({
          name: 'a'.repeat(51),
          description: 'Test Description'
        });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('VALIDATION_ERROR');
    });

    it('should return 409 when user owns 3 rooms already', async () => {
      RoomService.createRoom.mockRejectedValue(
        new Error('You can only own up to 3 rooms')
      );

      const response = await request(app)
        .post('/api/rooms')
        .send({
          name: 'Test Room',
          description: 'Test Description'
        });

      expect(response.status).toBe(409);
      expect(response.body.type).toBe('CONFLICT_ERROR');
    });
  });

  describe('GET /api/rooms', () => {
    it('should return all rooms for the user', async () => {
      const mockRooms = [
        {
          _id: 'room-1',
          name: 'Room 1',
          role: 'owner',
          memberCount: 3
        },
        {
          _id: 'room-2',
          name: 'Room 2',
          role: 'member',
          memberCount: 5
        }
      ];

      RoomService.getUserRooms.mockResolvedValue(mockRooms);

      const response = await request(app).get('/api/rooms');

      expect(response.status).toBe(200);
      expect(response.body.rooms).toEqual(mockRooms);
      expect(RoomService.getUserRooms).toHaveBeenCalledWith('test-user-id');
    });

    it('should return empty array when user has no rooms', async () => {
      RoomService.getUserRooms.mockResolvedValue([]);

      const response = await request(app).get('/api/rooms');

      expect(response.status).toBe(200);
      expect(response.body.rooms).toEqual([]);
    });
  });

  describe('GET /api/rooms/:roomId', () => {
    it('should return room details for valid roomId', async () => {
      const mockRoom = {
        _id: 'room-123',
        name: 'Test Room',
        description: 'Test Description',
        ownerId: 'test-user-id'
      };

      RoomService.getRoomById.mockResolvedValue(mockRoom);

      const response = await request(app).get('/api/rooms/room-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRoom);
      expect(RoomService.getRoomById).toHaveBeenCalledWith('room-123', 'test-user-id');
    });

    it('should return 404 for non-existent room', async () => {
      RoomService.getRoomById.mockRejectedValue(new Error('Room not found'));

      const response = await request(app).get('/api/rooms/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 403 when user is not a member', async () => {
      RoomService.getRoomById.mockRejectedValue(
        new Error('You do not have permission to view this room')
      );

      const response = await request(app).get('/api/rooms/room-123');

      expect(response.status).toBe(403);
      expect(response.body.type).toBe('PERMISSION_ERROR');
    });
  });

  describe('PATCH /api/rooms/:roomId', () => {
    it('should update room with valid data', async () => {
      const mockUpdatedRoom = {
        _id: 'room-123',
        name: 'Updated Room',
        description: 'Updated Description',
        ownerId: 'test-user-id'
      };

      RoomService.updateRoom.mockResolvedValue(mockUpdatedRoom);

      const response = await request(app)
        .patch('/api/rooms/room-123')
        .send({
          name: 'Updated Room',
          description: 'Updated Description'
        });

      expect(response.status).toBe(200);
      expect(response.body.room).toEqual(mockUpdatedRoom);
      expect(RoomService.updateRoom).toHaveBeenCalledWith('room-123', 'test-user-id', {
        name: 'Updated Room',
        description: 'Updated Description'
      });
    });

    it('should return 403 when user is not the owner', async () => {
      RoomService.updateRoom.mockRejectedValue(
        new Error('Only the room owner can update the room')
      );

      const response = await request(app)
        .patch('/api/rooms/room-123')
        .send({
          name: 'Updated Room'
        });

      expect(response.status).toBe(403);
      expect(response.body.type).toBe('PERMISSION_ERROR');
    });

    it('should return 400 for invalid name length', async () => {
      const response = await request(app)
        .patch('/api/rooms/room-123')
        .send({
          name: 'a'.repeat(51)
        });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/rooms/:roomId', () => {
    it('should delete room successfully', async () => {
      RoomService.deleteRoom.mockResolvedValue();

      const response = await request(app).delete('/api/rooms/room-123');

      expect(response.status).toBe(204);
      expect(RoomService.deleteRoom).toHaveBeenCalledWith('room-123', 'test-user-id');
    });

    it('should return 404 for non-existent room', async () => {
      RoomService.deleteRoom.mockRejectedValue(new Error('Room not found'));

      const response = await request(app).delete('/api/rooms/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 403 when user is not the owner', async () => {
      RoomService.deleteRoom.mockRejectedValue(
        new Error('Only the room owner can delete the room')
      );

      const response = await request(app).delete('/api/rooms/room-123');

      expect(response.status).toBe(403);
      expect(response.body.type).toBe('PERMISSION_ERROR');
    });
  });

  describe('GET /api/rooms/:roomId/members', () => {
    it('should return all members for a room', async () => {
      const mockMembers = [
        {
          _id: 'member-1',
          roomId: 'room-123',
          userId: 'user-1',
          role: 'owner',
          joinedAt: new Date(),
          user: { firebaseUid: 'user-1', name: 'Owner User', email: 'owner@test.com' }
        },
        {
          _id: 'member-2',
          roomId: 'room-123',
          userId: 'user-2',
          role: 'member',
          joinedAt: new Date(),
          user: { firebaseUid: 'user-2', name: 'Member User', email: 'member@test.com' }
        }
      ];

      RoomService.getRoomMembers.mockResolvedValue(mockMembers);

      const response = await request(app).get('/api/rooms/room-123/members');

      expect(response.status).toBe(200);
      expect(response.body.members).toEqual(mockMembers);
      expect(RoomService.getRoomMembers).toHaveBeenCalledWith('room-123', 'test-user-id');
    });

    it('should return empty array when room has no members', async () => {
      RoomService.getRoomMembers.mockResolvedValue([]);

      const response = await request(app).get('/api/rooms/room-123/members');

      expect(response.status).toBe(200);
      expect(response.body.members).toEqual([]);
    });

    it('should return 404 for non-existent room', async () => {
      RoomService.getRoomMembers.mockRejectedValue(new Error('Room not found'));

      const response = await request(app).get('/api/rooms/invalid-id/members');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 403 when user is not a member', async () => {
      RoomService.getRoomMembers.mockRejectedValue(
        new Error('You do not have permission to view members')
      );

      const response = await request(app).get('/api/rooms/room-123/members');

      expect(response.status).toBe(403);
      expect(response.body.type).toBe('PERMISSION_ERROR');
    });
  });

  describe('DELETE /api/rooms/:roomId/members/:userId', () => {
    it('should kick member successfully', async () => {
      RoomService.kickMember.mockResolvedValue();

      const response = await request(app).delete('/api/rooms/room-123/members/user-456');

      expect(response.status).toBe(204);
      expect(RoomService.kickMember).toHaveBeenCalledWith('room-123', 'test-user-id', 'user-456');
    });

    it('should return 404 for non-existent room', async () => {
      RoomService.kickMember.mockRejectedValue(new Error('Room not found'));

      const response = await request(app).delete('/api/rooms/invalid-id/members/user-456');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent member', async () => {
      RoomService.kickMember.mockRejectedValue(new Error('RoomMember not found'));

      const response = await request(app).delete('/api/rooms/room-123/members/invalid-user');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 403 when user is not the owner', async () => {
      RoomService.kickMember.mockRejectedValue(
        new Error('Only the room owner can kick members')
      );

      const response = await request(app).delete('/api/rooms/room-123/members/user-456');

      expect(response.status).toBe(403);
      expect(response.body.type).toBe('PERMISSION_ERROR');
    });

    it('should return 409 when owner tries to kick themselves', async () => {
      RoomService.kickMember.mockRejectedValue(
        new Error('Owners cannot kick themselves')
      );

      const response = await request(app).delete('/api/rooms/room-123/members/test-user-id');

      expect(response.status).toBe(409);
      expect(response.body.type).toBe('CONFLICT_ERROR');
    });
  });

  describe('POST /api/rooms/:roomId/leave', () => {
    it('should allow member to leave room successfully', async () => {
      RoomService.leaveRoom.mockResolvedValue();

      const response = await request(app).post('/api/rooms/room-123/leave');

      expect(response.status).toBe(204);
      expect(RoomService.leaveRoom).toHaveBeenCalledWith('room-123', 'test-user-id');
    });

    it('should return 404 for non-existent room', async () => {
      RoomService.leaveRoom.mockRejectedValue(new Error('Room not found'));

      const response = await request(app).post('/api/rooms/invalid-id/leave');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 404 when user is not a member', async () => {
      RoomService.leaveRoom.mockRejectedValue(new Error('RoomMember not found'));

      const response = await request(app).post('/api/rooms/room-123/leave');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 409 when owner tries to leave', async () => {
      RoomService.leaveRoom.mockRejectedValue(
        new Error('Owners cannot leave rooms. Delete the room instead.')
      );

      const response = await request(app).post('/api/rooms/room-123/leave');

      expect(response.status).toBe(409);
      expect(response.body.type).toBe('CONFLICT_ERROR');
    });
  });

  describe('GET /api/rooms/:roomId/skill-maps', () => {
    it('should return all skill maps for a room', async () => {
      const mockSkillMaps = [
        {
          _id: 'rsm-1',
          roomId: 'room-123',
          skillMapId: 'skill-1',
          addedBy: 'test-user-id',
          createdAt: new Date(),
          skillMap: {
            _id: 'skill-1',
            name: 'JavaScript Basics',
            description: 'Learn JS fundamentals'
          }
        },
        {
          _id: 'rsm-2',
          roomId: 'room-123',
          skillMapId: 'skill-2',
          addedBy: 'test-user-id',
          createdAt: new Date(),
          skillMap: {
            _id: 'skill-2',
            name: 'React Advanced',
            description: 'Advanced React patterns'
          }
        }
      ];

      RoomService.getRoomSkillMaps.mockResolvedValue(mockSkillMaps);

      const response = await request(app).get('/api/rooms/room-123/skill-maps');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSkillMaps);
      expect(RoomService.getRoomSkillMaps).toHaveBeenCalledWith('room-123', 'test-user-id');
    });

    it('should return empty array when room has no skill maps', async () => {
      RoomService.getRoomSkillMaps.mockResolvedValue([]);

      const response = await request(app).get('/api/rooms/room-123/skill-maps');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 404 for non-existent room', async () => {
      RoomService.getRoomSkillMaps.mockRejectedValue(new Error('Room not found'));

      const response = await request(app).get('/api/rooms/invalid-id/skill-maps');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 403 when user is not a member', async () => {
      RoomService.getRoomSkillMaps.mockRejectedValue(
        new Error('You do not have permission to view skill maps')
      );

      const response = await request(app).get('/api/rooms/room-123/skill-maps');

      expect(response.status).toBe(403);
      expect(response.body.type).toBe('PERMISSION_ERROR');
    });
  });

  describe('POST /api/rooms/:roomId/skill-maps', () => {
    it('should add skill map to room successfully', async () => {
      const mockRoomSkillMap = {
        _id: 'rsm-123',
        roomId: 'room-123',
        skillMapId: 'skill-456',
        addedBy: 'test-user-id',
        createdAt: new Date()
      };

      RoomService.addSkillMap.mockResolvedValue(mockRoomSkillMap);

      const response = await request(app)
        .post('/api/rooms/room-123/skill-maps')
        .send({ skillMapId: 'skill-456' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockRoomSkillMap);
      expect(RoomService.addSkillMap).toHaveBeenCalledWith('room-123', 'test-user-id', 'skill-456');
    });

    it('should return 400 when skillMapId is missing', async () => {
      const response = await request(app)
        .post('/api/rooms/room-123/skill-maps')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('skillMapId is required');
    });

    it('should return 404 for non-existent room', async () => {
      RoomService.addSkillMap.mockRejectedValue(new Error('Room not found'));

      const response = await request(app)
        .post('/api/rooms/invalid-id/skill-maps')
        .send({ skillMapId: 'skill-456' });

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent skill map', async () => {
      RoomService.addSkillMap.mockRejectedValue(new Error('Skill not found'));

      const response = await request(app)
        .post('/api/rooms/room-123/skill-maps')
        .send({ skillMapId: 'invalid-skill' });

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 403 when user is not the owner', async () => {
      RoomService.addSkillMap.mockRejectedValue(
        new Error('Only the room owner can add skill maps')
      );

      const response = await request(app)
        .post('/api/rooms/room-123/skill-maps')
        .send({ skillMapId: 'skill-456' });

      expect(response.status).toBe(403);
      expect(response.body.type).toBe('PERMISSION_ERROR');
    });

    it('should return 409 when skill map is already added', async () => {
      RoomService.addSkillMap.mockRejectedValue(
        new Error('This skill map is already added to the room')
      );

      const response = await request(app)
        .post('/api/rooms/room-123/skill-maps')
        .send({ skillMapId: 'skill-456' });

      expect(response.status).toBe(409);
      expect(response.body.type).toBe('CONFLICT_ERROR');
    });
  });

  describe('DELETE /api/rooms/:roomId/skill-maps/:skillMapId', () => {
    it('should remove skill map from room successfully', async () => {
      RoomService.removeSkillMap.mockResolvedValue();

      const response = await request(app).delete('/api/rooms/room-123/skill-maps/skill-456');

      expect(response.status).toBe(204);
      expect(RoomService.removeSkillMap).toHaveBeenCalledWith('room-123', 'test-user-id', 'skill-456');
    });

    it('should return 404 for non-existent room', async () => {
      RoomService.removeSkillMap.mockRejectedValue(new Error('Room not found'));

      const response = await request(app).delete('/api/rooms/invalid-id/skill-maps/skill-456');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent skill map in room', async () => {
      RoomService.removeSkillMap.mockRejectedValue(new Error('RoomSkillMap not found'));

      const response = await request(app).delete('/api/rooms/room-123/skill-maps/invalid-skill');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('NOT_FOUND');
    });

    it('should return 403 when user is not the owner', async () => {
      RoomService.removeSkillMap.mockRejectedValue(
        new Error('Only the room owner can remove skill maps')
      );

      const response = await request(app).delete('/api/rooms/room-123/skill-maps/skill-456');

      expect(response.status).toBe(403);
      expect(response.body.type).toBe('PERMISSION_ERROR');
    });
  });
});
