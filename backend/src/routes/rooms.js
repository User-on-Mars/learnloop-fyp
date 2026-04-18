import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import RoomService from '../services/RoomService.js';
import RoomNodeProgress from '../models/RoomNodeProgress.js';
import RoomMember from '../models/RoomMember.js';
import RoomSkillMap from '../models/RoomSkillMap.js';
import RoomPractice from '../models/RoomPractice.js';
import User from '../models/User.js';

const router = Router();

// All room routes require authentication
router.use(requireAuth);

// Validation schemas
const createRoomSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Room name is required')
    .max(20, 'Room name must be 20 characters or less'),
  description: z.string()
    .max(200, 'Description must be 200 characters or less')
    .optional()
    .default(''),
  color: z.string()
    .max(20)
    .optional()
    .default('#0d9488'),
  icon: z.string()
    .max(50)
    .optional()
    .default('Users')
});

const updateRoomSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Room name is required')
    .max(20, 'Room name must be 20 characters or less')
    .optional(),
  description: z.string()
    .max(200, 'Description must be 200 characters or less')
    .optional(),
  color: z.string()
    .max(20)
    .optional(),
  icon: z.string()
    .max(50)
    .optional()
});

// Validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          type: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: formattedErrors
        });
      }
      
      return res.status(500).json({
        type: 'SERVER_ERROR',
        message: 'Internal validation error'
      });
    }
  };
};

