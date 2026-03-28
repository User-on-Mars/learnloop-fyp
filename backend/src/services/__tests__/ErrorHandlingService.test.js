/**
 * ErrorHandlingService Tests
 * 
 * Tests for comprehensive error handling and recovery system
 * Validates Requirements: 8.1, 8.3, 8.4, 8.5
 */

import { jest } from '@jest/globals';
import ErrorHandlingService from '../ErrorHandlingService.js';

describe('ErrorHandlingService', () => {
  
  describe('createValidationError', () => {
    it('should create descriptive validation error for required field', () => {
      const error = ErrorHandlingService.createValidationError(
        'title',
        '',
        { type: 'required' }
      );
      
      expect(error.field).toBe('title');
      expect(error.message).toBe('title is required and cannot be empty');
      expect(error.code).toBe('VALIDATION_REQUIRED');
      expect(error.category).toBe(ErrorHandlingService.ERROR_CATEGORIES.VALIDATION);
      expect(error.userFriendly).toBe('title is required and cannot be empty');
    });
    
    it('should create descriptive validation error for range constraint', () => {
      const error = ErrorHandlingService.createValidationError(
        'understanding',
        6,
        { type: 'range', min: 1, max: 5 }
      );
      
      expect(error.field).toBe('understanding');
      expect(error.message).toBe('understanding must be between 1 and 5');
      expect(error.code).toBe('VALIDATION_RANGE');
      expect(error.value).toBe(6);
    });
    
    it('should create descriptive validation error for maxLength constraint', () => {
      const longText = 'a'.repeat(600);
      const error = ErrorHandlingService.createValidationError(
        'notes',
        longText,
        { type: 'maxLength', max: 500 }
      );
      
      expect(error.field).toBe('notes');
      expect(error.message).toBe('notes must be no more than 500 characters long');
      expect(error.code).toBe('VALIDATION_MAXLENGTH');
      expect(error.value).toBe(longText.substring(0, 100) + '...');
    });
  });
  
  describe('createReflectionValidationErrors', () => {
    it('should validate understanding score range', () => {
      const reflectionData = {
        understanding: 6,
        difficulty: 3,
        notes: 'Good session'
      };
      
      const errors = ErrorHandlingService.createReflectionValidationErrors(reflectionData);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('understanding');
      expect(errors[0].message).toContain('between 1 and 5');
      expect(errors[0].context.hint).toContain('Rate your understanding');
    });
    
    it('should validate difficulty score range', () => {
      const reflectionData = {
        understanding: 4,
        difficulty: 0,
        notes: 'Easy session'
      };
      
      const errors = ErrorHandlingService.createReflectionValidationErrors(reflectionData);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('difficulty');
      expect(errors[0].context.hint).toContain('Rate the difficulty');
    });
    
    it('should validate notes length', () => {
      const longNotes = 'a'.repeat(600);
      const reflectionData = {
        understanding: 4,
        difficulty: 3,
        notes: longNotes
      };
      
      const errors = ErrorHandlingService.createReflectionValidationErrors(reflectionData);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('notes');
      expect(errors[0].context.currentLength).toBe(600);
    });
    
    it('should validate multiple fields with errors', () => {
      const reflectionData = {
        understanding: 6,
        difficulty: 0,
        notes: 'a'.repeat(600),
        completionConfidence: -1
      };
      
      const errors = ErrorHandlingService.createReflectionValidationErrors(reflectionData);
      
      expect(errors).toHaveLength(4);
      expect(errors.map(e => e.field)).toContain('understanding');
      expect(errors.map(e => e.field)).toContain('difficulty');
      expect(errors.map(e => e.field)).toContain('notes');
      expect(errors.map(e => e.field)).toContain('completionConfidence');
    });
    
    it('should return empty array for valid reflection data', () => {
      const reflectionData = {
        understanding: 4,
        difficulty: 3,
        notes: 'Good learning session',
        completionConfidence: 4,
        tags: ['javascript', 'functions']
      };
      
      const errors = ErrorHandlingService.createReflectionValidationErrors(reflectionData);
      
      expect(errors).toHaveLength(0);
    });
  });
  
  describe('createUnlockError', () => {
    it('should create unlock error with progression guidance', () => {
      const validationResult = {
        isValid: false,
        reason: 'Previous node in sequence must be completed',
        requiredNodes: ['node123']
      };
      
      const error = ErrorHandlingService.createUnlockError('node456', 'user789', validationResult);
      
      expect(error.nodeId).toBe('node456');
      expect(error.userId).toBe('user789');
      expect(error.code).toBe('UNLOCK_FORBIDDEN');
      expect(error.httpStatus).toBe(403);
      expect(error.requiredActions).toBeDefined();
      expect(error.userFriendly).toContain('Complete the prerequisite nodes');
    });
    
    it('should return null for valid unlock attempt', () => {
      const validationResult = {
        isValid: true,
        reason: 'Linear progression requirements met'
      };
      
      const error = ErrorHandlingService.createUnlockError('node456', 'user789', validationResult);
      
      expect(error).toBeNull();
    });
  });
  
  describe('withDatabaseRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await ErrorHandlingService.withDatabaseRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should retry on database errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('MongoNetworkError'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValue('success');
      
      const result = await ErrorHandlingService.withDatabaseRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should not retry validation errors', async () => {
      const validationError = new Error('VALIDATION_ERROR: Invalid input');
      const operation = jest.fn().mockRejectedValue(validationError);
      
      try {
        await ErrorHandlingService.withDatabaseRetry(operation);
        fail('Expected method to throw');
      } catch (error) {
        // Should throw enhanced error immediately without retries
        expect(error.context).toBeDefined();
        expect(error.attempt).toBe(1);
      }
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should exhaust retries and throw enhanced error', async () => {
      const dbError = new Error('Database connection failed');
      const operation = jest.fn().mockRejectedValue(dbError);
      
      await expect(ErrorHandlingService.withDatabaseRetry(operation))
        .rejects.toMatchObject({
          code: 'RETRY_EXHAUSTED',
          totalAttempts: 3,
          originalError: dbError
        });
      
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('handleAnimationFailure', () => {
    let mockElement;
    
    beforeEach(() => {
      mockElement = {
        style: {},
        querySelector: jest.fn()
      };
      
      // Mock DOM methods
      global.document = {
        querySelector: jest.fn().mockReturnValue(mockElement)
      };
      
      global.console = {
        warn: jest.fn(),
        error: jest.fn()
      };
    });
    
    it('should apply CSS fallback for unlock animation', () => {
      const error = new Error('WebGL context lost');
      
      const result = ErrorHandlingService.handleAnimationFailure(
        'node123',
        'unlock',
        error
      );
      
      expect(result.nodeId).toBe('node123');
      expect(result.animationType).toBe('unlock');
      expect(result.fallbackApplied).toBe(true);
      expect(result.fallbackType).toBe('css_transition');
      expect(mockElement.style.transition).toContain('ease-in-out');
    });
    
    it('should handle missing node element gracefully', () => {
      global.document.querySelector.mockReturnValue(null);
      const error = new Error('Animation failed');
      
      const result = ErrorHandlingService.handleAnimationFailure(
        'nonexistent',
        'unlock',
        error
      );
      
      expect(result.fallbackApplied).toBe(false);
      expect(result.fallbackType).toBe('none');
    });
  });
  
  describe('createSessionTimeoutError', () => {
    it('should create session timeout error with recovery options', () => {
      const preservedData = {
        currentProgress: 75,
        duration: 3600
      };
      
      const error = ErrorHandlingService.createSessionTimeoutError('session123', preservedData);
      
      expect(error.sessionId).toBe('session123');
      expect(error.code).toBe('SESSION_TIMEOUT');
      expect(error.httpStatus).toBe(410);
      expect(error.preservedData).toEqual(preservedData);
      expect(error.recoveryOptions.canRecover).toBe(true);
      expect(error.recoveryOptions.preservedProgress).toBe(75);
      expect(error.userFriendly).toContain('automatically saved');
    });
  });
  
  describe('_calculateBackoffDelay', () => {
    it('should calculate exponential backoff with jitter', () => {
      const delay1 = ErrorHandlingService._calculateBackoffDelay(1);
      const delay2 = ErrorHandlingService._calculateBackoffDelay(2);
      const delay3 = ErrorHandlingService._calculateBackoffDelay(3);
      
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1100); // Base + 10% jitter
      
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2200);
      
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(4400);
    });
    
    it('should respect maximum delay', () => {
      const delay = ErrorHandlingService._calculateBackoffDelay(10);
      
      expect(delay).toBeLessThanOrEqual(ErrorHandlingService.RETRY_CONFIG.maxDelay);
    });
  });
  
  describe('_isNonRetryableError', () => {
    it('should identify validation errors as non-retryable', () => {
      const validationError = new Error('VALIDATION_ERROR');
      
      expect(ErrorHandlingService._isNonRetryableError(validationError)).toBe(true);
    });
    
    it('should identify client errors as non-retryable', () => {
      const clientError = { status: 400, message: 'Bad Request' };
      
      expect(ErrorHandlingService._isNonRetryableError(clientError)).toBe(true);
    });
    
    it('should identify server errors as retryable', () => {
      const serverError = { status: 500, message: 'Internal Server Error' };
      
      expect(ErrorHandlingService._isNonRetryableError(serverError)).toBe(false);
    });
  });
});