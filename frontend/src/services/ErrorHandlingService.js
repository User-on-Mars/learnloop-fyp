/**
 * Frontend Error Handling Service
 * 
 * Implements Requirements: 8.1, 8.3, 8.4, 8.5
 * 
 * This service provides:
 * - Graceful degradation for animation failures
 * - User-friendly error messages
 * - Retry logic with exponential backoff for API calls
 * - Error recovery and fallback mechanisms
 */

class ErrorHandlingService {
  
  // Error categories for frontend handling
  static ERROR_CATEGORIES = {
    ANIMATION: 'animation',
    API: 'api',
    VALIDATION: 'validation',
    NETWORK: 'network',
    AUTHENTICATION: 'authentication',
    SESSION: 'session'
  };

  // Retry configuration for API calls
  static RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  // Animation fallback options
  static ANIMATION_FALLBACKS = {
    unlock: {
      duration: 500,
      effects: ['scale', 'glow', 'highlight']
    },
    progress: {
      duration: 300,
      effects: ['opacity', 'highlight']
    },
    completion: {
      duration: 800,
      effects: ['scale', 'color', 'glow']
    }
  };

  /**
   * Enhanced animation failure handling with multiple fallback strategies
   * Implements Requirement 8.3
   */
  static handleAnimationFailure(nodeId, animationType, error, options = {}) {
    console.warn(`Animation failed for node ${nodeId} (${animationType}):`, error);
    
    const fallbackConfig = this.ANIMATION_FALLBACKS[animationType] || this.ANIMATION_FALLBACKS.unlock;
    const nodeElement = this._findNodeElement(nodeId);
    
    if (!nodeElement) {
      console.error(`Could not find node element for fallback: ${nodeId}`);
      return this._createAnimationErrorResult(nodeId, animationType, error, false);
    }

    // Try multiple fallback strategies in order of preference
    const fallbackStrategies = [
      () => this._applyCSSFallback(nodeElement, animationType, { ...fallbackConfig, ...options }),
      () => this._applyBasicHighlight(nodeElement, fallbackConfig.duration),
      () => this._applyMinimalFeedback(nodeElement)
    ];

    for (let i = 0; i < fallbackStrategies.length; i++) {
      try {
        fallbackStrategies[i]();
        
        // Log successful fallback
        this._logError({
          category: this.ERROR_CATEGORIES.ANIMATION,
          type: 'fallback_applied',
          nodeId,
          animationType,
          fallbackLevel: i + 1,
          originalError: error.message,
          fallbackSuccess: true
        });
        
        return this._createAnimationErrorResult(nodeId, animationType, error, true, i + 1);
      } catch (fallbackError) {
        console.warn(`Fallback strategy ${i + 1} failed for node ${nodeId}:`, fallbackError);
        
        if (i === fallbackStrategies.length - 1) {
          // All fallbacks failed
          this._logError({
            category: this.ERROR_CATEGORIES.ANIMATION,
            type: 'all_fallbacks_failed',
            nodeId,
            animationType,
            originalError: error.message,
            lastFallbackError: fallbackError.message
          });
          
          return this._createAnimationErrorResult(nodeId, animationType, error, false);
        }
      }
    }
  }

