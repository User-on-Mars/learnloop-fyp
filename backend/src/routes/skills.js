import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { checkNodeLimit } from '../middleware/subscription.js';
import SubscriptionService from '../services/SubscriptionService.js';
import { z } from 'zod';
import SkillService from '../services/SkillService.js';
import NodeService from '../services/NodeService.js';

const router = Router();

// All skill routes require authentication
router.use(requireAuth);

// Validation schemas
const createSkillSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Skill name is required')
    .max(30, 'Skill name must be 30 characters or less'),
  nodeCount: z.number()
    .int('Node count must be an integer')
    .min(0, 'Node count must be at least 0')
    .max(15, 'Node count must be at most 15')
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

// Validation schema for template application
const templateSessionSchema = z.object({
  title: z.string().trim().min(1).max(20),
  description: z.string().trim().max(200).default('')
});

const templateNodeSchema = z.object({
  title: z.string().trim().min(1).max(20),
  description: z.string().trim().max(200).default(''),
  sessions: z.array(templateSessionSchema).min(1).max(5)
});

const createFromTemplateSchema = z.object({
  templateId: z.string().optional(), // Optional template ID to track usage
  template: z.object({
    title: z.string().trim().min(1, 'Title is required').max(20, 'Title must be 20 characters or less'),
    description: z.string().trim().max(150, 'Description must be 150 characters or less').default(''),
    icon: z.string().trim().min(1).max(30),
    color: z.string().trim().max(20).optional(),
    goal: z.string().trim().min(1, 'Goal is required').max(30, 'Goal must be 30 characters or less'),
    nodes: z.array(templateNodeSchema).min(2, 'At least 2 nodes required').max(15, 'At most 15 nodes allowed')
  })
});

