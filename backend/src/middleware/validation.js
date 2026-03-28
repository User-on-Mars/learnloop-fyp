import { z } from 'zod';

/**
 * Comprehensive input validation middleware for node system
 * Implements Requirements 6.1, 6.2, 10.3
 */

// Simple XSS sanitization function
function sanitizeHTML(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Reflection data validation schema (1-5 scales, 500 char limit)
export const reflectionDataSchema = z.object({
  understanding: z.number()
    .int('Understanding must be an integer')
    .min(1, 'Understanding must be at least 1')
    .max(5, 'Understanding must be at most 5'),
  difficulty: z.number()
    .int('Difficulty must be an integer')
    .min(1, 'Difficulty must be at least 1')
    .max(5, 'Difficulty must be at most 5'),
  notes: z.string()
    .max(500, 'Reflection notes must be 500 characters or less')
    .optional()
    .default('')
    .transform(val => sanitizeHTML(val)),
  completionConfidence: z.number()
    .int('Completion confidence must be an integer')
    .min(1, 'Completion confidence must be at least 1')
    .max(5, 'Completion confidence must be at most 5')
    .optional()
    .default(3),
  wouldRecommend: z.boolean().optional().default(true),
  tags: z.array(z.string().max(50).transform(sanitizeHTML)).max(10).optional().default([])
});

// Node data validation schema with sanitization
export const nodeDataSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Node title is required')
    .max(100, 'Node title must be 100 characters or less')
    .transform(val => sanitizeHTML(val)),
  description: z.string()
    .trim()
    .max(500, 'Node description must be 500 characters or less')
    .optional()
    .default('')
    .transform(val => val ? sanitizeHTML(val) : ''),
  nodeType: z.enum(['start', 'content', 'goal']).optional().default('content'),
  sequenceOrder: z.number()
    .int('Sequence order must be an integer')
    .min(0, 'Sequence order must be non-negative')
    .optional(),
  position: z.object({
    x: z.number().finite('X position must be a finite number'),
    y: z.number().finite('Y position must be a finite number'),
    gridX: z.number().int().optional(),
    gridY: z.number().int().optional()
  }).optional().default({ x: 0, y: 0 }),
  spriteConfig: z.object({
    baseSprite: z.string().max(100).optional(),
    scale: z.number().min(0.1).max(5).optional().default(1)
  }).optional()
});

// Session data validation
export const sessionDataSchema = z.object({
  nodeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid node ID format'),
  progress: z.number()
    .min(0, 'Progress must be at least 0')
    .max(100, 'Progress must be at most 100')
    .optional()
    .default(0),
  action: z.string()
    .max(100, 'Action description too long')
    .optional()
    .transform(val => val ? sanitizeHTML(val) : undefined),
  metadata: z.record(z.any()).optional()
});

/**
 * Generic validation middleware factory
 */
export function validateRequest(schema, target = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = target === 'body' ? req.body : 
                           target === 'params' ? req.params : 
                           target === 'query' ? req.query : req.body;

      const validatedData = schema.parse(dataToValidate);
      
      // Replace the original data with validated and sanitized data
      if (target === 'body') {
        req.body = validatedData;
      } else if (target === 'params') {
        req.params = validatedData;
      } else if (target === 'query') {
        req.query = validatedData;
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(422).json({
          message: 'Validation failed',
          errors: formattedErrors
        });
      }
      
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        message: 'Internal validation error'
      });
    }
  };
}

/**
 * Sanitize text inputs to prevent XSS
 */
export function sanitizeInput(input) {
  return sanitizeHTML(input);
}

/**
 * Validate numeric ranges for reflection data
 */
export function validateReflectionRanges(data) {
  const errors = [];
  
  if (data.understanding !== undefined) {
    if (!Number.isInteger(data.understanding) || data.understanding < 1 || data.understanding > 5) {
      errors.push({ field: 'understanding', message: 'Understanding must be an integer between 1 and 5' });
    }
  }
  
  if (data.difficulty !== undefined) {
    if (!Number.isInteger(data.difficulty) || data.difficulty < 1 || data.difficulty > 5) {
      errors.push({ field: 'difficulty', message: 'Difficulty must be an integer between 1 and 5' });
    }
  }
  
  if (data.completionConfidence !== undefined) {
    if (!Number.isInteger(data.completionConfidence) || data.completionConfidence < 1 || data.completionConfidence > 5) {
      errors.push({ field: 'completionConfidence', message: 'Completion confidence must be an integer between 1 and 5' });
    }
  }
  
  if (data.notes && data.notes.length > 500) {
    errors.push({ field: 'notes', message: 'Reflection notes must be 500 characters or less' });
  }
  
  return errors;
}

/**
 * Validate node data with comprehensive checks
 */
export function validateNodeData(data) {
  const errors = [];
  
  // Required fields validation
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Node title is required' });
  } else if (data.title.length > 100) {
    errors.push({ field: 'title', message: 'Node title must be 100 characters or less' });
  }
  
  // Optional fields validation
  if (data.description && data.description.length > 500) {
    errors.push({ field: 'description', message: 'Node description must be 500 characters or less' });
  }
  
  if (data.nodeType && !['start', 'content', 'goal'].includes(data.nodeType)) {
    errors.push({ field: 'nodeType', message: 'Node type must be start, content, or goal' });
  }
  
  if (data.sequenceOrder !== undefined) {
    if (!Number.isInteger(data.sequenceOrder) || data.sequenceOrder < 0) {
      errors.push({ field: 'sequenceOrder', message: 'Sequence order must be a non-negative integer' });
    }
  }
  
  // Position validation
  if (data.position) {
    if (typeof data.position.x !== 'number' || !isFinite(data.position.x)) {
      errors.push({ field: 'position.x', message: 'X position must be a finite number' });
    }
    if (typeof data.position.y !== 'number' || !isFinite(data.position.y)) {
      errors.push({ field: 'position.y', message: 'Y position must be a finite number' });
    }
  }
  
  return errors;
}

/**
 * Validate skill map configuration limits
 */
export function validateSkillMapLimits(config, existingNodeCount = 0) {
  const errors = [];
  
  if (config.nodeLimit !== undefined) {
    if (!Number.isInteger(config.nodeLimit) || config.nodeLimit < 2 || config.nodeLimit > 10) {
      errors.push({ field: 'nodeLimit', message: 'Node limit must be between 2 and 10' });
    }
    
    if (existingNodeCount > config.nodeLimit) {
      errors.push({ 
        field: 'nodeLimit', 
        message: `Cannot set limit to ${config.nodeLimit} when ${existingNodeCount} nodes already exist` 
      });
    }
  }
  
  if (config.minimumSessionTime !== undefined) {
    if (config.minimumSessionTime < 0 || config.minimumSessionTime > 14400) {
      errors.push({ field: 'minimumSessionTime', message: 'Minimum session time must be between 0 and 14400 seconds (4 hours)' });
    }
  }
  
  return errors;
}