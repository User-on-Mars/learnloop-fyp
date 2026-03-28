import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

/**
 * Security middleware for node system
 * Implements Requirements 9.5, 6.2 - Rate limiting and XSS protection
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

// Rate limiting configurations for different endpoint types
export const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000) || 900
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    ...options
  };

  return rateLimit(defaultOptions);
};

// Strict rate limiting for authentication endpoints
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  },
  skipSuccessfulRequests: true // Don't count successful requests
});

// Moderate rate limiting for node operations
export const nodeOperationsRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 node operations per 5 minutes
  message: {
    error: 'Too many node operations, please slow down.',
    retryAfter: 300
  }
});

// Strict rate limiting for session operations
export const sessionRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Limit each IP to 20 session operations per 10 minutes
  message: {
    error: 'Too many session operations, please try again later.',
    retryAfter: 600
  }
});

// General API rate limiting
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (increased for development)
  message: {
    error: 'Rate limit exceeded, please try again later.',
    retryAfter: 900
  }
});

/**
 * Helmet configuration for security headers
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Request sanitization middleware to prevent XSS attacks
 */
export const sanitizeRequest = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Request sanitization error:', error);
    return res.status(400).json({
      message: 'Invalid request data',
      error: 'Request contains potentially harmful content'
    });
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeHTML(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both key and value
      const sanitizedKey = sanitizeHTML(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Input validation chains for common operations
 */
export const validateReflectionInput = [
  body('understanding')
    .isInt({ min: 1, max: 5 })
    .withMessage('Understanding must be an integer between 1 and 5'),
  body('difficulty')
    .isInt({ min: 1, max: 5 })
    .withMessage('Difficulty must be an integer between 1 and 5'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be 500 characters or less')
    .customSanitizer(value => sanitizeHTML(value || '')),
  body('completionConfidence')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Completion confidence must be an integer between 1 and 5'),
  body('wouldRecommend')
    .optional()
    .isBoolean()
    .withMessage('Would recommend must be a boolean'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items')
    .custom((tags) => {
      if (tags && Array.isArray(tags)) {
        return tags.every(tag => typeof tag === 'string' && tag.length <= 50);
      }
      return true;
    })
    .withMessage('Each tag must be a string with maximum 50 characters')
];

export const validateNodeInput = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters')
    .customSanitizer(value => sanitizeHTML(value)),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less')
    .customSanitizer(value => sanitizeHTML(value || '')),
  body('nodeType')
    .optional()
    .isIn(['start', 'content', 'goal'])
    .withMessage('Node type must be start, content, or goal'),
  body('sequenceOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sequence order must be a non-negative integer'),
  body('position.x')
    .optional()
    .isFloat()
    .withMessage('X position must be a number'),
  body('position.y')
    .optional()
    .isFloat()
    .withMessage('Y position must be a number')
];

export const validateSkillMapInput = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Skill map name must be between 1 and 100 characters')
    .customSanitizer(value => sanitizeHTML(value)),
  body('nodeLimit')
    .optional()
    .isInt({ min: 2, max: 10 })
    .withMessage('Node limit must be between 2 and 10'),
  body('layoutType')
    .optional()
    .isIn(['horizontal', 'vertical', 'branching'])
    .withMessage('Layout type must be horizontal, vertical, or branching'),
  body('unlockMode')
    .optional()
    .isIn(['strict_linear', 'checkpoint_based'])
    .withMessage('Unlock mode must be strict_linear or checkpoint_based'),
  body('requireReflection')
    .optional()
    .isBoolean()
    .withMessage('Require reflection must be a boolean'),
  body('minimumSessionTime')
    .optional()
    .isInt({ min: 0, max: 14400 })
    .withMessage('Minimum session time must be between 0 and 14400 seconds')
];

/**
 * Validation result handler
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Audit logging middleware for security events
 */
export const auditLogger = (eventType) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Log the request
    const logData = {
      timestamp: new Date().toISOString(),
      eventType,
      userId: req.user?.id || 'anonymous',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl,
      body: req.method === 'POST' || req.method === 'PUT' ? 
        sanitizeForLogging(req.body) : undefined
    };

    console.log(`🔒 AUDIT [${eventType}]:`, JSON.stringify(logData, null, 2));

    // Capture response details
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      console.log(`🔒 AUDIT [${eventType}] RESPONSE:`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        success: res.statusCode < 400
      });
      
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Sanitize sensitive data for logging
 */
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * IP-based rate limiting with user context
 */
export const createUserAwareRateLimit = (options = {}) => {
  const ipLimiter = createRateLimiter(options);
  
  return (req, res, next) => {
    // Apply IP-based rate limiting first
    ipLimiter(req, res, (err) => {
      if (err) return next(err);
      
      // Additional user-based rate limiting if authenticated
      if (req.user?.id) {
        // Could implement user-specific rate limiting here
        // For now, just log the user activity
        console.log(`🔒 User activity: ${req.user.id} - ${req.method} ${req.path}`);
      }
      
      next();
    });
  };
};

/**
 * Security event types for audit logging
 */
export const SECURITY_EVENTS = {
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_FAILED: 'auth_failed',
  NODE_CREATE: 'node_create',
  NODE_UPDATE: 'node_update',
  NODE_DELETE: 'node_delete',
  SESSION_START: 'session_start',
  SESSION_COMPLETE: 'session_complete',
  SKILL_MAP_CREATE: 'skill_map_create',
  SKILL_MAP_UPDATE: 'skill_map_update',
  RATE_LIMIT_HIT: 'rate_limit_hit',
  VALIDATION_ERROR: 'validation_error',
  UNAUTHORIZED_ACCESS: 'unauthorized_access'
};