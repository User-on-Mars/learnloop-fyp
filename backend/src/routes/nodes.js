import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import NodeService from '../services/NodeService.js';
import SessionLinkingService from '../services/SessionLinkingService.js';
import Node from '../models/Node.js';

const router = Router();

// All node routes require authentication
router.use(requireAuth);

// Validation schemas
const updateStatusSchema = z.object({
  status: z.enum(['Locked', 'Unlocked', 'In_Progress', 'Completed'], {
    errorMap: () => ({ message: 'Status must be one of: Locked, Unlocked, In_Progress, Completed' })
  })
});

const updateContentSchema = z.object({
  title: z.string()
    .max(200, 'Node title must not exceed 200 characters')
    .optional(),
  description: z.string()
    .max(2000, 'Node description must not exceed 2000 characters')
    .optional()
}).refine(data => data.title !== undefined || data.description !== undefined, {
  message: 'At least one of title or description must be provided'
});

const createNodeSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Node title is required')
    .max(200, 'Node title must not exceed 200 characters'),
  description: z.string()
    .max(2000, 'Node description must not exceed 2000 characters')
    .optional()
    .default('')
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

// GET /api/skills/:skillId/nodes - Get progression path
router.get('/skills/:skillId/nodes', async (req, res) => {
  try {
    console.log('📋 Getting nodes for skill:', req.params.skillId, 'user:', req.user.id);
    
    const nodes = await NodeService.getSkillNodes(req.params.skillId, req.user.id);
    
    console.log(`✅ Found ${nodes.length} nodes`);
    res.json({ nodes });
  } catch (error) {
    console.error('❌ Error getting nodes:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      skillId: req.params.skillId,
      operation: 'get_skill_nodes',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    // Determine error type
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
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// POST /api/skills/:skillId/nodes - Create a new node
router.post('/skills/:skillId/nodes', validateRequest(createNodeSchema), async (req, res) => {
  try {
    console.log('➕ Creating node for skill:', req.params.skillId, 'user:', req.user.id);
    
    const node = await NodeService.createNode(
      req.params.skillId,
      req.user.id,
      {
        title: req.body.title,
        description: req.body.description
      }
    );
    
    console.log('✅ Node created:', node._id);
    res.status(201).json({ node });
  } catch (error) {
    console.error('❌ Error creating node:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      skillId: req.params.skillId,
      nodeData: req.body,
      operation: 'create_node',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    // Determine error type
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Skill not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('Cannot add more than')) {
      statusCode = 400;
      errorType = 'LIMIT_EXCEEDED';
    } else if (error.message.includes('Permission denied')) {
      statusCode = 403;
      errorType = 'PERMISSION_DENIED';
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

// PATCH /api/nodes/:id/status - Update node status
router.patch('/:id/status', validateRequest(updateStatusSchema), async (req, res) => {
  try {
    console.log('🔄 Updating node status:', req.params.id, 'to', req.body.status);
    
    const result = await NodeService.updateNodeStatus(
      req.params.id,
      req.body.status,
      req.user.id
    );
    
    console.log('✅ Node status updated');
    res.json(result);
  } catch (error) {
    console.error('❌ Error updating node status:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      nodeId: req.params.id,
      requestedStatus: req.body.status,
      operation: 'update_node_status',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    // Determine error type
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Node not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('Cannot transition')) {
      statusCode = 400;
      errorType = 'INVALID_TRANSITION';
    } else if (error.message.includes('Invalid status')) {
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

// PATCH /api/nodes/:id/content - Update node title/description
router.patch('/:id/content', validateRequest(updateContentSchema), async (req, res) => {
  try {
    console.log('✏️ Updating node content:', req.params.id);
    
    const node = await NodeService.updateNodeContent(
      req.params.id,
      req.body,
      req.user.id
    );
    
    console.log('✅ Node content updated');
    res.json({ node });
  } catch (error) {
    console.error('❌ Error updating node content:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      nodeId: req.params.id,
      updates: req.body,
      operation: 'update_node_content',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    // Determine error type
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Node not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('Cannot edit locked nodes') || 
               error.message.includes('must not exceed') ||
               error.message.includes('must be a string')) {
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

// DELETE /api/nodes/:id - Delete node with validation
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ Deleting node:', req.params.id);
    
    await NodeService.deleteNode(req.params.id, req.user.id);
    
    console.log('✅ Node deleted');
    res.json({ 
      message: 'Node deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error deleting node:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      nodeId: req.params.id,
      operation: 'delete_node',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    // Determine error type
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Node not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (
      error.message.includes('Cannot delete') ||
      error.message.includes('must have at least') ||
      error.message.includes('linked sessions')
    ) {
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

// GET /api/nodes/:id/details - Get node with linked content
router.get('/:id/details', async (req, res) => {
  try {
    console.log('📖 Getting node details:', req.params.id);
    
    const details = await NodeService.getNodeDetails(req.params.id, req.user.id);
    
    console.log('✅ Node details retrieved');
    res.json(details);
  } catch (error) {
    console.error('❌ Error getting node details:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      nodeId: req.params.id,
      operation: 'get_node_details',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    // Determine error type
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Node not found') {
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

// POST /api/nodes/:id/sessions - Start session from node
router.post('/:id/sessions', async (req, res) => {
  try {
    console.log('🎯 Starting session for node:', req.params.id);
    
    const result = await SessionLinkingService.createSessionForNode(
      req.params.id,
      req.user.id
    );
    
    console.log('✅ Session started:', result.session._id);
    res.status(201).json({
      sessionId: result.session._id,
      nodeId: req.params.id,
      startTime: result.session.startTime,
      status: result.session.status,
      nodeStatusUpdated: result.nodeStatusUpdated
    });
  } catch (error) {
    console.error('❌ Error starting session:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      nodeId: req.params.id,
      operation: 'start_session_from_node',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    // Determine error type
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message === 'Node not found') {
      statusCode = 404;
      errorType = 'NOT_FOUND';
    } else if (error.message.includes('Cannot start session for locked node') ||
               error.message.includes('already has an active session')) {
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

// POST /api/nodes/:id/complete-template-session - Complete a template session by index
router.post('/:id/complete-template-session', async (req, res) => {
  try {
    const { sessionIndex } = req.body;
    if (typeof sessionIndex !== 'number' || sessionIndex < 0) {
      return res.status(400).json({ type: 'VALIDATION_ERROR', message: 'sessionIndex must be a non-negative number' });
    }
    const node = await Node.findOne({ _id: req.params.id, userId: req.user.id });
    if (!node) return res.status(404).json({ type: 'NOT_FOUND', message: 'Node not found' });
    if (!node.sessionDefinitions || sessionIndex >= node.sessionDefinitions.length) {
      return res.status(400).json({ type: 'VALIDATION_ERROR', message: 'Invalid session index' });
    }
    const completed = node.completedSessions || [];
    if (completed.includes(sessionIndex)) {
      return res.status(400).json({ type: 'VALIDATION_ERROR', message: 'Session already completed' });
    }
    completed.push(sessionIndex);
    node.completedSessions = completed;
    // If all sessions completed, mark node as Completed and unlock next
    let nextNode = null;
    if (completed.length === node.sessionDefinitions.length) {
      node.status = 'Completed';
      nextNode = await Node.findOne({ skillId: node.skillId, userId: req.user.id, order: node.order + 1 });
      if (nextNode && nextNode.status === 'Locked') {
        nextNode.status = 'Unlocked';
        await nextNode.save();
      }
    } else if (node.status === 'Unlocked') {
      node.status = 'In_Progress';
    }
    await node.save();
    res.json({ node: node.toObject(), nextNode: nextNode ? nextNode.toObject() : null });
  } catch (error) {
    console.error('Error completing template session:', error.message);
    res.status(500).json({ type: 'SERVER_ERROR', message: error.message });
  }
});

export default router;