  /**
   * Enhanced API retry logic with intelligent backoff and user feedback
   * Implements Requirement 8.4
   */
  static async withRetry(apiCall, options = {}) {
    const config = { ...this.RETRY_CONFIG, ...options };
    let lastError;
    let retryReasons = [];
    
    // Show user feedback for long operations
    const showUserFeedback = config.showUserFeedback !== false;
    let feedbackTimeout;
    
    if (showUserFeedback && config.maxRetries > 1) {
      feedbackTimeout = setTimeout(() => {
        this._showRetryFeedback('Operation is taking longer than expected. Retrying...');
      }, 2000);
    }
    
    try {
      for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
        try {
          const result = await apiCall();
          
          // Clear user feedback on success
          if (feedbackTimeout) {
            clearTimeout(feedbackTimeout);
            this._hideRetryFeedback();
          }
          
          return result;
        } catch (error) {
          lastError = error;
          retryReasons.push({
            attempt,
            error: error.message,
            status: error.status,
            timestamp: new Date().toISOString()
          });
          
          // Don't retry on client errors (4xx) except 408, 429
          if (error.status >= 400 && error.status < 500 && 
              error.status !== 408 && error.status !== 429) {
            throw this._enhanceError(error, { 
              attempt, 
              maxRetries: config.maxRetries,
              retryReasons 
            });
          }
          
          if (attempt < config.maxRetries) {
            const delay = this._calculateBackoffDelay(attempt, config);
            
            // Update user feedback
            if (showUserFeedback) {
              this._updateRetryFeedback(
                `Attempt ${attempt} failed. Retrying in ${Math.ceil(delay/1000)} seconds...`,
                attempt,
                config.maxRetries
              );
            }
            
            console.warn(`API call failed (attempt ${attempt}/${config.maxRetries}), retrying in ${delay}ms:`, error.message);
            await this._sleep(delay);
          }
        }
      }
    } finally {
      // Always clear feedback timeout
      if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
        this._hideRetryFeedback();
      }
    }
    
    // All retries exhausted
    throw this._createRetryExhaustedError(lastError, config.maxRetries, retryReasons);
  }

  /**
   * Create user-friendly error messages
   * Implements Requirement 8.1, 8.5
   */
  static createUserFriendlyError(error, context = {}) {
    const userFriendlyMessages = {
      // Network errors
      'Network Error': 'Unable to connect to the server. Please check your internet connection and try again.',
      'timeout': 'The request took too long to complete. Please try again.',
      
      // Authentication errors
      'AUTHENTICATION_REQUIRED': 'Please log in to continue with your learning session.',
      'AUTHORIZATION_DENIED': 'You don\'t have permission to access this content.',
      
      // Validation errors
      'VALIDATION_ERROR': 'Please check your input and correct any errors.',
      'REFLECTION_VALIDATION_ERROR': 'Please provide valid reflection ratings and notes.',
      
      // Session errors
      'SESSION_TIMEOUT': 'Your learning session has been saved due to inactivity. You can continue where you left off.',
      'SESSION_CONFLICT': 'You have another active learning session. Please complete it first.',
      
      // Unlock errors
      'UNLOCK_FORBIDDEN': 'Complete the previous learning steps to unlock this content.',
      'NODE_NOT_FOUND': 'The requested learning content could not be found.',
      
      // System errors
      'DATABASE_ERROR': 'We\'re experiencing temporary technical difficulties. Please try again in a few moments.',
      'RETRY_EXHAUSTED': 'The system is currently unavailable. Please try again later.'
    };

    const code = error.code || error.name || 'UNKNOWN_ERROR';
    const userMessage = userFriendlyMessages[code] || 
                       userFriendlyMessages[error.message] || 
                       'An unexpected error occurred. Please try again.';

    return {
      message: userMessage,
      code,
      category: this._categorizeError(error),
      canRetry: this._canRetry(error),
      recoveryActions: this._getRecoveryActions(error, context),
      timestamp: new Date().toISOString(),
      context
    };
  }

  /**
   * Handle validation errors with field-specific guidance
   * Implements Requirement 8.5
   */
  static handleValidationErrors(errors, formContext = {}) {
    const fieldErrors = {};
    const generalErrors = [];
    
    if (Array.isArray(errors)) {
      errors.forEach(error => {
        if (error.field) {
          fieldErrors[error.field] = {
            message: error.userFriendly || error.message,
            hint: error.context?.hint,
            value: error.value
          };
        } else {
          generalErrors.push(error.userFriendly || error.message);
        }
      });
    }
    
    return {
      hasErrors: Object.keys(fieldErrors).length > 0 || generalErrors.length > 0,
      fieldErrors,
      generalErrors,
      summary: this._createValidationSummary(fieldErrors, generalErrors)
    };
  }

  /**
   * Handle session timeout with recovery options
   * Implements Requirement 8.2
   */
  static handleSessionTimeout(error, sessionData = {}) {
    const recoveryOptions = {
      canRecover: true,
      preservedProgress: sessionData.progress || 0,
      preservedDuration: sessionData.duration || 0,
      actions: [
        {
          type: 'recover',
          label: 'Continue Session',
          description: 'Resume your learning session from where you left off'
        },
        {
          type: 'restart',
          label: 'Start Fresh',
          description: 'Begin a new session for this learning content'
        }
      ]
    };

    return {
      type: 'session_timeout',
      message: 'Your learning session has been automatically saved due to timeout.',
      details: 'You can continue where you left off or start a fresh session.',
      recoveryOptions,
      preservedData: {
        progress: sessionData.progress || 0,
        duration: sessionData.duration || 0,
        lastActivity: sessionData.lastActivity
      }
    };
  }

  /**
   * Apply CSS fallback animation
   * @private
   */
  static _applyCSSFallback(element, animationType, config) {
    const { duration, effects } = config;
    
    // Store original styles
    const originalStyles = {
      transition: element.style.transition,
      transform: element.style.transform,
      filter: element.style.filter,
      opacity: element.style.opacity,
      backgroundColor: element.style.backgroundColor
    };
    
    // Apply transition
    element.style.transition = `all ${duration}ms ease-in-out`;
    
    // Apply effects based on animation type
    switch (animationType) {
      case 'unlock':
        this._applyUnlockFallback(element, effects, duration);
        break;
      case 'progress':
        this._applyProgressFallback(element, effects, duration);
        break;
      case 'completion':
        this._applyCompletionFallback(element, effects, duration);
        break;
      default:
        this._applyGenericFallback(element, effects, duration);
    }
    
    // Restore original styles after animation
    setTimeout(() => {
      Object.keys(originalStyles).forEach(prop => {
        element.style[prop] = originalStyles[prop];
      });
    }, duration + 100);
  }

  /**
   * Apply unlock animation fallback
   * @private
   */
  static _applyUnlockFallback(element, effects, duration) {
    if (effects.includes('scale')) {
      element.style.transform = 'scale(1.1)';
    }
    if (effects.includes('glow')) {
      element.style.filter = 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))';
    }
    if (effects.includes('highlight')) {
      element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    }
    
    setTimeout(() => {
      element.style.transform = 'scale(1.0)';
      element.style.filter = '';
      element.style.backgroundColor = '';
    }, duration / 2);
  }

  /**
   * Apply progress animation fallback
   * @private
   */
  static _applyProgressFallback(element, effects, duration) {
    if (effects.includes('opacity')) {
      element.style.opacity = '0.7';
      setTimeout(() => {
        element.style.opacity = '1.0';
      }, duration / 2);
    }
    if (effects.includes('highlight')) {
      element.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, duration);
    }
  }

  /**
   * Apply completion animation fallback
   * @private
   */
  static _applyCompletionFallback(element, effects, duration) {
    if (effects.includes('scale')) {
      element.style.transform = 'scale(1.05)';
    }
    if (effects.includes('color')) {
      element.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
    }
    if (effects.includes('glow')) {
      element.style.filter = 'drop-shadow(0 0 15px rgba(16, 185, 129, 0.5))';
    }
    
    setTimeout(() => {
      element.style.transform = 'scale(1.0)';
      element.style.backgroundColor = '';
      element.style.filter = '';
    }, duration);
  }

  /**
   * Apply generic animation fallback
   * @private
   */
  static _applyGenericFallback(element, effects, duration) {
    element.style.filter = 'brightness(1.1)';
    setTimeout(() => {
      element.style.filter = '';
    }, duration);
  }

  /**
   * Find node element by ID with multiple strategies
   * @private
   */
  static _findNodeElement(nodeId) {
    return document.querySelector(`[data-node-id="${nodeId}"]`) ||
           document.querySelector(`#node-${nodeId}`) ||
           document.querySelector(`[id*="${nodeId}"]`) ||
           document.querySelector(`.node-${nodeId}`);
  }

  /**
   * Calculate exponential backoff delay
   * @private
   */
  static _calculateBackoffDelay(attempt, config) {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitter = delay * 0.1 * Math.random(); // Add 10% jitter
    return Math.min(delay + jitter, config.maxDelay);
  }

  /**
   * Categorize error for appropriate handling
   * @private
   */
  static _categorizeError(error) {
    if (error.code?.includes('ANIMATION') || error.name?.includes('Animation')) {
      return this.ERROR_CATEGORIES.ANIMATION;
    }
    if (error.status >= 400 && error.status < 500) {
      return error.status === 401 ? this.ERROR_CATEGORIES.AUTHENTICATION : this.ERROR_CATEGORIES.API;
    }
    if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      return this.ERROR_CATEGORIES.NETWORK;
    }
    if (error.code?.includes('VALIDATION')) {
      return this.ERROR_CATEGORIES.VALIDATION;
    }
    if (error.code?.includes('SESSION')) {
      return this.ERROR_CATEGORIES.SESSION;
    }
    return this.ERROR_CATEGORIES.API;
  }

  /**
   * Determine if error can be retried
   * @private
   */
  static _canRetry(error) {
    const nonRetryableCodes = [
      'VALIDATION_ERROR',
      'AUTHENTICATION_REQUIRED',
      'AUTHORIZATION_DENIED',
      'NODE_NOT_FOUND'
    ];
    
    return !nonRetryableCodes.includes(error.code) && 
           !(error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429);
  }

  /**
   * Get recovery actions for error
   * @private
   */
  static _getRecoveryActions(error, context) {
    const actions = [];
    
    if (this._canRetry(error)) {
      actions.push({
        type: 'retry',
        label: 'Try Again',
        description: 'Retry the operation'
      });
    }
    
    if (error.code === 'AUTHENTICATION_REQUIRED') {
      actions.push({
        type: 'login',
        label: 'Log In',
        description: 'Sign in to your account'
      });
    }
    
    if (error.code === 'SESSION_TIMEOUT') {
      actions.push({
        type: 'recover_session',
        label: 'Continue Session',
        description: 'Resume your learning progress'
      });
    }
    
    if (error.category === this.ERROR_CATEGORIES.NETWORK) {
      actions.push({
        type: 'check_connection',
        label: 'Check Connection',
        description: 'Verify your internet connection'
      });
    }
    
    return actions;
  }

  /**
   * Create validation summary message
   * @private
   */
  static _createValidationSummary(fieldErrors, generalErrors) {
    const fieldCount = Object.keys(fieldErrors).length;
    const generalCount = generalErrors.length;
    const totalErrors = fieldCount + generalCount;
    
    if (totalErrors === 0) return '';
    
    if (totalErrors === 1) {
      return fieldCount === 1 ? 
        'Please correct the highlighted field.' : 
        generalErrors[0];
    }
    
    return `Please correct ${totalErrors} errors before continuing.`;
  }

  /**
   * Enhance error with additional context
   * @private
   */
  static _enhanceError(error, context) {
    return {
      ...error,
      context,
      timestamp: new Date().toISOString(),
      category: this._categorizeError(error)
    };
  }

  /**
   * Create retry exhausted error with detailed information
   * @private
   */
  static _createRetryExhaustedError(lastError, maxRetries, retryReasons = []) {
    return {
      code: 'RETRY_EXHAUSTED',
      message: `Operation failed after ${maxRetries} attempts: ${lastError.message}`,
      originalError: lastError,
      maxRetries,
      retryReasons,
      category: this.ERROR_CATEGORIES.NETWORK,
      userFriendly: `Unable to complete the operation after ${maxRetries} attempts. Please check your connection and try again.`,
      recoveryActions: [
        {
          type: 'check_connection',
          label: 'Check Connection',
          description: 'Verify your internet connection is stable'
        },
        {
          type: 'try_later',
          label: 'Try Later',
          description: 'The service may be temporarily unavailable'
        },
        {
          type: 'refresh_page',
          label: 'Refresh Page',
          description: 'Reload the page and try again'
        }
      ]
    };
  }

  /**
   * Log error for debugging
   * @private
   */
  static _logError(errorData) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ErrorHandling]', errorData);
    }
    
    // In production, this could send to error tracking service
  }

  /**
   * Sleep utility for delays
   * @private
   */
  static _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Additional fallback strategies for animation failures
   * @private
   */
  static _applyBasicHighlight(element, duration) {
    element.style.transition = `background-color ${duration}ms ease-in-out`;
    element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    
    setTimeout(() => {
      element.style.backgroundColor = '';
      setTimeout(() => element.style.transition = '', 100);
    }, duration);
  }

  static _applyMinimalFeedback(element) {
    // Most basic feedback - just a brief opacity change
    const originalOpacity = element.style.opacity;
    element.style.opacity = '0.8';
    
    setTimeout(() => {
      element.style.opacity = originalOpacity;
    }, 200);
  }

  static _createAnimationErrorResult(nodeId, animationType, error, success, fallbackLevel = 0) {
    return {
      success,
      nodeId,
      animationType,
      error: error.message,
      fallbackLevel,
      timestamp: new Date().toISOString(),
      userMessage: success ? 
        'Animation simplified due to technical limitations' : 
        'Visual feedback temporarily unavailable'
    };
  }

  /**
   * User feedback methods for retry operations
   * @private
   */
  static _showRetryFeedback(message) {
    // Create or update retry feedback element
    let feedbackElement = document.getElementById('retry-feedback');
    
    if (!feedbackElement) {
      feedbackElement = document.createElement('div');
      feedbackElement.id = 'retry-feedback';
      feedbackElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease-in-out;
        max-width: 300px;
      `;
      document.body.appendChild(feedbackElement);
    }
    
    feedbackElement.textContent = message;
    feedbackElement.style.opacity = '1';
    feedbackElement.style.transform = 'translateY(0)';
  }

  static _updateRetryFeedback(message, attempt, maxAttempts) {
    const feedbackElement = document.getElementById('retry-feedback');
    if (feedbackElement) {
      feedbackElement.innerHTML = `
        <div>${message}</div>
        <div style="margin-top: 4px; font-size: 12px; opacity: 0.8;">
          Attempt ${attempt} of ${maxAttempts}
        </div>
      `;
    }
  }

  static _hideRetryFeedback() {
    const feedbackElement = document.getElementById('retry-feedback');
    if (feedbackElement) {
      feedbackElement.style.opacity = '0';
      feedbackElement.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        if (feedbackElement.parentNode) {
          feedbackElement.parentNode.removeChild(feedbackElement);
        }
      }, 300);
    }
  }
}

export default ErrorHandlingService;