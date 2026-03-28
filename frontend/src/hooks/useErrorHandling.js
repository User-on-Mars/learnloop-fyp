import { useState, useCallback, useRef, useEffect } from 'react';
import ErrorHandlingService from '../services/ErrorHandlingService';

/**
 * Enhanced Error Handling Hook
 * 
 * Implements Requirements: 8.1, 8.3, 8.4, 8.5
 * 
 * Provides comprehensive error handling capabilities:
 * - Automatic retry with exponential backoff
 * - User-friendly error messages
 * - Animation fallback handling
 * - Error recovery guidance
 * - Loading and error states management
 */
export function useErrorHandling(options = {}) {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const retryTimeoutRef = useRef(null);
  const maxRetries = options.maxRetries || 3;
  const showUserFeedback = options.showUserFeedback !== false;
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Execute an async operation with comprehensive error handling
   */
  const executeWithErrorHandling = useCallback(async (operation, operationOptions = {}) => {
    const config = { ...options, ...operationOptions };
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ErrorHandlingService.withRetry(operation, {
        maxRetries: config.maxRetries || maxRetries,
        showUserFeedback: config.showUserFeedback !== false,
        ...config
      });
      
      // Reset retry count on success
      setRetryCount(0);
      setIsLoading(false);
      
      return result;
    } catch (err) {
      const enhancedError = ErrorHandlingService.createUserFriendlyError(err, {
        operation: config.operationName || 'unknown',
        context: config.context || {}
      });
      
      setError(enhancedError);
      setIsLoading(false);
      
      // Don't increment retry count for non-retryable errors
      if (enhancedError.canRetry) {
        setRetryCount(prev => prev + 1);
      }
      
      throw enhancedError;
    }
  }, [options, maxRetries]);

  /**
   * Handle animation failures with graceful degradation
   */
  const handleAnimationError = useCallback((nodeId, animationType, error, fallbackOptions = {}) => {
    const result = ErrorHandlingService.handleAnimationFailure(
      nodeId, 
      animationType, 
      error, 
      fallbackOptions
    );
    
    if (!result.success) {
      const animationError = ErrorHandlingService.createUserFriendlyError(error, {
        category: 'animation',
        nodeId,
        animationType
      });
      
      setError(animationError);
    }
    
    return result;
  }, []);

  /**
   * Retry the last failed operation
   */
  const retry = useCallback(async (operation) => {
    if (retryCount >= maxRetries) {
      const maxRetriesError = new Error(`Maximum retry attempts (${maxRetries}) exceeded`);
      maxRetriesError.code = 'MAX_RETRIES_EXCEEDED';
      setError(ErrorHandlingService.createUserFriendlyError(maxRetriesError));
      return;
    }
    
    setIsRetrying(true);
    setError(null);
    
    try {
      // Calculate delay with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      
      if (delay > 0) {
        await new Promise(resolve => {
          retryTimeoutRef.current = setTimeout(resolve, delay);
        });
      }
      
      const result = await operation();
      
      // Reset state on success
      setRetryCount(0);
      setIsRetrying(false);
      
      return result;
    } catch (err) {
      const enhancedError = ErrorHandlingService.createUserFriendlyError(err, {
        retryAttempt: retryCount + 1,
        maxRetries
      });
      
      setError(enhancedError);
      setRetryCount(prev => prev + 1);
      setIsRetrying(false);
      
      throw enhancedError;
    }
  }, [retryCount, maxRetries]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  /**
   * Handle session timeout with recovery options
   */
  const handleSessionTimeout = useCallback((sessionData = {}) => {
    const timeoutError = ErrorHandlingService.handleSessionTimeout(
      { code: 'SESSION_TIMEOUT', message: 'Session timeout' },
      sessionData
    );
    
    setError({
      ...timeoutError,
      canRetry: true,
      recoveryActions: timeoutError.recoveryOptions.actions
    });
    
    return timeoutError;
  }, []);

  /**
   * Handle validation errors with field-specific guidance
   */
  const handleValidationErrors = useCallback((validationErrors, formContext = {}) => {
    const processedErrors = ErrorHandlingService.handleValidationErrors(
      validationErrors,
      formContext
    );
    
    if (processedErrors.hasErrors) {
      setError({
        code: 'VALIDATION_ERROR',
        message: processedErrors.summary,
        fieldErrors: processedErrors.fieldErrors,
        generalErrors: processedErrors.generalErrors,
        canRetry: false,
        category: 'validation'
      });
    }
    
    return processedErrors;
  }, []);

  /**
   * Get recovery guidance for current error
   */
  const getRecoveryGuidance = useCallback(() => {
    if (!error) return null;
    
    return ErrorHandlingService.createRecoveryGuidance(error, {
      retryCount,
      maxRetries,
      canRetry: retryCount < maxRetries && error.canRetry
    });
  }, [error, retryCount, maxRetries]);

  /**
   * Check if operation can be retried
   */
  const canRetry = error?.canRetry && retryCount < maxRetries;

  /**
   * Get user-friendly error message
   */
  const errorMessage = error?.userFriendly || error?.message || null;

  /**
   * Get error severity level
   */
  const errorSeverity = error?.category === 'animation' ? 'low' :
                       error?.category === 'validation' ? 'medium' :
                       error?.category === 'network' ? 'high' : 'medium';

  return {
    // State
    error,
    isLoading,
    isRetrying,
    retryCount,
    canRetry,
    errorMessage,
    errorSeverity,
    
    // Actions
    executeWithErrorHandling,
    handleAnimationError,
    handleSessionTimeout,
    handleValidationErrors,
    retry,
    clearError,
    getRecoveryGuidance,
    
    // Utilities
    isError: !!error,
    hasRetryableError: !!(error && error.canRetry),
    isMaxRetriesReached: retryCount >= maxRetries
  };
}

