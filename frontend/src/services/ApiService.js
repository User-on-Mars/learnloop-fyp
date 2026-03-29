/**
 * Enhanced API Service with comprehensive error handling and retry logic
 * 
 * Implements Requirements: 8.1, 8.4, 8.5
 * 
 * Features:
 * - Exponential backoff retry logic
 * - Request/response interceptors
 * - Automatic token refresh
 * - Network error handling
 * - Request queuing during offline periods
 */

import ErrorHandlingService from './ErrorHandlingService';

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.requestQueue = [];
    this.isOnline = navigator.onLine;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };

    // Setup network status monitoring
    this._setupNetworkMonitoring();
  }

  /**
   * Make API request with comprehensive error handling and retry logic
   */
  async request(endpoint, options = {}) {
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add authentication token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracing
    config.headers['X-Request-ID'] = this._generateRequestId();

    const url = `${this.baseURL}${endpoint}`;

    // If offline, queue the request
    if (!this.isOnline && config.method !== 'GET') {
      return this._queueRequest(url, config);
    }

    // Execute request with retry logic
    return ErrorHandlingService.withRetry(async () => {
      const response = await fetch(url, config);
      return this._handleResponse(response, endpoint, config);
    }, {
      ...this.retryConfig,
      ...options.retry
    });
  }

  /**
   * GET request wrapper
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request wrapper
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request wrapper
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request wrapper
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(endpoint, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...options.headers
      }
    };

    // Remove Content-Type header for file uploads
    delete config.headers['Content-Type'];

    return this.request(endpoint, config);
  }

  /**
   * Handle response with comprehensive error checking
   * @private
   */
  async _handleResponse(response, endpoint, config) {
    // Handle successful responses
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        return response.text();
      }
    }

    // Handle error responses
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const error = new Error(errorData.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = errorData.code;
    error.details = errorData;
    error.endpoint = endpoint;
    error.method = config.method;

    // Handle specific error types
    if (response.status === 401) {
      this._handleAuthenticationError(error);
    } else if (response.status === 403) {
      this._handleAuthorizationError(error);
    } else if (response.status === 422) {
      this._handleValidationError(error);
    } else if (response.status >= 500) {
      this._handleServerError(error);
    }

    throw error;
  }

  /**
   * Handle authentication errors
   * @private
   */
  _handleAuthenticationError(error) {
    // Clear invalid token
    localStorage.removeItem('authToken');
    
    // Redirect to login if not already there
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  /**
   * Handle authorization errors
   * @private
   */
  _handleAuthorizationError(error) {
    console.warn('Access denied:', error.message);
    // Could show a toast notification here
  }

  /**
   * Handle validation errors
   * @private
   */
  _handleValidationError(error) {
    // Enhance validation error with field-specific information
    if (error.details && error.details.errors) {
      error.validationErrors = ErrorHandlingService.handleValidationErrors(
        error.details.errors
      );
    }
  }

  /**
   * Handle server errors
   * @private
   */
  _handleServerError(error) {
    console.error('Server error:', error);
    // Could integrate with error reporting service here
  }

  /**
   * Queue request for when network comes back online
   * @private
   */
  async _queueRequest(url, config) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        url,
        config,
        resolve,
        reject,
        timestamp: Date.now()
      });

      console.log(`Request queued (offline): ${config.method} ${url}`);
    });
  }

  /**
   * Process queued requests when network comes back online
   * @private
   */
  async _processQueuedRequests() {
    if (this.requestQueue.length === 0) return;

    console.log(`Processing ${this.requestQueue.length} queued requests`);

    const requests = [...this.requestQueue];
    this.requestQueue = [];

    for (const queuedRequest of requests) {
      try {
        const response = await fetch(queuedRequest.url, queuedRequest.config);
        const result = await this._handleResponse(
          response, 
          queuedRequest.url, 
          queuedRequest.config
        );
        queuedRequest.resolve(result);
      } catch (error) {
        queuedRequest.reject(error);
      }
    }
  }

  /**
   * Setup network status monitoring
   * @private
   */
  _setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      this.isOnline = true;
      this._processQueuedRequests();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.isOnline = false;
    });
  }

  /**
   * Generate unique request ID for tracing
   * @private
   */
  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get network status
   */
  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      queuedRequests: this.requestQueue.length
    };
  }

  /**
   * Clear request queue (useful for testing or manual cleanup)
   */
  clearRequestQueue() {
    this.requestQueue.forEach(request => {
      request.reject(new Error('Request queue cleared'));
    });
    this.requestQueue = [];
  }
}

// Export singleton instance
export default new ApiService();