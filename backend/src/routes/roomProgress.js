import express from 'express';
import RoomNodeProgressService from '../services/RoomNodeProgressService.js';
import NodeService from '../services/NodeService.js';
import { requireAuth } from '../middleware/auth.js';
import ErrorLoggingService from '../services/ErrorLoggingService.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

/**
 * GET /api/rooms/:roomId/progress/:skillMapId - Get room skill map progress for user
 * Requirements: 18.1-18.4 - Room Skill Map Progress Isolation
 */
router.get('/:roomId/progress/:skillMapId', async (req, res) => {
  try {
    const { roomId, skillMapId } = req.params;
    const userId = req.user.id;
    
    console.log(`🎯 Getting room progress for user ${userId} in room ${roomId} for skill map ${skillMapId}`);
    
    const progress = await RoomNodeProgressService.getRoomSkillMapProgress(
      roomId, 
      userId, 
      skillMapId
    );
    
    console.log(`✅ Found ${progress.length} progress records`);
    res.json(progress);
  } catch (error) {
    console.error('❌ Error getting room progress:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      skillMapId: req.params.skillMapId,
      operation: 'get_room_progress',
      timestamp: new Date().toISOString()
    };
    
    await ErrorLoggingService.logError(error, errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message.includes('not found') || error.message.includes('NotFound')) {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('Permission')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorType = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

/**
 * GET /api/rooms/:roomId/progress/:skillMapId/stats - Get room skill map completion stats
 * Requirements: 18.1-18.4 - Room Skill Map Progress Isolation
 */
router.get('/:roomId/progress/:skillMapId/stats', async (req, res) => {
  try {
    const { roomId, skillMapId } = req.params;
    const userId = req.user.id;
    
    console.log(`📊 Getting room progress stats for user ${userId} in room ${roomId} for skill map ${skillMapId}`);
    
    const stats = await RoomNodeProgressService.getRoomSkillMapStats(
      roomId, 
      userId, 
      skillMapId
    );
    
    console.log(`✅ Progress stats:`, stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error getting room progress stats:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      skillMapId: req.params.skillMapId,
      operation: 'get_room_progress_stats',
      timestamp: new Date().toISOString()
    };
    
    await ErrorLoggingService.logError(error, errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message.includes('not found') || error.message.includes('NotFound')) {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('Permission')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorType = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

/**
 * PATCH /api/rooms/:roomId/progress/nodes/:nodeId - Update room node status
 * Requirements: 18.1-18.4 - Room Skill Map Progress Isolation
 */
router.patch('/:roomId/progress/nodes/:nodeId', async (req, res) => {
  try {
    const { roomId, nodeId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    if (!status) {
      return res.status(400).json({
        type: 'VALIDATION_ERROR',
        message: 'status is required',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🔄 Updating room node ${nodeId} status to ${status} for user ${userId} in room ${roomId}`);
    
    // Use NodeService with roomId to ensure room-specific progress tracking
    const result = await NodeService.updateNodeStatus(nodeId, status, userId, roomId);
    
    console.log(`✅ Node status updated successfully`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error updating room node status:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      nodeId: req.params.nodeId,
      status: req.body.status,
      operation: 'update_room_node_status',
      timestamp: new Date().toISOString()
    };
    
    await ErrorLoggingService.logError(error, errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message.includes('not found') || error.message.includes('NotFound')) {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('Permission')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.message.includes('transition') || error.message.includes('StateTransition')) {
      statusCode = 400;
      errorType = 'INVALID_TRANSITION';
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorType = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorType = 'INVALID_ID';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

export default router;