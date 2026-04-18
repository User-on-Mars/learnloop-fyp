import { useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export const useApiError = () => {
  const { showError } = useToast();

  const handleApiError = useCallback((error, options = {}) => {
    const {
      title = 'Error',
      defaultMessage = 'An unexpected error occurred',
      showRetry = false,
      onRetry = null,
      context = {}
    } = options;

    // Extract error message from different error formats
    let message = defaultMessage;
    
    if (error?.response?.data?.message) {
      message = error.response.data.message;
    } else if (error?.message) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    // Check if it's a network error that might benefit from retry
    const isRetryable = error?.code === 'NETWORK_ERROR' || 
                       error?.response?.status >= 500 ||
                       error?.name === 'NetworkError';

    // Show toast with appropriate options
    showError(message, {
      title,
      showRetry: showRetry && isRetryable,
      onRetry: isRetryable ? onRetry : null,
      duration: isRetryable ? 8000 : 6000 // Longer duration for retryable errors
    });

    // Log error for debugging
    console.error(`API Error [${context.operation || 'unknown'}]:`, {
      error,
      context,
      message,
      isRetryable
    });
  }, [showError]);

  const handleValidationError = useCallback((error, fieldSetters = {}) => {
    // Handle validation errors with field-specific messages
    if (error?.response?.data?.errors) {
      const errors = error.response.data.errors;
      
      // Set field-specific errors if setters provided
      Object.entries(fieldSetters).forEach(([field, setter]) => {
        const fieldError = errors.find(err => err.field === field);
        if (fieldError && setter) {
          setter(fieldError.message);
        }
      });

      // Show general validation error toast
      showError('Please check the form for errors', {
        title: 'Validation Error'
      });
    } else {
      // Fallback to general error handling
      handleApiError(error, {
        title: 'Validation Error',
        defaultMessage: 'Please check your input and try again'
      });
    }
  }, [showError, handleApiError]);

  return {
    handleApiError,
    handleValidationError
  };
};

export default useApiError;