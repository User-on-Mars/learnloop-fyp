import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { z } from 'zod';
import SkillMapTemplate from '../models/SkillMapTemplate.js';
import AdminAuditLog from '../models/AdminAuditLog.js';

const router = Router();

// Validation schemas
const sessionDefinitionSchema = z.object({
  title: z.string().trim().min(1).max(20),
  description: z.string().trim().max(200).default('')
});

const nodeDefinitionSchema = z.object({
  title: z.string().trim().min(1).max(20),
  description: z.string().trim().max(200).default(''),
  sessions: z.array(sessionDefinitionSchema).min(1).max(5)
});

const createTemplateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(20, 'Title must be 20 characters or less'),
  description: z.string().trim().max(150, 'Description must be 150 characters or less').default(''),
  icon: z.string().trim().min(1).max(30),
  goal: z.string().trim().min(1, 'Goal is required').max(30, 'Goal must be 30 characters or less'),
  nodes: z.array(nodeDefinitionSchema).min(2, 'At least 2 nodes required').max(15, 'At most 15 nodes allowed')
});

const updateTemplateSchema = createTemplateSchema.partial();

// Validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      console.log('🔍 Validating request body:', JSON.stringify(req.body, null, 2))
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      console.log('✅ Validation passed')
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Validation errors:', error.errors)
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
      
      console.error('❌ Validation error:', error)
      return res.status(500).json({
        type: 'SERVER_ERROR',
        message: 'Internal validation error'
      });
    }
  };
};

// GET /api/templates - Get all published templates (public for users)
router.get('/', requireAuth, async (req, res) => {
  try {
    console.log('📋 Getting published templates');
    const templates = await SkillMapTemplate.getPublishedTemplates();
    console.log(`✅ Found ${templates.length} published templates`);
    res.json({ templates });
  } catch (error) {
    console.error('❌ Error getting templates:', error.message);
    res.status(500).json({
      type: 'SERVER_ERROR',
      message: 'Failed to retrieve templates'
    });
  }
});

// GET /api/templates/admin/all - Get all templates (admin only)
router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('📋 Admin getting all templates');
    const templates = await SkillMapTemplate.getAllTemplates();
    console.log(`✅ Found ${templates.length} templates`);
    res.json({ templates });
  } catch (error) {
    console.error('❌ Error getting templates:', error.message);
    res.status(500).json({
      type: 'SERVER_ERROR',
      message: 'Failed to retrieve templates'
    });
  }
});

// GET /api/templates/:id - Get template by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    console.log('📖 Getting template:', req.params.id);
    const template = await SkillMapTemplate.getTemplateById(req.params.id);
    
    // Check if user is admin or if template is published
    const isAdmin = req.user.isAdmin;
    if (!template.isPublished && !isAdmin) {
      return res.status(403).json({
        type: 'FORBIDDEN',
        message: 'This template is not published'
      });
    }
    
    console.log('✅ Template retrieved');
    res.json({ template });
  } catch (error) {
    console.error('❌ Error getting template:', error.message);
    const statusCode = error.message === 'Template not found' ? 404 : 500;
    res.status(statusCode).json({
      type: error.message === 'Template not found' ? 'NOT_FOUND' : 'SERVER_ERROR',
      message: error.message
    });
  }
});

// POST /api/templates - Create new template (admin only)
router.post('/', requireAuth, requireAdmin, validateRequest(createTemplateSchema), async (req, res) => {
  try {
    console.log('🎯 Admin creating template:', req.body.title);
    
    const template = await SkillMapTemplate.create({
      ...req.body,
      createdBy: req.user.id,
      isPublished: false,
      isBuiltIn: false
    });
    
    // Log to audit trail
    await AdminAuditLog.create({
      adminId: req.user.id,
      adminEmail: req.user.email,
      action: 'template_created',
      targetType: 'template',
      targetId: template._id.toString(),
      details: {
        title: template.title,
        nodeCount: template.nodes.length
      }
    });
    
    console.log('✅ Template created:', template._id);
    res.status(201).json({ 
      template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating template:', error.message);
    res.status(500).json({
      type: 'SERVER_ERROR',
      message: error.message
    });
  }
});

// PUT /api/templates/:id - Update template (admin only)
router.put('/:id', requireAuth, requireAdmin, validateRequest(updateTemplateSchema), async (req, res) => {
  try {
    console.log('✏️ Admin updating template:', req.params.id);
    
    const template = await SkillMapTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        type: 'NOT_FOUND',
        message: 'Template not found'
      });
    }
    
    // Don't allow updating built-in templates
    if (template.isBuiltIn) {
      return res.status(403).json({
        type: 'FORBIDDEN',
        message: 'Cannot modify built-in templates'
      });
    }
    
    // Update fields
    Object.assign(template, req.body);
    await template.save();
    
    // Log to audit trail
    await AdminAuditLog.create({
      adminId: req.user.id,
      adminEmail: req.user.email,
      action: 'template_updated',
      targetType: 'template',
      targetId: template._id.toString(),
      details: {
        title: template.title,
        changes: Object.keys(req.body)
      }
    });
    
    console.log('✅ Template updated');
    res.json({ 
      template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating template:', error.message);
    res.status(500).json({
      type: 'SERVER_ERROR',
      message: error.message
    });
  }
});

// PATCH /api/templates/:id/publish - Publish/unpublish template (admin only)
router.patch('/:id/publish', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { isPublished } = req.body;
    
    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({
        type: 'VALIDATION_ERROR',
        message: 'isPublished must be a boolean'
      });
    }
    
    console.log(`${isPublished ? '📢' : '🔒'} Admin ${isPublished ? 'publishing' : 'unpublishing'} template:`, req.params.id);
    
    const template = await SkillMapTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        type: 'NOT_FOUND',
        message: 'Template not found'
      });
    }
    
    template.isPublished = isPublished;
    await template.save();
    
    // Log to audit trail
    await AdminAuditLog.create({
      adminId: req.user.id,
      adminEmail: req.user.email,
      action: isPublished ? 'template_published' : 'template_unpublished',
      targetType: 'template',
      targetId: template._id.toString(),
      details: {
        title: template.title
      }
    });
    
    console.log(`✅ Template ${isPublished ? 'published' : 'unpublished'}`);
    res.json({ 
      template,
      message: `Template ${isPublished ? 'published' : 'unpublished'} successfully`
    });
  } catch (error) {
    console.error('❌ Error publishing/unpublishing template:', error.message);
    res.status(500).json({
      type: 'SERVER_ERROR',
      message: error.message
    });
  }
});

// DELETE /api/templates/:id - Delete template (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🗑️ Admin deleting template:', req.params.id);
    
    const template = await SkillMapTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        type: 'NOT_FOUND',
        message: 'Template not found'
      });
    }
    
    // Don't allow deleting built-in templates
    if (template.isBuiltIn) {
      return res.status(403).json({
        type: 'FORBIDDEN',
        message: 'Cannot delete built-in templates'
      });
    }
    
    const templateTitle = template.title;
    await template.deleteOne();
    
    // Log to audit trail
    await AdminAuditLog.create({
      adminId: req.user.id,
      adminEmail: req.user.email,
      action: 'template_deleted',
      targetType: 'template',
      targetId: req.params.id,
      details: {
        title: templateTitle
      }
    });
    
    console.log('✅ Template deleted');
    res.json({ 
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting template:', error.message);
    res.status(500).json({
      type: 'SERVER_ERROR',
      message: error.message
    });
  }
});

export default router;
