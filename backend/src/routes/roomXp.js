import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import RoomXpService from '../services/RoomXpService.js';
import RoomService from '../services/RoomService.js';

const router = Router();

// All room XP routes require authentication
router.use(requireAuth);

// Validation schemas
const awardXpSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  skillMapId: z.string().min(1, 'skillMapId is required'),
  xpAmount: z.number()
    .positive('XP amount must be positive')
    .int('XP amount must be an integer')
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

// POST /api/rooms/:roomId/xp - Award XP (internal use, triggered by node completion)
// Requirements: 20.1-20.5
router.post('/:roomId/xp', validateRequest(awardXpSchema), async (req, res) => {
  try {
    console.log('🎯 Awarding XP in room:', req.params.roomId);
    const { userId, skillMapId, xpAmount } = req.body;
    const roomId = req.params.roomId;
    
    // Verify the user is a member of the room
    try {
      await RoomService.getRoomById(roomId, userId);
    } catch (error) {
      if (error.message === 'Room not found') {
        return res.status(404).json({
          type: 'NOT_FOUND',
          message: 'Room not found',
          timestamp: new Date().toISOString()
        });
      }
      if (error.message.includes('not a member')) {
        return res.status(403).json({
          type: 'PERMISSION_ERROR',
          message: 'User is not a member of this room',
          timestamp: new Date().toISOString()
        });
      }
      throw error;
    }
    
    // Award XP
    const ledgerEntry = await RoomXpService.awardXp(roomId, userId, skillMapId, xpAmount);
    
    console.log('✅ XP awarded:', xpAmount);
    res.status(201).json({
      success: true,
      data: ledgerEntry,
      message: 'XP awarded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error awarding XP:', error.message);
    
    const errorContext = {
      roomId: req.params.roomId,
      userId: req.body.userId,
      skillMapId: req.body.skillMapId,
      xpAmount: req.body.xpAmount,
      operation: 'award_xp',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message.includes('must be') || error.message.includes('required')) {
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

// GET /api/rooms/:roomId/leaderboard - Get room leaderboard
// Requirements: 21.1-21.7
router.get('/:roomId/leaderboard', async (req, res) => {
  try {
    console.log('🏆 Getting leaderboard for room:', req.params.roomId, 'for user:', req.user.id);
    const roomId = req.params.roomId;
    
    // Verify the user is a member of the room
    try {
      await RoomService.getRoomById(roomId, req.user.id);
    } catch (error) {
      if (error.message === 'Room not found') {
        return res.status(404).json({
          type: 'NOT_FOUND',
          message: 'Room not found',
          timestamp: new Date().toISOString()
        });
      }
      if (error.message.includes('not a member')) {
        return res.status(403).json({
          type: 'PERMISSION_ERROR',
          message: 'You are not a member of this room',
          timestamp: new Date().toISOString()
        });
      }
      throw error;
    }
    
    // Get leaderboard
    const leaderboard = await RoomXpService.getRoomLeaderboard(roomId, req.user.id);
    
    console.log(`✅ Leaderboard retrieved with ${leaderboard.length} entries`);
    res.json({
      success: true,
      data: {
        leaderboard,
        roomId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error getting leaderboard:', error.message);
    
    const errorContext = {
      roomId: req.params.roomId,
      userId: req.user.id,
      operation: 'get_leaderboard',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: 'Failed to retrieve leaderboard',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// GET /api/rooms/:roomId/xp/:userId - Get user's room XP
// Requirements: 20.1-20.5
router.get('/:roomId/xp/:userId', async (req, res) => {
  try {
    console.log('📊 Getting XP for user:', req.params.userId, 'in room:', req.params.roomId);
    const { roomId, userId } = req.params;
    
    // Verify the requesting user is a member of the room
    try {
      await RoomService.getRoomById(roomId, req.user.id);
    } catch (error) {
      if (error.message === 'Room not found') {
        return res.status(404).json({
          type: 'NOT_FOUND',
          message: 'Room not found',
          timestamp: new Date().toISOString()
        });
      }
      if (error.message.includes('not a member')) {
        return res.status(403).json({
          type: 'PERMISSION_ERROR',
          message: 'You are not a member of this room',
          timestamp: new Date().toISOString()
        });
      }
      throw error;
    }
    
    // Get user's room XP
    const totalXp = await RoomXpService.getUserRoomXp(roomId, userId);
    
    console.log(`✅ User XP retrieved: ${totalXp}`);
    res.json({
      success: true,
      data: {
        roomId,
        userId,
        totalXp,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error getting user XP:', error.message);
    
    const errorContext = {
      roomId: req.params.roomId,
      userId: req.params.userId,
      requestingUserId: req.user.id,
      operation: 'get_user_xp',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: 'Failed to retrieve user XP',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

export default router;
