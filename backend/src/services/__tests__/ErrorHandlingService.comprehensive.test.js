/**
 * Comprehensive Error Handling Service Tests
 * 
 * **Validates: Requirements 8.1, 8.3, 8.4, 8.5**
 * 
 * Tests for comprehensive error handling implementation including:
 * - Descriptive error messages for validation failures
 * - Graceful degradation for animation failures  
 * - Retry logic with exponential backoff
 * - Field-specific error messages for user correction
 */

import { jest } from '@jest/globals';
import ErrorHandlingService from '../ErrorHandlingService.js';

describe('ErrorHandlingService - Comprehensive Error Handling', () => {
  
  beforeEach(() => {
    // Clear circuit breakers before each test
    ErrorHandlingService.circuitBreakers.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Descriptive Error Messages (Requirement 8.1, 8.5)', () => {
    
    it('should create descriptive validation errors with user-friendly messages', () => {
      const error = ErrorHandlingService.createValidationError(
        'understanding',
        6,
        { type: 'range', min: 1, max: 5 },
        { hint: 'Rate your understanding from 1 to 5' }
      );

      expect(error).toMatchObject({
        field: 'understanding',
        message: 'understanding must be between 1 and 5',
        code: 'VALIDATION_RANGE',
        category: 'validation',
        userFriendly: 'Understanding Rating must be between 1 and 5'
      });
      expect(error.context.hint).toBe('Rate your understanding from 1 to 5');
      expect(error.timestamp).toBeDefined();
    });

    it('should handle reflection validation with comprehensive field errors', () => {
      const reflectionData = {
        understanding: 6, // Invalid: > 5
        difficulty: 0,    // Invalid: < 1
        notes: 'a'.repeat(501), // Invalid: > 500 chars
        tags: ['valid', 'a'.repeat(51)] // Invalid: tag too long
      };

      const errors = ErrorHandlingService.createReflectionValidationErrors(reflectionData);

      expect(errors).toHaveLength(4);
      expect(errors[0].field).toBe('understanding');
      expect(errors[1].field).toBe('difficulty');
      expect(errors[2].field).toBe('notes');
      expect(errors[3].field).toBe('tags[1]');
      
      // Check user-friendly messages
      expect(errors[0].userFriendly).toContain('Understanding Rating');
      expect(errors[2].context.currentLength).toBe(501);
    });

    it('should create unlock errors with progression guidance', () => {
      const validationResult = {
        isValid: false,
        reason: 'Previous node not completed',
        requiredNodes: ['node-1', 'node-2']
      };

      const error = ErrorHandlingService.createUnlockError(
        'node-3',
        'user-123',
        validationResult
      );

      expect(error).toMatchObject({
        nodeId: 'node-3',
        userId: 'user-123',
        code: 'UNLOCK_FORBIDDEN',
        httpStatus: 403
      });
      expect(error.requiredActions).toBeDefined();
      expect(error.userFriendly).toContain('structured learning path');
    });
  });

  describe('Retry Logic with Exponential Backoff (Requirement 8.4)', () => {
    
    it('should retry database operations with exponential backoff', async () => {
      let attempts = 0;
      const mockOperation = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Database connection failed');
          error.name = 'MongoNetworkError';
          throw error;
        }
        return 'success';
      });

      const startTime = Date.now();
      const result = await ErrorHandlingService.withDatabaseRetry(mockOperation, {
        operation: 'test_operation'
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      
      // Should have taken at least 3 seconds (1s + 2s delays)
      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThan(2900); // Account for timing variations
    });

    it('should not retry non-retryable errors', async () => {
      const mockOperation = jest.fn(() => {
        const error = new Error('Validation failed');
        error.code = 'VALIDATION_ERROR';
        throw error;
      });

      await expect(
        ErrorHandlingService.withDatabaseRetry(mockOperation)
      ).rejects.toThrow('Validation failed');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should calculate exponential backoff with jitter', () => {
      const delays = [];
      for (let attempt = 1; attempt <= 5; attempt++) {
        const delay = ErrorHandlingService._calculateBackoffDelay(attempt);
        delays.push(delay);
      }

      // Should increase exponentially
      expect(delays[1]).toBeGreaterThan(delays[0]);
      expect(delays[2]).toBeGreaterThan(delays[1]);
      
      // Should not exceed max delay
      expect(Math.max(...delays)).toBeLessThanOrEqual(
        ErrorHandlingService.RETRY_CONFIG.maxDelay
      );
    });
  });

  describe('Animation Failure Handling (Requirement 8.3)', () => {
    
    beforeEach(() => {
      // Mock DOM
      global.document = {
        querySelector: jest.fn(),
        querySelectorAll: jest.fn()
      };
    });

    it('should handle animation failures with CSS fallback', () => {
      const mockElement = {
        style: {},
        setAttribute: jest.fn(),
        getAttribute: jest.fn()
      };
      
      global.document.querySelector.mockReturnValue(mockElement);

      const result = ErrorHandlingService.handleAnimationFailure(
        'node-123',
        'unlock',
        new Error('WebGL not supported'),
        { duration: 500 }
      );

      expect(result.fallbackApplied).toBe(true);
      expect(result.fallbackType).toBe('css_transition');
      expect(mockElement.style.transition).toBeDefined();
    });

    it('should gracefully handle missing DOM elements', () => {
      global.document.querySelector.mockReturnValue(null);

      const result = ErrorHandlingService.handleAnimationFailure(
        'missing-node',
        'unlock',
        new Error('Animation failed')
      );

      expect(result.fallbackApplied).toBe(false);
      expect(result.fallbackType).toBe('none');
    });
  });

  describe('Session Timeout Handling (Requirement 8.2)', () => {
    
    it('should create session timeout error with recovery options', () => {
      const preservedData = {
        currentProgress: 75,
        duration: 7200000, // 2 hours
        lastActivity: new Date().toISOString()
      };

      const error = ErrorHandlingService.createSessionTimeoutError(
        'session-123',
        preservedData
      );

      expect(error).toMatchObject({
        sessionId: 'session-123',
        code: 'SESSION_TIMEOUT',
        httpStatus: 410,
        category: 'session'
      });
      
      expect(error.recoveryOptions.canRecover).toBe(true);
      expect(error.recoveryOptions.preservedProgress).toBe(75);
      expect(error.userFriendly).toContain('automatically saved');
    });
  });

  describe('Recovery Guidance (Requirement 8.1, 8.5)', () => {
    
    it('should provide appropriate recovery actions for different error categories', () => {
      const errorCategories = [
        { category: 'validation', expectedAction: 'review_input' },
        { category: 'network', expectedAction: 'check_connection' },
        { category: 'authentication', expectedAction: 'reauthenticate' },
        { category: 'session', expectedAction: 'recover_session' },
        { category: 'animation', expectedAction: 'continue_without_animation' }
      ];

      errorCategories.forEach(({ category, expectedAction }) => {
        const error = { category };
        const guidance = ErrorHandlingService.createRecoveryGuidance(error);
        
        expect(guidance.canRecover).toBe(true);
        expect(guidance.actions.some(action => action.action === expectedAction)).toBe(true);
      });
    });

    it('should estimate recovery times accurately', () => {
      const error = { category: 'network' };
      const guidance = ErrorHandlingService.createRecoveryGuidance(error);
      
      expect(guidance.estimatedRecoveryTime).toBeGreaterThan(0);
      expect(guidance.userMessage).toContain('resolve this issue');
    });
  });
});