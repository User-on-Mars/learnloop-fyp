/**
 * ErrorLoggingService Tests
 * 
 * Tests for structured error logging and monitoring
 * Validates Requirements: 8.3, 7.2
 */

import { jest } from '@jest/globals';
import ErrorLoggingService from '../ErrorLoggingService.js';
import fs from 'fs/promises';

// Mock fs module
jest.mock('fs/promises');

describe('ErrorLoggingService', () => {
  
  beforeEach(() => {
    // Reset the service state
    ErrorLoggingService.logBuffer = [];
    ErrorLoggingService.errorCounts.clear();
    ErrorLoggingService.performanceMetrics.clear();
    
    // Mock console methods
    global.console = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn()
    };
    
    // Mock fs methods
    fs.mkdir.mockResolvedValue();
    fs.appendFile.mockResolvedValue();
  });
  
  describe('logError', () => {
    it('should log error with structured format', async () => {
      const error = {
        message: 'Database connection failed',
        code: 'DB_CONNECTION_ERROR',
        category: 'database',
        stack: 'Error stack trace'
      };
      
      const context = {
        userId: 'user123',
        operation: 'save_session',
        nodeId: 'node456'
      };
      
      const fingerprint = await ErrorLoggingService.logError(error, context);
      
      expect(fingerprint).toBeDefined();
      expect(ErrorLoggingService.logBuffer).toHaveLength(1);
      
      const logEntry = ErrorLoggingService.logBuffer[0];
      expect(logEntry.level).toBe('error');
      expect(logEntry.message).toBe(error.message);
      expect(logEntry.code).toBe(error.code);
      expect(logEntry.context.userId).toBe('user123');
      expect(logEntry.context.operation).toBe('save_session');
      expect(logEntry.severity).toBeDefined();
      expect(logEntry.fingerprint).toBe(fingerprint);
    });
    
    it('should determine correct severity levels', async () => {
      const criticalError = {
        message: 'Database connection failed',
        code: 'DATABASE_CONNECTION_FAILED'
      };
      
      const validationError = {
        message: 'Invalid input',
        category: 'validation'
      };
      
      await ErrorLoggingService.logError(criticalError);
      await ErrorLoggingService.logError(validationError);
      
      expect(ErrorLoggingService.logBuffer[0].severity).toBe('critical');
      expect(ErrorLoggingService.logBuffer[1].severity).toBe('medium');
    });
    
    it('should update error counts for alerting', async () => {
      const error = {
        message: 'Test error',
        code: 'TEST_ERROR',
        category: 'test'
      };
      
      await ErrorLoggingService.logError(error);
      await ErrorLoggingService.logError(error);
      
      expect(ErrorLoggingService.errorCounts.size).toBeGreaterThan(0);
      
      // Check that error count increased
      const errorCountEntries = Array.from(ErrorLoggingService.errorCounts.values());
      expect(errorCountEntries.some(entry => entry.count >= 2)).toBe(true);
    });
  });
  
  describe('logPerformance', () => {
    it('should log performance metrics for operations', async () => {
      const operation = 'unlock_calculation';
      const duration = 300;
      const context = { userId: 'user123', nodeId: 'node456' };
      
      const logEntry = await ErrorLoggingService.logPerformance(operation, duration, context);
      
      expect(logEntry.operation).toBe(operation);
      expect(logEntry.duration).toBe(duration);
      expect(logEntry.threshold).toBe(500); // UNLOCK_CALCULATION threshold
      expect(logEntry.isSlowOperation).toBe(false);
      expect(logEntry.performanceRatio).toBe(0.6); // 300/500
      expect(logEntry.level).toBe('info');
    });
    
    it('should identify slow operations', async () => {
      const operation = 'unlock_calculation';
      const duration = 800; // Above 500ms threshold
      
      const logEntry = await ErrorLoggingService.logPerformance(operation, duration);
      
      expect(logEntry.isSlowOperation).toBe(true);
      expect(logEntry.level).toBe('warn');
      expect(logEntry.performanceRatio).toBe(1.6);
    });
    
    it('should update performance metrics', async () => {
      await ErrorLoggingService.logPerformance('test_operation', 100);
      await ErrorLoggingService.logPerformance('test_operation', 200);
      
      const metrics = ErrorLoggingService.performanceMetrics.get('test_operation');
      expect(metrics.count).toBe(2);
      expect(metrics.durations).toEqual([100, 200]);
      expect(metrics.totalDuration).toBe(300);
    });
  });
  
  describe('getErrorStatistics', () => {
    it('should calculate error statistics correctly', async () => {
      // Log some test errors
      await ErrorLoggingService.logError({ 
        message: 'Error 1', 
        code: 'ERROR_1', 
        category: 'validation' 
      });
      await ErrorLoggingService.logError({ 
        message: 'Error 2', 
        code: 'ERROR_2', 
        category: 'database' 
      });
      await ErrorLoggingService.logError({ 
        message: 'Error 3', 
        code: 'ERROR_1', 
        category: 'validation' 
      });
      
      const stats = ErrorLoggingService.getErrorStatistics();
      
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorRate).toBeGreaterThan(0);
      expect(stats.errorsByCategory).toBeDefined();
      expect(stats.errorsBySeverity).toBeDefined();
      expect(stats.topErrors).toBeDefined();
    });
  });
  
  describe('getPerformanceStatistics', () => {
    it('should calculate performance statistics correctly', async () => {
      // Log some performance data
      await ErrorLoggingService.logPerformance('unlock_calculation', 300);
      await ErrorLoggingService.logPerformance('unlock_calculation', 600);
      await ErrorLoggingService.logPerformance('database_query', 800);
      
      const stats = ErrorLoggingService.getPerformanceStatistics();
      
      expect(stats.unlock_calculation).toBeDefined();
      expect(stats.unlock_calculation.count).toBe(2);
      expect(stats.unlock_calculation.averageDuration).toBe(450);
      expect(stats.unlock_calculation.minDuration).toBe(300);
      expect(stats.unlock_calculation.maxDuration).toBe(600);
      expect(stats.unlock_calculation.slowOperations).toBe(1); // 600ms > 500ms threshold
      
      expect(stats.database_query).toBeDefined();
      expect(stats.database_query.count).toBe(1);
    });
  });
  
  describe('getSystemHealth', () => {
    it('should return healthy status with no issues', () => {
      const health = ErrorLoggingService.getSystemHealth();
      
      expect(health.score).toBe(100);
      expect(health.status).toBe('healthy');
      expect(health.issues).toHaveLength(0);
      expect(health.errorStats).toBeDefined();
      expect(health.performanceStats).toBeDefined();
    });
    
    it('should detect high error rate issues', async () => {
      // Simulate high error rate
      for (let i = 0; i < 15; i++) {
        await ErrorLoggingService.logError({
          message: `Error ${i}`,
          code: 'HIGH_FREQUENCY_ERROR',
          category: 'test'
        });
      }
      
      const health = ErrorLoggingService.getSystemHealth();
      
      expect(health.score).toBeLessThan(100);
      expect(health.status).not.toBe('healthy');
      expect(health.issues.some(issue => issue.type === 'high_error_rate')).toBe(true);
    });
    
    it('should detect critical errors', async () => {
      await ErrorLoggingService.logError({
        message: 'Database connection failed',
        code: 'DATABASE_CONNECTION_FAILED',
        category: 'database'
      });
      
      const health = ErrorLoggingService.getSystemHealth();
      
      expect(health.score).toBeLessThan(100);
      expect(health.issues.some(issue => issue.type === 'critical_errors')).toBe(true);
    });
    
    it('should detect performance degradation', async () => {
      // Log slow operations
      await ErrorLoggingService.logPerformance('unlock_calculation', 3000); // 6x threshold
      
      const health = ErrorLoggingService.getSystemHealth();
      
      expect(health.score).toBeLessThan(100);
      expect(health.issues.some(issue => issue.type === 'performance_degradation')).toBe(true);
    });
  });
  
  describe('_determineSeverity', () => {
    it('should classify database connection errors as critical', () => {
      const error = { code: 'DATABASE_CONNECTION_FAILED' };
      const severity = ErrorLoggingService._determineSeverity(error, {});
      
      expect(severity).toBe('critical');
    });
    
    it('should classify authentication errors as high', () => {
      const error = { code: 'AUTHENTICATION_FAILED' };
      const severity = ErrorLoggingService._determineSeverity(error, {});
      
      expect(severity).toBe('high');
    });
    
    it('should classify validation errors as medium', () => {
      const error = { category: 'validation' };
      const severity = ErrorLoggingService._determineSeverity(error, {});
      
      expect(severity).toBe('medium');
    });
    
    it('should classify unknown errors as low', () => {
      const error = { message: 'Unknown error' };
      const severity = ErrorLoggingService._determineSeverity(error, {});
      
      expect(severity).toBe('low');
    });
  });
  
  describe('_flushLogs', () => {
    it('should write logs to file', async () => {
      // Add some logs to buffer
      ErrorLoggingService.logBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Test error'
      });
      
      ErrorLoggingService.logFilePath = '/test/path/logs.log';
      
      await ErrorLoggingService._flushLogs();
      
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/test/path/logs.log',
        expect.stringContaining('Test error')
      );
      expect(ErrorLoggingService.logBuffer).toHaveLength(0);
    });
    
    it('should handle file write errors gracefully', async () => {
      fs.appendFile.mockRejectedValue(new Error('Write failed'));
      
      ErrorLoggingService.logBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Test error'
      });
      
      await ErrorLoggingService._flushLogs();
      
      // Logs should be put back in buffer on write failure
      expect(ErrorLoggingService.logBuffer).toHaveLength(1);
    });
  });
});