/**
 * Hook for handling API calls with automatic retry
 */
export function useApiWithRetry(apiFunction, dependencies = [], options = {}) {
  const errorHandling = useErrorHandling(options);
  const [data, setData] = useState(null);
  
  const execute = useCallback(async (...args) => {
    try {
      const result = await errorHandling.executeWithErrorHandling(
        () => apiFunction(...args),
        {
          operationName: options.operationName || apiFunction.name,
          context: { args }
        }
      );
      
      setData(result);
      return result;
    } catch (error) {
      // Error is already handled by executeWithErrorHandling
      throw error;
    }
  }, [apiFunction, errorHandling, options.operationName]);
  
  return {
    ...errorHandling,
    data,
    execute,
    refetch: execute
  };
}

/**
 * Hook for handling form submissions with validation
 */
export function useFormWithErrorHandling(submitFunction, options = {}) {
  const errorHandling = useErrorHandling(options);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const submit = useCallback(async (formData, validationRules = {}) => {
    setIsSubmitting(true);
    
    try {
      // Client-side validation if rules provided
      if (validationRules && Object.keys(validationRules).length > 0) {
        const validationErrors = validateFormData(formData, validationRules);
        if (validationErrors.length > 0) {
          errorHandling.handleValidationErrors(validationErrors, { formData });
          setIsSubmitting(false);
          return;
        }
      }
      
      const result = await errorHandling.executeWithErrorHandling(
        () => submitFunction(formData),
        {
          operationName: 'form_submission',
          context: { formData: Object.keys(formData) } // Don't log actual form data
        }
      );
      
      setIsSubmitting(false);
      return result;
    } catch (error) {
      setIsSubmitting(false);
      
      // Handle server validation errors
      if (error.code === 'VALIDATION_ERROR' && error.errors) {
        errorHandling.handleValidationErrors(error.errors, { formData });
      }
      
      throw error;
    }
  }, [submitFunction, errorHandling]);
  
  return {
    ...errorHandling,
    isSubmitting,
    submit
  };
}

/**
 * Simple form validation helper
 */
function validateFormData(formData, rules) {
  const errors = [];
  
  Object.keys(rules).forEach(field => {
    const rule = rules[field];
    const value = formData[field];
    
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors.push({
        field,
        message: `${field} is required`,
        code: 'REQUIRED'
      });
    }
    
    if (value && rule.minLength && value.toString().length < rule.minLength) {
      errors.push({
        field,
        message: `${field} must be at least ${rule.minLength} characters`,
        code: 'MIN_LENGTH'
      });
    }
    
    if (value && rule.maxLength && value.toString().length > rule.maxLength) {
      errors.push({
        field,
        message: `${field} must be no more than ${rule.maxLength} characters`,
        code: 'MAX_LENGTH'
      });
    }
    
    if (value && rule.pattern && !rule.pattern.test(value.toString())) {
      errors.push({
        field,
        message: rule.patternMessage || `${field} format is invalid`,
        code: 'PATTERN'
      });
    }
  });
  
  return errors;
}

export default useErrorHandling;