// POST /api/rooms - Create a new room
router.post('/', validateRequest(createRoomSchema), async (req, res) => {
  try {
    console.log('🏠 Creating room for user:', req.user.id);
    const { name, description, color, icon } = req.body;
    
    const room = await RoomService.createRoom(req.user.id, { name, description, color, icon });
    
    console.log('✅ Room created:', room._id);
    res.status(201).json(room);
  } catch (error) {
    console.error('❌ Error creating room:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      operation: 'create_room',
      requestBody: req.body,
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message.includes('must be') || error.message.includes('required')) {
      statusCode = 400;
      errorType = 'VALIDATION_ERROR';
    } else if (error.message.includes('can only own up to 3 rooms')) {
      statusCode = 409;
      errorType = 'CONFLICT_ERROR';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// GET /api/rooms - Get all rooms for current user
router.get('/', async (req, res) => {
  try {
    console.log('📋 Getting rooms for user:', req.user.id);
    
    const rooms = await RoomService.getUserRooms(req.user.id);
    
    console.log(`✅ Found ${rooms.length} rooms`);
    res.json({ rooms });
  } catch (error) {
    console.error('❌ Error getting rooms:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      operation: 'get_rooms',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: 'Failed to retrieve rooms',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// GET /api/rooms/:roomId - Get room details
router.get('/:roomId', async (req, res) => {
  try {
    console.log('📖 Getting room:', req.params.roomId, 'for user:', req.user.id);
    
    const room = await RoomService.getRoomById(req.params.roomId, req.user.id);
    
    console.log('✅ Room retrieved');
    res.json(room);
  } catch (error) {
    console.error('❌ Error getting room:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      operation: 'get_room_details',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Room not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('not a member')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// PATCH /api/rooms/:roomId - Update room (owner only)
router.patch('/:roomId', validateRequest(updateRoomSchema), async (req, res) => {
  try {
    console.log('✏️ Updating room:', req.params.roomId, 'for user:', req.user.id);
    
    const updatedRoom = await RoomService.updateRoom(req.params.roomId, req.user.id, req.body);
    
    console.log('✅ Room updated');
    res.json({
      room: updatedRoom,
      message: 'Room updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error updating room:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      operation: 'update_room',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Room not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('owner')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.message.includes('must be') || error.message.includes('required')) {
      statusCode = 400;
      errorType = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// DELETE /api/rooms/:roomId - Delete room (owner only)
router.delete('/:roomId', async (req, res) => {
  try {
    console.log('🗑️ Deleting room:', req.params.roomId, 'for user:', req.user.id);
    
    await RoomService.deleteRoom(req.params.roomId, req.user.id);
    
    console.log('✅ Room deleted');
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error deleting room:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      operation: 'delete_room',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Room not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('owner')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// GET /api/rooms/:roomId/members - Get room members
router.get('/:roomId/members', async (req, res) => {
  try {
    console.log('👥 Getting members for room:', req.params.roomId, 'for user:', req.user.id);
    
    const members = await RoomService.getRoomMembers(req.params.roomId, req.user.id);
    
    console.log(`✅ Found ${members.length} members`);
    res.json({ members });
  } catch (error) {
    console.error('❌ Error getting room members:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      operation: 'get_room_members',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Room not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('not a member')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// DELETE /api/rooms/:roomId/members/:userId - Kick member (owner only)
router.delete('/:roomId/members/:userId', async (req, res) => {
  try {
    console.log('👢 Kicking member:', req.params.userId, 'from room:', req.params.roomId, 'by user:', req.user.id);
    
    await RoomService.kickMember(req.params.roomId, req.user.id, req.params.userId);
    
    console.log('✅ Member kicked');
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error kicking member:', error.message);
    
    const errorContext = {
      ownerId: req.user.id,
      roomId: req.params.roomId,
      targetUserId: req.params.userId,
      operation: 'kick_member',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Room not found' || error.message === 'RoomMember not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('owner')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.message.includes('cannot kick themselves')) {
      statusCode = 409;
      errorType = 'CONFLICT_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// POST /api/rooms/:roomId/leave - Leave room (members only)
router.post('/:roomId/leave', async (req, res) => {
  try {
    console.log('🚪 User:', req.user.id, 'leaving room:', req.params.roomId);
    
    await RoomService.leaveRoom(req.params.roomId, req.user.id);
    
    console.log('✅ User left room');
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error leaving room:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      operation: 'leave_room',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Room not found' || error.message === 'RoomMember not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('Owners cannot leave rooms')) {
      statusCode = 409;
      errorType = 'CONFLICT_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// GET /api/rooms/:roomId/skill-maps - Get room skill maps
router.get('/:roomId/skill-maps', async (req, res) => {
  try {
    console.log('🗺️ Getting skill maps for room:', req.params.roomId, 'for user:', req.user.id);
    
    const skillMaps = await RoomService.getRoomSkillMaps(req.params.roomId, req.user.id);
    
    console.log(`✅ Found ${skillMaps.length} skill maps`);
    res.json(skillMaps);
  } catch (error) {
    console.error('❌ Error getting room skill maps:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      operation: 'get_room_skill_maps',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Room not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('not a member')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// POST /api/rooms/:roomId/skill-maps - Add skill map to room (owner only)
router.post('/:roomId/skill-maps', async (req, res) => {
  try {
    console.log('➕ Adding skill map to room:', req.params.roomId, 'for user:', req.user.id);
    const { skillMapId } = req.body;
    
    if (!skillMapId) {
      return res.status(400).json({
        type: 'VALIDATION_ERROR',
        message: 'skillMapId is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const roomSkillMap = await RoomService.addSkillMap(req.params.roomId, req.user.id, skillMapId);
    
    console.log('✅ Skill map added to room');
    res.status(201).json(roomSkillMap);
  } catch (error) {
    console.error('❌ Error adding skill map to room:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      skillMapId: req.body.skillMapId,
      operation: 'add_skill_map',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Room not found' || error.message === 'Skill not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('owner')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.message.includes('already added')) {
      statusCode = 409;
      errorType = 'CONFLICT_ERROR';
    } else if (error.message.includes('must be') || error.message.includes('required')) {
      statusCode = 400;
      errorType = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// POST /api/rooms/:roomId/skill-maps/from-template - Create room skill map from template data
router.post('/:roomId/skill-maps/from-template', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description, icon, color, goal, nodes } = req.body;
    
    const roomSkillMap = await RoomService.addSkillMapFromTemplate(roomId, req.user.id, {
      name, description, icon, color, goal, nodes
    });
    
    res.status(201).json(roomSkillMap);
  } catch (error) {
    console.error('❌ Error creating room skill map from template:', error.message);
    
    let statusCode = 500;
    if (error.message?.includes('not found')) statusCode = 404;
    if (error.message?.includes('Permission') || error.message?.includes('owner')) statusCode = 403;
    if (error.message?.includes('conflict') || error.message?.includes('maximum')) statusCode = 409;
    if (error.message?.includes('Validation') || error.message?.includes('required')) statusCode = 400;
    
    res.status(statusCode).json({
      type: statusCode === 409 ? 'CONFLICT' : 'SERVER_ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/rooms/:roomId/skill-maps/:skillMapId - Remove skill map from room (owner only)
router.delete('/:roomId/skill-maps/:skillMapId', async (req, res) => {
  try {
    console.log('🗑️ Removing skill map:', req.params.skillMapId, 'from room:', req.params.roomId, 'for user:', req.user.id);
    
    await RoomService.removeSkillMap(req.params.roomId, req.user.id, req.params.skillMapId);
    
    console.log('✅ Skill map removed from room');
    res.status(204).send();
  } catch (error) {
    console.error('❌ Error removing skill map from room:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      skillMapId: req.params.skillMapId,
      operation: 'remove_skill_map',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Room not found' || error.message === 'RoomSkillMap not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('owner')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// GET /api/rooms/:roomId/skill-maps/:roomSkillMapId - Get room skill map detail with user progress
router.get('/:roomId/skill-maps/:roomSkillMapId', async (req, res) => {
  try {
    const { roomId, roomSkillMapId } = req.params;
    const userId = req.user.id;

    // Verify membership
    const membership = await RoomMember.findOne({ roomId, userId });
    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    // Get the room skill map
    const roomSkillMap = await RoomSkillMap.findOne({ _id: roomSkillMapId, roomId }).lean();
    if (!roomSkillMap) {
      return res.status(404).json({ message: 'Room skill map not found' });
    }

    // Get user's progress for this skill map's nodes
    const progressRecords = await RoomNodeProgress.find({
      roomId,
      userId,
      skillMapId: roomSkillMapId
    }).lean();

    const progressMap = {};
    progressRecords.forEach(p => {
      progressMap[p.nodeId.toString()] = p;
    });

    // Merge progress into nodes
    const nodesWithProgress = (roomSkillMap.nodes || []).map((node, index) => {
      const progress = progressMap[node._id.toString()];
      return {
        ...node,
        status: progress?.status || (index === 0 ? 'Unlocked' : 'Locked'),
        completedAt: progress?.completedAt || null,
        progressId: progress?._id || null
      };
    });

    const completedCount = nodesWithProgress.filter(n => n.status === 'Completed').length;
    const totalCount = nodesWithProgress.length;

    res.json({
      ...roomSkillMap,
      nodes: nodesWithProgress,
      completedCount,
      totalCount,
      completionPercentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    });
  } catch (error) {
    console.error('❌ Error getting room skill map detail:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/rooms/:roomId/skill-maps/:roomSkillMapId/nodes/:nodeId/status - Update node status
router.patch('/:roomId/skill-maps/:roomSkillMapId/nodes/:nodeId/status', async (req, res) => {
  try {
    const { roomId, roomSkillMapId, nodeId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Verify membership
    const membership = await RoomMember.findOne({ roomId, userId });
    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    // Get the room skill map
    const roomSkillMap = await RoomSkillMap.findOne({ _id: roomSkillMapId, roomId });
    if (!roomSkillMap) {
      return res.status(404).json({ message: 'Room skill map not found' });
    }

    // Find the node
    const nodeIndex = roomSkillMap.nodes.findIndex(n => n._id.toString() === nodeId);
    if (nodeIndex === -1) {
      return res.status(404).json({ message: 'Node not found' });
    }

    // Upsert progress record
    const progress = await RoomNodeProgress.findOneAndUpdate(
      { roomId, userId, skillMapId: roomSkillMapId, nodeId },
      { 
        status,
        completedAt: status === 'Completed' ? new Date() : null
      },
      { upsert: true, new: true }
    );

    // If completed, unlock the next node
    if (status === 'Completed' && nodeIndex < roomSkillMap.nodes.length - 1) {
      const nextNode = roomSkillMap.nodes[nodeIndex + 1];
      await RoomNodeProgress.findOneAndUpdate(
        { roomId, userId, skillMapId: roomSkillMapId, nodeId: nextNode._id },
        { $setOnInsert: { status: 'Unlocked' } },
        { upsert: true }
      );
    }

    res.json({ progress, message: 'Status updated' });
  } catch (error) {
    console.error('❌ Error updating node status:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/rooms/:roomId/skill-maps/:roomSkillMapId/nodes/:nodeId/practice - Log a room practice session
router.post('/:roomId/skill-maps/:roomSkillMapId/nodes/:nodeId/practice', async (req, res) => {
  try {
    const { roomId, roomSkillMapId, nodeId } = req.params;
    const userId = req.user.id;
    const { notes, minutesPracticed, timerSeconds, confidence, blockers, nextStep } = req.body;

    const membership = await RoomMember.findOne({ roomId, userId });
    if (!membership) return res.status(403).json({ message: 'Not a member' });

    const roomSkillMap = await RoomSkillMap.findOne({ _id: roomSkillMapId, roomId });
    if (!roomSkillMap) return res.status(404).json({ message: 'Skill map not found' });

    const node = roomSkillMap.nodes.id(nodeId);
    if (!node) return res.status(404).json({ message: 'Node not found' });

    const practice = new RoomPractice({
      roomId, userId, roomSkillMapId, nodeId,
      nodeTitle: node.title,
      notes: notes || '',
      minutesPracticed: Math.max(1, minutesPracticed || 1),
      timerSeconds: timerSeconds || 0,
      confidence: confidence || 3,
      blockers: blockers || '',
      nextStep: nextStep || '',
      date: new Date()
    });
    await practice.save();

    // Update node status to In_Progress if not already
    const progress = await RoomNodeProgress.findOneAndUpdate(
      { roomId, userId, skillMapId: roomSkillMapId, nodeId },
      { $setOnInsert: { status: 'In_Progress' } },
      { upsert: true, new: true }
    );
    if (progress.status === 'Locked' || progress.status === 'Unlocked') {
      progress.status = 'In_Progress';
      await progress.save();
    }

    res.status(201).json(practice);
  } catch (error) {
    console.error('❌ Error logging room practice:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/rooms/:roomId/skill-maps/:roomSkillMapId/nodes/:nodeId/practice - Get practice history for a node
router.get('/:roomId/skill-maps/:roomSkillMapId/nodes/:nodeId/practice', async (req, res) => {
  try {
    const { roomId, roomSkillMapId, nodeId } = req.params;
    const userId = req.user.id;

    const membership = await RoomMember.findOne({ roomId, userId });
    if (!membership) return res.status(403).json({ message: 'Not a member' });

    const practices = await RoomPractice.find({
      roomId, userId, roomSkillMapId, nodeId
    }).sort({ date: -1 }).lean();

    res.json({ practices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/rooms/:roomId/leaderboard - Room leaderboard based on total practice minutes
router.get('/:roomId/leaderboard', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const membership = await RoomMember.findOne({ roomId, userId });
    if (!membership) return res.status(403).json({ message: 'Not a member' });

    // Aggregate total minutes per user
    const stats = await RoomPractice.aggregate([
      { $match: { roomId: new (await import('mongoose')).default.Types.ObjectId(roomId) } },
      { $group: {
        _id: '$userId',
        totalMinutes: { $sum: '$minutesPracticed' },
        totalSessions: { $sum: 1 },
        totalSeconds: { $sum: '$timerSeconds' }
      }},
      { $sort: { totalMinutes: -1 } }
    ]);

    // Get all members
    const members = await RoomMember.find({ roomId }).lean();
    const userIds = members.map(m => m.userId);
    const users = await User.find({ firebaseUid: { $in: userIds } }).select('firebaseUid name email').lean();
    const userMap = users.reduce((acc, u) => { acc[u.firebaseUid] = u; return acc; }, {});

    // Build leaderboard with all members (even those with 0 practice)
    const statsMap = stats.reduce((acc, s) => { acc[s._id] = s; return acc; }, {});

    const leaderboard = members.map((m, index) => {
      const s = statsMap[m.userId] || { totalMinutes: 0, totalSessions: 0, totalSeconds: 0 };
      const user = userMap[m.userId];
      const totalXp = s.totalMinutes * 2; // 2 XP per minute
      return {
        userId: m.userId,
        username: user?.name || 'Unknown',
        avatar: null,
        role: m.role,
        totalMinutes: s.totalMinutes,
        totalSessions: s.totalSessions,
        totalXp,
        currentStreak: 0,
        rank: 0 // will be set after sorting
      };
    }).sort((a, b) => b.totalXp - a.totalXp);

    // Assign ranks
    leaderboard.forEach((entry, i) => { entry.rank = i + 1; });

    res.json({ leaderboard, count: leaderboard.length });
  } catch (error) {
    console.error('❌ Error getting room leaderboard:', error.message);
    res.status(500).json({ message: error.message });
  }
});

export default router;
