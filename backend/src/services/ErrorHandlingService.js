/**
 * ErrorHandlingService - Comprehensive error handling and recovery system
 * 
 * Implements Requirements: 8.1, 8.3, 8.4, 8.5
 * 
 * This service provides:
 * - Descriptive error messages for validation failures
 * - Graceful degradation for animation failures
 * - Retry logic with exponential backoff
 * - Field-specific error messages for user correction
 */

class ErrorHandlingService {
  
  // Error categories for structured handling
  static ERROR_CATEGORIES = {
    VALIDATION: 'validation',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    DATABASE: 'database',
    NETWORK: 'network',
    ANIMATION: 'animation',
    SESSION: 'session',
    UNLOCK: 'unlock'
  };

  // Retry configuration with exponential backoff
  static RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitterFactor: 0.1 // Add randomness to prevent thundering herd
  };

  // Circuit breaker configuration
  static CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 5, // Open circuit after 5 failures
    resetTimeout: 60000, // Reset after 1 minute
    halfOpenMaxCalls: 3 // Allow 3 calls in half-open state
  };

  // Circuit breaker state storage
  static circuitBreakers = new Map();

  /**
   * Create descriptive error message for validation failures
   * Implements Requirement 8.1, 8.5
   */
  static createValidationError(field, value, constraint, context = {}) {
    const errorMessages = {
      required: `${field} is required and cannot be empty`,
      minLength: `${field} must be at least ${constraint.min} characters long`,
      maxLength: `${field} must be no more than ${constraint.max} characters long`,
      range: `${field} must be between ${constraint.min} and ${constraint.max}`,
      format: `${field} format is invalid. Expected: ${constraint.format}`,
      enum: `${field} must be one of: ${constraint.values?.join(', ') || 'valid options'}`,
      unique: `${field} '${value}' is already in use`,
      dependency: `${field} requires ${constraint.dependency} to be set first`,
      nodeLimit: `Cannot exceed the limit of ${constraint.limit} content nodes per skill map`,
      progression: `${field} violates linear progression rules: ${constraint.reason}`,
      sessionTimeout: `Session has exceeded the maximum duration and has been automatically saved`,
      networkError: `Network connection failed. Please check your internet connection and try again`,
      databaseError: `Database operation failed. The system will retry automatically`,
      authenticationError: `Authentication failed. Please log in again to continue`,
      animationError: `Animation failed to load. Continuing with simplified visuals`,
      unlockError: `Cannot unlock this content. Complete the required prerequisites first`
    };

    const baseMessage = errorMessages[constraint.type] || `${field} validation failed`;
    
    return {
      field,
      message: baseMessage,
      code: `VALIDATION_${constraint.type.toUpperCase()}`,
      value: typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value,
      constraint,
      context,
      category: this.ERROR_CATEGORIES.VALIDATION,
      timestamp: new Date().toISOString(),
      userFriendly: this._makeUserFriendly(baseMessage, field, constraint)
    };
  }

  /**
   * Create field-specific error messages for reflection data
   * Implements Requirement 8.5
   */
  static createReflectionValidationErrors(reflectionData) {
    const errors = [];
    
    // Understanding validation (1-5 scale)
    if (reflectionData.understanding !== undefined) {
      if (!Number.isInteger(reflectionData.understanding) || 
          reflectionData.understanding < 1 || 
          reflectionData.understanding > 5) {
        errors.push(this.createValidationError(
          'understanding',
          reflectionData.understanding,
          { type: 'range', min: 1, max: 5, format: 'integer' },
          { hint: 'Rate your understanding from 1 (confused) to 5 (completely clear)' }
        ));
      }
    }

    // Difficulty validation (1-5 scale)
    if (reflectionData.difficulty !== undefined) {
      if (!Number.isInteger(reflectionData.difficulty) || 
          reflectionData.difficulty < 1 || 
          reflectionData.difficulty > 5) {
        errors.push(this.createValidationError(
          'difficulty',
          reflectionData.difficulty,
          { type: 'range', min: 1, max: 5, format: 'integer' },
          { hint: 'Rate the difficulty from 1 (very easy) to 5 (very hard)' }
        ));
      }
    }

    // Completion confidence validation (1-5 scale)
    if (reflectionData.completionConfidence !== undefined) {
      if (!Number.isInteger(reflectionData.completionConfidence) || 
          reflectionData.completionConfidence < 1 || 
          reflectionData.completionConfidence > 5) {
        errors.push(this.createValidationError(
          'completionConfidence',
          reflectionData.completionConfidence,
          { type: 'range', min: 1, max: 5, format: 'integer' },
          { hint: 'Rate your confidence in completing this topic from 1 (not confident) to 5 (very confident)' }
        ));
      }
    }

    // Notes validation (500 character limit)
    if (reflectionData.notes && reflectionData.notes.length > 500) {
      errors.push(this.createValidationError(
        'notes',
        reflectionData.notes,
        { type: 'maxLength', max: 500 },
        { 
          hint: 'Keep your reflection notes concise and focused',
          currentLength: reflectionData.notes.length
        }
      ));
    }

    // Tags validation
    if (reflectionData.tags && Array.isArray(reflectionData.tags)) {
      if (reflectionData.tags.length > 10) {
        errors.push(this.createValidationError(
          'tags',
          reflectionData.tags,
          { type: 'maxLength', max: 10 },
          { hint: 'Use up to 10 relevant tags to categorize your learning' }
        ));
      }
      
      reflectionData.tags.forEach((tag, index) => {
        if (typeof tag !== 'string' || tag.length > 50) {
          errors.push(this.createValidationError(
            `tags[${index}]`,
            tag,
            { type: 'maxLength', max: 50 },
            { hint: 'Each tag should be a short, descriptive word or phrase' }
          ));
        }
      });
    }

    return errors;
  }

  /**
   * Create unlock attempt error with progression guidance
   * Implements Requirement 8.1
   */
  static createUnlockError(nodeId, userId, validationResult) {
    const baseError = {
      nodeId,
      userId,
      category: this.ERROR_CATEGORIES.UNLOCK,
      timestamp: new Date().toISOString()
    };

    if (!validationResult.isValid) {
      return {
        ...baseError,
        code: 'UNLOCK_FORBIDDEN',
        message: validationResult.reason,
        requiredActions: this._generateUnlockGuidance(validationResult),
        httpStatus: 403,
        userFriendly: this._createUnlockGuidanceMessage(validationResult)
      };
    }

    return null;
  }

  /**
   * Enhanced retry logic with exponential backoff and circuit breaker
   * Implements Requirement 8.4
   */
  static async withDatabaseRetry(operation, context = {}) {
    let lastError;
    let attempt = 0;
    const circuitBreakerKey = `circuit_${context.operation || 'unknown'}`;
    
    // Check circuit breaker state
    if (this._isCircuitBreakerOpen(circuitBreakerKey)) {
      throw this._createCircuitBreakerError(circuitBreakerKey);
    }

    while (attempt < this.RETRY_CONFIG.maxRetries) {
      try {
        const result = await operation();
        
        // Reset circuit breaker on success
        this._resetCircuitBreaker(circuitBreakerKey);
        
        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        // Record failure for circuit breaker
        this._recordFailure(circuitBreakerKey);

        // Don't retry on validation or authentication errors
        if (this._isNonRetryableError(error)) {
          throw this._enhanceError(error, context, attempt);
        }

        if (attempt < this.RETRY_CONFIG.maxRetries) {
          const delay = this._calculateBackoffDelay(attempt);
          console.warn(`Database operation failed (attempt ${attempt}/${this.RETRY_CONFIG.maxRetries}), retrying in ${delay}ms:`, error.message);
          
          // Log retry attempt for monitoring
          this._logRetryAttempt(context, attempt, delay, error);
          
          await this._sleep(delay);
        }
      }
    }

    // All retries exhausted - update circuit breaker
    this._updateCircuitBreaker(circuitBreakerKey);
    
    throw this._createRetryExhaustedError(lastError, context, attempt);
  }

  /**
   * Handle animation failures with graceful degradation
   * Implements Requirement 8.3
   */
  static handleAnimationFailure(nodeId, animationType, error, fallbackOptions = {}) {
    const animationError = {
      nodeId,
      animationType,
      category: this.ERROR_CATEGORIES.ANIMATION,
      originalError: error.message,
      timestamp: new Date().toISOString(),
      fallbackApplied: false
    };

    console.warn(`Animation failure for node ${nodeId} (${animationType}):`, error);

    try {
      // Apply CSS transition fallback
      const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`) || 
                         document.querySelector(`#node-${nodeId}`);
      
      if (nodeElement) {
        this._applyCSSFallback(nodeElement, animationType, fallbackOptions);
        animationError.fallbackApplied = true;
        animationError.fallbackType = 'css_transition';
      } else {
        console.warn(`Could not find node element for fallback: ${nodeId}`);
        animationError.fallbackType = 'none';
      }
    } catch (fallbackError) {
      console.error(`Fallback animation also failed for node ${nodeId}:`, fallbackError);
      animationError.fallbackError = fallbackError.message;
    }

    return animationError;
  }

  /**
   * Create session timeout error with recovery options
   * Implements Requirement 8.2
   */
  static createSessionTimeoutError(sessionId, preservedData = {}) {
    return {
      sessionId,
      category: this.ERROR_CATEGORIES.SESSION,
      code: 'SESSION_TIMEOUT',
      message: 'Session has exceeded the maximum duration of 4 hours',
      httpStatus: 410, // Gone
      preservedData,
      recoveryOptions: {
        canRecover: true,
        preservedProgress: preservedData.currentProgress || 0,
        preservedDuration: preservedData.duration || 0,
        recoveryInstructions: 'You can recover your session progress by starting a new session on the same node'
      },
      userFriendly: 'Your learning session has been automatically saved due to timeout. You can continue where you left off by starting a new session.',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate exponential backoff delay with jitter
   * @private
   */
  static _calculateBackoffDelay(attempt) {
    const baseDelay = this.RETRY_CONFIG.baseDelay * Math.pow(this.RETRY_CONFIG.backoffMultiplier, attempt - 1);
    const jitter = baseDelay * this.RETRY_CONFIG.jitterFactor * Math.random();
    const delay = Math.min(baseDelay + jitter, this.RETRY_CONFIG.maxDelay);
    return Math.floor(delay);
  }

  /**
   * Check if error should not be retried
   * @private
   */
  static _isNonRetryableError(error) {
    const nonRetryableCodes = [
      'VALIDATION_ERROR',
      'AUTHENTICATION_FAILED', 
      'AUTHORIZATION_DENIED',
      'DUPLICATE_KEY_ERROR',
      'CAST_ERROR'
    ];

    return nonRetryableCodes.some(code => 
      error.message.includes(code) || 
      error.code === code ||
      error.name === code
    ) || error.status < 500; // Don't retry client errors
  }

  /**
   * Apply CSS transition fallback for failed animations
   * @private
   */
  static _applyCSSFallback(element, animationType, options) {
    const duration = options.duration || 500;
    const easing = options.easing || 'ease-in-out';
    
    element.style.transition = `all ${duration}ms ${easing}`;
    
    switch (animationType) {
      case 'unlock':
        element.style.transform = 'scale(1.1)';
        element.style.filter = 'brightness(1.2)';
        setTimeout(() => {
          element.style.transform = 'scale(1.0)';
          element.style.filter = 'brightness(1.0)';
        }, duration / 2);
        break;
        
      case 'progress':
        element.style.opacity = '0.7';
        setTimeout(() => {
          element.style.opacity = '1.0';
        }, duration);
        break;
        
      case 'completion':
        element.style.backgroundColor = '#10B981'; // Green
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, duration);
        break;
        
      default:
        // Generic highlight effect
        element.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
        setTimeout(() => {
          element.style.boxShadow = '';
        }, duration);
    }
    
    // Clean up transition after animation
    setTimeout(() => {
      element.style.transition = '';
    }, duration + 100);
  }

  /**
   * Generate unlock guidance based on validation result
   * @private
   */
  static _generateUnlockGuidance(validationResult) {
    const guidance = [];
    
    if (validationResult.requiredNodes && validationResult.requiredNodes.length > 0) {
      guidance.push({
        action: 'complete_prerequisites',
        description: 'Complete the required prerequisite nodes',
        nodeIds: validationResult.requiredNodes,
        priority: 'high'
      });
    }
    
    if (validationResult.reason.includes('START')) {
      guidance.push({
        action: 'complete_start_node',
        description: 'Complete the START node to begin the learning path',
        priority: 'high'
      });
    }
    
    if (validationResult.reason.includes('previous node')) {
      guidance.push({
        action: 'follow_sequence',
        description: 'Complete nodes in the correct sequence order',
        priority: 'medium'
      });
    }
    
    return guidance;
  }

  /**
   * Create user-friendly unlock guidance message
   * @private
   */
  static _createUnlockGuidanceMessage(validationResult) {
    if (validationResult.reason.includes('START')) {
      return 'To unlock this content, you need to complete the START node first. This ensures you have the foundation needed for the upcoming material.';
    }
    
    if (validationResult.reason.includes('previous node')) {
      return 'This content follows a structured learning path. Please complete the previous node in the sequence to unlock this one.';
    }
    
    if (validationResult.reason.includes('GOAL')) {
      return 'The GOAL node represents the completion of this skill. Finish all content nodes first to unlock the final achievement.';
    }
    
    return 'This content is currently locked. Complete the prerequisite nodes to continue your learning journey.';
  }

  /**
   * Make error messages more user-friendly
   * @private
   */
  static _makeUserFriendly(message, field, constraint) {
    const friendlyFieldNames = {
      understanding: 'Understanding Rating',
      difficulty: 'Difficulty Rating', 
      completionConfidence: 'Completion Confidence',
      notes: 'Reflection Notes',
      tags: 'Learning Tags',
      nodeId: 'Learning Node',
      sessionId: 'Learning Session'
    };
    
    const friendlyField = friendlyFieldNames[field] || field;
    
    return message.replace(field, friendlyField);
  }

  /**
   * Enhance error with context and retry information
   * @private
   */
  static _enhanceError(error, context, attempt) {
    return {
      ...error,
      context,
      attempt,
      category: this._categorizeError(error),
      timestamp: new Date().toISOString(),
      retryable: !this._isNonRetryableError(error)
    };
  }

  /**
   * Create error for exhausted retries
   * @private
   */
  static _createRetryExhaustedError(lastError, context, totalAttempts) {
    return {
      code: 'RETRY_EXHAUSTED',
      message: `Operation failed after ${totalAttempts} attempts: ${lastError.message}`,
      originalError: lastError,
      context,
      totalAttempts,
      category: this.ERROR_CATEGORIES.DATABASE,
      timestamp: new Date().toISOString(),
      httpStatus: 503, // Service Unavailable
      userFriendly: 'The system is experiencing temporary difficulties. Please try again in a few moments.'
    };
  }

  /**
   * Categorize error for structured handling
   * @private
   */
  static _categorizeError(error) {
    if (error.name === 'ValidationError' || error.code === 11000) {
      return this.ERROR_CATEGORIES.VALIDATION;
    }
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      return this.ERROR_CATEGORIES.DATABASE;
    }
    if (error.status === 401) {
      return this.ERROR_CATEGORIES.AUTHENTICATION;
    }
    if (error.status === 403) {
      return this.ERROR_CATEGORIES.AUTHORIZATION;
    }
    return this.ERROR_CATEGORIES.NETWORK;
  }

  /**
   * Sleep utility for retry delays
   * @private
   */
  static _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Circuit breaker management methods
   * @private
   */
  static _isCircuitBreakerOpen(key) {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return false;
    
    if (breaker.state === 'open') {
      // Check if reset timeout has passed
      if (Date.now() - breaker.lastFailureTime > this.CIRCUIT_BREAKER_CONFIG.resetTimeout) {
        breaker.state = 'half-open';
        breaker.halfOpenCalls = 0;
        return false;
      }
      return true;
    }
    
    return false;
  }

  static _recordFailure(key) {
    const breaker = this.circuitBreakers.get(key) || {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      halfOpenCalls: 0
    };
    
    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();
    
    if (breaker.failureCount >= this.CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      breaker.state = 'open';
    }
    
    this.circuitBreakers.set(key, breaker);
  }

  static _resetCircuitBreaker(key) {
    const breaker = this.circuitBreakers.get(key);
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.halfOpenCalls = 0;
    }
  }

  static _updateCircuitBreaker(key) {
    const breaker = this.circuitBreakers.get(key);
    if (breaker && breaker.state === 'half-open') {
      breaker.halfOpenCalls++;
      if (breaker.halfOpenCalls >= this.CIRCUIT_BREAKER_CONFIG.halfOpenMaxCalls) {
        breaker.state = 'open';
        breaker.lastFailureTime = Date.now();
      }
    }
  }

  static _createCircuitBreakerError(key) {
    return {
      code: 'CIRCUIT_BREAKER_OPEN',
      message: `Service temporarily unavailable due to repeated failures. Circuit breaker for ${key} is open.`,
      category: this.ERROR_CATEGORIES.DATABASE,
      timestamp: new Date().toISOString(),
      httpStatus: 503,
      userFriendly: 'The system is temporarily unavailable. Please try again in a few moments.',
      retryAfter: Math.ceil(this.CIRCUIT_BREAKER_CONFIG.resetTimeout / 1000)
    };
  }

  static _logRetryAttempt(context, attempt, delay, error) {
    const logData = {
      operation: context.operation || 'unknown',
      attempt,
      delay,
      error: error.message,
      timestamp: new Date().toISOString(),
      context
    };
    
    // In production, this would integrate with logging service
    console.warn('[RETRY]', logData);
  }

  /**
   * Enhanced error recovery with user guidance
   * Implements Requirement 8.1, 8.5
   */
  static createRecoveryGuidance(error, context = {}) {
    const recoveryActions = [];
    
    switch (error.category) {
      case this.ERROR_CATEGORIES.VALIDATION:
        recoveryActions.push({
          action: 'review_input',
          description: 'Review and correct the highlighted fields',
          priority: 'high',
          automated: false
        });
        break;
        
      case this.ERROR_CATEGORIES.NETWORK:
        recoveryActions.push(
          {
            action: 'check_connection',
            description: 'Check your internet connection',
            priority: 'high',
            automated: false
          },
          {
            action: 'retry_request',
            description: 'Retry the request automatically',
            priority: 'medium',
            automated: true,
            delay: 5000
          }
        );
        break;
        
      case this.ERROR_CATEGORIES.AUTHENTICATION:
        recoveryActions.push({
          action: 'reauthenticate',
          description: 'Please log in again to continue',
          priority: 'high',
          automated: false,
          redirectUrl: '/login'
        });
        break;
        
      case this.ERROR_CATEGORIES.SESSION:
        recoveryActions.push(
          {
            action: 'recover_session',
            description: 'Continue from where you left off',
            priority: 'high',
            automated: false
          },
          {
            action: 'start_new_session',
            description: 'Start a fresh session',
            priority: 'medium',
            automated: false
          }
        );
        break;
        
      case this.ERROR_CATEGORIES.ANIMATION:
        recoveryActions.push({
          action: 'continue_without_animation',
          description: 'Continue with simplified visuals',
          priority: 'low',
          automated: true
        });
        break;
        
      default:
        recoveryActions.push({
          action: 'refresh_page',
          description: 'Refresh the page and try again',
          priority: 'medium',
          automated: false
        });
    }
    
    return {
      canRecover: recoveryActions.length > 0,
      actions: recoveryActions,
      estimatedRecoveryTime: this._estimateRecoveryTime(error, recoveryActions),
      userMessage: this._createRecoveryMessage(error, recoveryActions)
    };
  }

  static _estimateRecoveryTime(error, actions) {
    const timeEstimates = {
      review_input: 30, // 30 seconds
      check_connection: 60, // 1 minute
      retry_request: 10, // 10 seconds
      reauthenticate: 120, // 2 minutes
      recover_session: 15, // 15 seconds
      start_new_session: 30, // 30 seconds
      continue_without_animation: 0, // immediate
      refresh_page: 10 // 10 seconds
    };
    
    const highPriorityActions = actions.filter(a => a.priority === 'high');
    if (highPriorityActions.length > 0) {
      return Math.max(...highPriorityActions.map(a => timeEstimates[a.action] || 30));
    }
    
    return 30; // Default 30 seconds
  }

  static _createRecoveryMessage(error, actions) {
    const highPriorityAction = actions.find(a => a.priority === 'high');
    if (highPriorityAction) {
      return `To resolve this issue: ${highPriorityAction.description}`;
    }
    
    return 'Please try the suggested recovery actions to resolve this issue.';
  }
}

export default ErrorHandlingService;