// POST /api/skills/maps/from-template - Create skill map from template
router.post('/maps/from-template', validateRequest(createFromTemplateSchema), async (req, res) => {
  try {
    const { template, templateId } = req.body;
    const result = await SkillService.createSkillMapFromTemplate(req.user.id, template, templateId);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error creating skill map from template:', error.message);

    let statusCode = 500;
    let errorType = 'SERVER_ERROR';

    if (error.message.includes('must be') || error.message.includes('required')) {
      statusCode = 400;
      errorType = 'VALIDATION_ERROR';
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

// POST /api/skills - Create skill with nodes
router.post('/', validateRequest(createSkillSchema), async (req, res) => {
  try {
    console.log('🎯 Creating skill for user:', req.user.id);
    const { name, nodeCount } = req.body;
    
    const result = await SkillService.createSkill(req.user.id, name, nodeCount);
    
    console.log('✅ Skill created:', result.skill._id);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error creating skill:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      operation: 'create_skill',
      requestBody: req.body,
      timestamp: new Date().toISOString()
    };
    
    // Log error with context for monitoring
    console.error('Error context:', errorContext);
    
    // Determine error type and status code
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.message.includes('must be') || error.message.includes('required')) {
      statusCode = 400;
      errorType = 'VALIDATION_ERROR';
    } else if (error.message.includes('duplicate') || error.code === 11000) {
      statusCode = 409;
      errorType = 'DUPLICATE_ERROR';
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

// GET /api/skills - List user skills with progress
router.get('/', async (req, res) => {
  try {
    console.log('📋 Getting skills for user:', req.user.id);
    
    const skills = await SkillService.getUserSkills(req.user.id);
    
    // Add locked flag for skills beyond the free tier limit
    const { tier, limits } = await SubscriptionService.getLimits(req.user.id);
    const maxSkillMaps = limits.maxSkillMaps;
    const skillsWithAccess = skills.map((skill, index) => ({
      ...skill,
      locked: index >= maxSkillMaps
    }));
    
    console.log(`✅ Found ${skills.length} skills (tier: ${tier}, limit: ${maxSkillMaps})`);
    res.json({ skills: skillsWithAccess });
  } catch (error) {
    console.error('❌ Error getting skills:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      operation: 'get_skills',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    // Determine error type
    let statusCode = 500;
    let errorType = 'SERVER_ERROR';
    
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      statusCode = 503;
      errorType = 'DATABASE_ERROR';
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: 'Failed to retrieve skills',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// GET /api/skills/:id/nodes - Get nodes for a skill
router.get('/:id/nodes', async (req, res) => {
  try {
    console.log('📖 Getting nodes for skill:', req.params.id, 'for user:', req.user.id);
    
    const nodes = await NodeService.getSkillNodes(req.params.id, req.user.id);
    
    console.log('✅ Retrieved', nodes.length, 'nodes');
    res.json({ nodes });
  } catch (error) {
    console.error('❌ Error getting skill nodes:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      skillId: req.params.id,
      operation: 'get_skill_nodes',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = error.statusCode || 500;
    let errorType = error.code || 'SERVER_ERROR';
    
    if (!error.statusCode || error.statusCode === 500) {
      if (error.name === 'CastError') {
        statusCode = 400;
        errorType = 'INVALID_ID';
      } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        statusCode = 503;
        errorType = 'DATABASE_ERROR';
      }
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// POST /api/skills/:id/nodes - Create a new node for a skill
router.post('/:id/nodes', checkNodeLimit, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ type: 'VALIDATION_ERROR', message: 'Node title is required' });
    if (title.trim().length > 16) return res.status(400).json({ type: 'VALIDATION_ERROR', message: 'Node title must be 16 characters or less' });
    
    const node = await NodeService.createNode(req.params.id, req.user.id, { title: title.trim(), description: description || '' });
    res.status(201).json({ node });
  } catch (error) {
    console.error('❌ Error creating node:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : error.message.includes('Cannot add') ? 400 : 500;
    res.status(statusCode).json({ type: 'ERROR', message: error.message });
  }
});

// GET /api/skills/:id - Get skill with all nodes (OPTIMIZED)
router.get('/:id', async (req, res) => {
  try {
    console.log('📖 Getting skill:', req.params.id, 'for user:', req.user.id);
    
    // Check if this skill map is beyond the user's tier limit
    const allSkills = await SkillService.getUserSkills(req.user.id);
    const { limits } = await SubscriptionService.getLimits(req.user.id);
    const skillIndex = allSkills.findIndex(s => s._id.toString() === req.params.id);
    
    if (skillIndex >= 0 && skillIndex >= limits.maxSkillMaps) {
      return res.status(403).json({
        type: 'SUBSCRIPTION_REQUIRED',
        message: 'This skill map is locked. Upgrade to Pro to access all your skill maps.',
        locked: true
      });
    }
    
    // Single optimized query - fetch skill and nodes together
    const [skill, nodes] = await Promise.all([
      SkillService.getSkillById(req.params.id, req.user.id),
      NodeService.getSkillNodes(req.params.id, req.user.id)
    ]);
    
    // Calculate completion percentage
    const completedNodes = nodes.filter(n => n.status === 'Completed').length;
    const completionPercentage = nodes.length > 0 
      ? Math.round((completedNodes / nodes.length) * 100) 
      : 0;
    
    console.log('✅ Skill retrieved with', nodes.length, 'nodes in', 'optimized query');
    res.json({
      skill: {
        ...skill,
        completionPercentage
      },
      nodes
    });
  } catch (error) {
    console.error('❌ Error getting skill:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      skillId: req.params.id,
      operation: 'get_skill_details',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    // Determine error type
    let statusCode = error.statusCode || 500;
    let errorType = error.code || 'SERVER_ERROR';
    
    if (!error.statusCode || error.statusCode === 500) {
      if (error.name === 'CastError') {
        statusCode = 400;
        errorType = 'INVALID_ID';
      } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        statusCode = 503;
        errorType = 'DATABASE_ERROR';
      }
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// PATCH /api/skills/:id - Update skill details
const updateSkillSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Skill name is required')
    .max(100, 'Skill name must be 100 characters or less')
    .optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  goal: z.string().max(200, 'Goal must be 200 characters or less').optional(),
  icon: z.string().max(30, 'Icon must be 30 characters or less').optional(),
  color: z.string().max(20, 'Color must be 20 characters or less').optional()
});

router.patch('/:id', validateRequest(updateSkillSchema), async (req, res) => {
  try {
    console.log('✏️ Updating skill:', req.params.id, 'for user:', req.user.id);
    
    const updatedSkill = await SkillService.updateSkill(req.params.id, req.user.id, req.body);
    
    console.log('✅ Skill updated');
    res.json({ 
      skill: updatedSkill,
      message: 'Skill updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error updating skill:', error.message);
    
    const errorContext = {
      userId: req.user.id,
      skillId: req.params.id,
      operation: 'update_skill',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    let statusCode = error.statusCode || 500;
    let errorType = error.code || 'SERVER_ERROR';
    
    if (!error.statusCode || error.statusCode === 500) {
      if (error.name === 'CastError') {
        statusCode = 400;
        errorType = 'INVALID_ID';
      } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        statusCode = 503;
        errorType = 'DATABASE_ERROR';
      }
    }
    
    res.status(statusCode).json({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// DELETE /api/skills/:id - Delete skill with cascade
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ Deleting skill:', req.params.id, 'for user:', req.user.id);
    
    await SkillService.deleteSkill(req.params.id, req.user.id);
    
    console.log('✅ Skill deleted');
    res.json({ 
      message: 'Skill deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error deleting skill:', error.message);
    
    // Enhanced error logging with context
    const errorContext = {
      userId: req.user.id,
      skillId: req.params.id,
      operation: 'delete_skill',
      timestamp: new Date().toISOString()
    };
    
    console.error('Error context:', errorContext);
    
    // Determine error type
    let statusCode = error.statusCode || 500;
    let errorType = error.code || 'SERVER_ERROR';
    
    if (!error.statusCode || error.statusCode === 500) {
      if (error.name === 'CastError') {
        statusCode = 400;
        errorType = 'INVALID_ID';
      } else if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        statusCode = 503;
        errorType = 'DATABASE_ERROR';
      }
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
