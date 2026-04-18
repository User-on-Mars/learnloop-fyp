import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import InvitationService from '../services/InvitationService.js';

const router = Router();

// All invitation routes require authentication
router.use(requireAuth);

// Validation schemas
const createInvitationSchema = z.object({
  invitedEmail: z.string()
    .trim()
    .email('Invalid email address')
    .min(1, 'Email is required')
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

// POST /api/rooms/:roomId/invitations - Create invitation (owner only)
// Requirements: 5.1-5.8, 6.1-6.4, 7.1-7.2
router.post('/rooms/:roomId/invitations', validateRequest(createInvitationSchema), async (req, res) => {
  try {
    console.log('📧 Creating invitation for room:', req.params.roomId, 'by user:', req.user.id);
    const { invitedEmail } = req.body;
    
    const invitation = await InvitationService.createInvitation(
      req.params.roomId,
      req.user.id,
      invitedEmail
    );
    
    console.log('✅ Invitation created:', invitation._id);
    res.status(201).json({
      invitation,
      message: 'Invitation sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error creating invitation:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      invitedEmail: req.body.invitedEmail,
      operation: 'create_invitation',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message.includes('Invalid email') || error.message.includes('format')) {
      statusCode = 400;
      errorType = 'VALIDATION_ERROR';
    } else if (error.message === 'No account found with this email') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('owner')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (
      error.message.includes('already sent') ||
      error.message.includes('already a member') ||
      error.message.includes('cannot invite yourself') ||
      error.message.includes('Room is full')
    ) {
      statusCode = 409;
      errorType = 'CONFLICT_ERROR';
    } else if (error.message === 'Room not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
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

// GET /api/invitations - Get user's pending invitations
// Requirements: 8.1-8.2
router.get('/invitations', async (req, res) => {
  try {
    console.log('📬 Getting invitations for user:', req.user.id);
    
    const invitations = await InvitationService.getUserInvitations(req.user.id);
    
    console.log(`✅ Found ${invitations.length} pending invitations`);
    res.json({
      invitations,
      count: invitations.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting user invitations:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      operation: 'get_user_invitations',
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
      message: 'Failed to retrieve invitations',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// GET /api/notifications - Get recent notifications (last 10 invitations of all statuses)
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await InvitationService.getRecentNotifications(req.user.id);
    
    const unreadCount = notifications.filter(n => n.status === 'pending' && new Date(n.expiresAt) > new Date()).length;
    
    res.json({
      notifications,
      unreadCount,
      count: notifications.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting notifications:', error.message);
    res.status(500).json({
      type: 'SERVER_ERROR',
      message: 'Failed to retrieve notifications',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/rooms/:roomId/invitations - Get room's invitations (owner only)
router.get('/rooms/:roomId/invitations', async (req, res) => {
  try {
    console.log('📋 Getting invitations for room:', req.params.roomId, 'by user:', req.user.id);
    
    const invitations = await InvitationService.getRoomInvitations(
      req.params.roomId,
      req.user.id
    );
    
    console.log(`✅ Found ${invitations.length} invitations for room`);
    res.json({
      invitations,
      count: invitations.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting room invitations:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      roomId: req.params.roomId,
      operation: 'get_room_invitations',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Room not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('view invitations')) {
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

// PATCH /api/invitations/:invitationId/accept - Accept invitation
// Requirements: 8.1-8.8
router.patch('/invitations/:invitationId/accept', async (req, res) => {
  try {
    console.log('✅ User:', req.user.id, 'accepting invitation:', req.params.invitationId);
    
    const result = await InvitationService.acceptInvitation(
      req.params.invitationId,
      req.user.id
    );
    
    console.log('✅ Invitation accepted, user added to room');
    res.json({
      invitation: result.invitation,
      membership: result.membership,
      message: 'Invitation accepted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error accepting invitation:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      invitationId: req.params.invitationId,
      operation: 'accept_invitation',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'RoomInvitation not found' || error.message === 'Room not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('accept')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (
      error.message.includes('Invitation is') ||
      error.message.includes('expired') ||
      error.message.includes('Room is full')
    ) {
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

// PATCH /api/invitations/:invitationId/decline - Decline invitation
// Requirements: 9.1-9.4
router.patch('/invitations/:invitationId/decline', async (req, res) => {
  try {
    console.log('❌ User:', req.user.id, 'declining invitation:', req.params.invitationId);
    
    const invitation = await InvitationService.declineInvitation(
      req.params.invitationId,
      req.user.id
    );
    
    console.log('✅ Invitation declined');
    res.json({
      invitation,
      message: 'Invitation declined',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error declining invitation:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      invitationId: req.params.invitationId,
      operation: 'decline_invitation',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'RoomInvitation not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('permission') || error.message.includes('decline')) {
      statusCode = 403;
      errorType = 'PERMISSION_ERROR';
    } else if (error.message.includes('Invitation is already')) {
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

export default router;
