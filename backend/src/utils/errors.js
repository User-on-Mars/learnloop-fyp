/**
 * Custom Error Classes for Skill Map System
 * 
 * Implements Requirements: 1.9, 1.10, 9.6, 9.7, 11.5, 14.4, 14.5
 * 
 * Provides structured error handling with:
 * - Validation errors with field-specific messages
 * - State transition errors
 * - Referential integrity errors
 * - Permission errors
 */

/**
 * Base error class for all skill map errors
 */
export class SkillMapError extends Error {
  constructor(message, code, statusCode = 500, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

/**
 * Validation Error - Requirements 1.9, 1.10, 9.6, 9.7
 */
export class ValidationError extends SkillMapError {
  constructor(field, value, constraint, context = {}) {
    const message = ValidationError.createMessage(field, value, constraint);
    super(message, 'VALIDATION_ERROR', 400, {
      field,
      value: typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value,
      constraint,
      ...context
    });
    this.field = field;
    this.constraint = constraint;
  }

  static createMessage(field, value, constraint) {
    const messages = {
      required: `${field} is required`,
      minLength: `${field} must be at least ${constraint.min} characters`,
      maxLength: `${field} must not exceed ${constraint.max} characters`,
      min: `${field} must be at least ${constraint.min}`,
      max: `${field} must not exceed ${constraint.max}`,
      range: `${field} must be between ${constraint.min} and ${constraint.max}`,
      enum: `${field} must be one of: ${constraint.values?.join(', ')}`,
      format: `${field} has invalid format`,
      unique: `${field} '${value}' already exists`
    };

    return messages[constraint.type] || `${field} validation failed`;
  }
}

/**
 * State Transition Error - Requirement 5.5, 5.6, 5.7, 5.8
 */
export class StateTransitionError extends SkillMapError {
  constructor(currentState, newState, reason, context = {}) {
    const message = `Cannot transition from ${currentState} to ${newState}: ${reason}`;
    super(message, 'INVALID_STATE_TRANSITION', 400, {
      currentState,
      newState,
      reason,
      ...context
    });
    this.currentState = currentState;
    this.newState = newState;
    this.reason = reason;
  }
}

/**
 * Referential Integrity Error - Requirements 14.2, 14.3
 */
export class ReferentialIntegrityError extends SkillMapError {
  constructor(entity, entityId, relatedEntity, reason, context = {}) {
    const message = `Referential integrity violation: ${entity} ${entityId} - ${reason}`;
    super(message, 'REFERENTIAL_INTEGRITY_ERROR', 409, {
      entity,
      entityId,
      relatedEntity,
      reason,
      ...context
    });
    this.entity = entity;
    this.entityId = entityId;
    this.relatedEntity = relatedEntity;
  }
}

/**
 * Permission Error - User access control
 */
export class PermissionError extends SkillMapError {
  constructor(resource, action, userId, context = {}) {
    const message = `User ${userId} does not have permission to ${action} ${resource}`;
    super(message, 'PERMISSION_DENIED', 403, {
      resource,
      action,
      userId,
      ...context
    });
    this.resource = resource;
    this.action = action;
    this.userId = userId;
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends SkillMapError {
  constructor(resource, identifier, context = {}) {
    const message = `${resource} not found${identifier ? `: ${identifier}` : ''}`;
    super(message, 'NOT_FOUND', 404, {
      resource,
      identifier,
      ...context
    });
    this.resource = resource;
    this.identifier = identifier;
  }
}

/**
 * Database Error - Requirements 14.4, 14.5
 */
export class DatabaseError extends SkillMapError {
  constructor(operation, originalError, context = {}) {
    const message = `Database operation failed: ${operation}`;
    super(message, 'DATABASE_ERROR', 503, {
      operation,
      originalError: originalError.message,
      ...context
    });
    this.operation = operation;
    this.originalError = originalError;
  }
}

/**
 * Conflict Error - For operations that conflict with current state
 */
export class ConflictError extends SkillMapError {
  constructor(resource, reason, context = {}) {
    const message = `Operation conflicts with current state: ${reason}`;
    super(message, 'CONFLICT', 409, {
      resource,
      reason,
      ...context
    });
    this.resource = resource;
    this.reason = reason;
  }
}
