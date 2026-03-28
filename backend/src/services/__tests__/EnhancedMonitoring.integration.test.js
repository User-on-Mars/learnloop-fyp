/**
 * Enhanced Monitoring Integration Tests
 * 
 * Tests for task 13.2 implementation:
 * - Structured error logging
 * - Performance monitoring for critical paths
 * - Error alerting for system failures
 * - Health check endpoints and system status monitoring
 * 
 * Validates Requirements: 8.3, 7.2
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import ErrorLoggingService from '../ErrorLoggingService.js';
import SystemMonitoringService from '../SystemMonitoringService.js';
import { 
  healthCheck, 
  monitoringStatus, 
  monitoringDashboard,
  errorHandler 
} from '../../middleware/errorHandler.js';

// Create test app
const app = express();
app.use(express.json());
app.get('/api/health/detailed', healthCheck);
app.get('/api/monitoring/status', monitoringStatus);
app.get('/api/monitoring/dashboard', monitoringDashboard);
app.use(errorHandler);

describe('Enhanced Monitoring Integration (Task 13.2)', () => {
  
  beforeEach(() => {
    // Reset services
    ErrorLoggingService.logBuffer = [];
    ErrorLoggingService.errorCounts.clear();
    ErrorLoggingService.performanceMetrics.clear();
    
    SystemMonitoringService.stop();
    SystemMonitoringService.systemMetrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      activeConnections: 0,
      lastHealthCheck: null
    };
    SystemMonitoringService.alertHistory = [];
    SystemMonitoringService.performanceHistory = [];
    SystemMonitoringService.incidentCounter = 0;
    
    // Mock console methods
    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  });
  
  afterEach(() => {
    SystemMonitoringService.stop();
  });

  describe('Structured Error Logging Enhancement', () => {
    it('should log errors with enhanced context and metadata', async () => {
      const error = {
        message: 'Database connection timeout',
        code: 'DB_TIMEOUT',
        category: 'database',
        stack: 'Error stack trace'
      };
      
      const context = {
        userId: 'user123',
        operation: 'unlock_calculation',
        nodeId: 'node456',
        skillId: 'skill789',
        requestId: 'req_123',
        criticalPath: true
      };
      
      const fingerprint = await ErrorLoggingService.logError(error, context);
      
      expect(fingerprint).toBeDefined();
      expect(ErrorLoggingService.logBuffer).toHaveLength(1);
      
      const logEntry = ErrorLoggingService.logBuffer[0];
      expect(logEntry.level).toBe('error');
      expect(logEntry.category).toBe('database');
      expect(logEntry.context.operation).toBe('unlock_calculation');
      expect(logEntry.context.criticalPath).toBe(true);
      expect(logEntry.severity).toBeDefined();
      expect(logEntry.fingerprint).toBe(fingerprint);
    });

    it('should provide enhanced alert notifications for critical errors', async () => {
      const criticalError = {
        message: 'Unlock calculation engine failure',
        code: 'UNLOCK_ENGINE_FAILURE',
        category: 'unlock'
      };
      
      const context = {
        operation: 'calculateNextUnlocks',
        skillId: 'skill123',
        nodeId: 'node456'
      };
      
      await ErrorLoggingService.logError(criticalError, context);
      
      const logEntry = ErrorLoggingService.logBuffer[0];
      expect(logEntry.severity).toBe('high'); // Unlock failures are high severity
      
      // Verify enhanced alert context would be generated
      expect(logEntry.context.operation).toBe('calculateNextUnlocks');
      expect(logEntry.category).toBe('unlock');
    });
  });

  describe('Performance Monitoring for Critical Paths (Requirement 7.2)', () => {
    it('should monitor unlock calculation performance within 500ms threshold', async () => {
      SystemMonitoringService.start();
      
      // Test successful unlock calculation within threshold
      SystemMonitoringService.recordUnlockCalculation('skill123', 'node456', 300, true);
      
      expect(SystemMonitoringService.systemMetrics.errorCount).toBe(0);
      expect(SystemMonitoringService.alertHistory).toHaveLength(0);
    });

    it('should trigger critical alert for slow unlock calculations', async () => {
      SystemMonitoringService.start();
      
      // Test unlock calculation exceeding 500ms threshold (Requirement 7.2)
      SystemMonitoringService.recordUnlockCalculation('skill123', 'node456', 800, true);
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(1);
      
      const alert = SystemMonitoringService.alertHistory[0];
      expect(alert.type).toBe('unlock_calculation_timeout');
      expect(alert.severity).toBe('critical');
      expect(alert.data.threshold).toBe(500);
      expect(alert.data.duration).toBe(800);
      expect(alert.data.userImpact).toBe('high');
    });

    it('should provide performance optimization recommendations', async () => {
      SystemMonitoringService.start();
      
      // Trigger slow unlock calculation
      SystemMonitoringService.recordUnlockCalculation('skill123', 'node456', 2000, true);
      
      const alert = SystemMonitoringService.alertHistory[0];
      expect(alert.data.recommendedActions).toContain('URGENT: Review unlock algorithm complexity');
      expect(alert.data.recommendedActions).toContain('URGENT: Check database query optimization');
    });

    it('should track performance metrics for all critical operations', async () => {
      // Test database operation monitoring
      SystemMonitoringService.recordDatabaseOperation('find_nodes', 1200, true);
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(1);
      expect(SystemMonitoringService.alertHistory[0].type).toBe('slow_database_operation');
      
      // Test API request monitoring
      SystemMonitoringService.recordRequest('GET', '/api/skills', 2500, 200);
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(2);
      expect(SystemMonitoringService.alertHistory[1].type).toBe('slow_api_response');
    });
  });

  describe('Error Alerting for System Failures', () => {
    it('should provide comprehensive alert context for system failures', async () => {
      const systemError = {
        message: 'Database connection pool exhausted',
        code: 'DATABASE_CONNECTION_FAILED',
        category: 'database'
      };
      
      await ErrorLoggingService.logError(systemError, {
        operation: 'system_critical',
        affectedUsers: 'all'
      });
      
      const logEntry = ErrorLoggingService.logBuffer[0];
      expect(logEntry.severity).toBe('critical');
      
      // Verify system health would be included in alert
      const health = ErrorLoggingService.getSystemHealth();
      expect(health.score).toBeLessThan(100); // Should be impacted by critical error
    });

    it('should escalate alerts based on frequency and severity', async () => {
      // Simulate multiple critical errors
      for (let i = 0; i < 5; i++) {
        await ErrorLoggingService.logError({
          message: `Critical error ${i}`,
          code: 'CRITICAL_ERROR',
          category: 'system'
        });
      }
      
      const health = ErrorLoggingService.getSystemHealth();
      expect(health.score).toBeLessThan(70); // Should trigger degraded status
      expect(health.issues.some(issue => issue.type === 'high_error_rate')).toBe(true);
    });
  });

  describe('Health Check Endpoints Enhancement', () => {
    it('should provide comprehensive health status via /api/health/detailed', async () => {
      SystemMonitoringService.start();
      
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);
      
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('requirements');
      
      // Verify critical path monitoring
      expect(response.body.performance).toHaveProperty('criticalPaths');
      expect(response.body.requirements).toHaveProperty('unlockCalculationPerformance');
    });

    it('should provide monitoring dashboard via /api/monitoring/dashboard', async () => {
      SystemMonitoringService.start();
      
      // Add some performance data
      await ErrorLoggingService.logPerformance('unlock_calculation', 400);
      await ErrorLoggingService.logPerformance('database_operation', 800);
      
      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .expect(200);
      
      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('criticalPaths');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('resources');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('compliance');
      expect(response.body).toHaveProperty('recommendations');
      
      // Verify Requirement 7.2 compliance tracking
      expect(response.body.criticalPaths).toHaveProperty('unlockCalculations');
      expect(response.body.criticalPaths.unlockCalculations).toHaveProperty('requirement');
      expect(response.body.criticalPaths.unlockCalculations.requirement).toContain('500ms');
      expect(response.body.criticalPaths.unlockCalculations.requirement).toContain('Requirement 7.2');
    });

    it('should return appropriate HTTP status codes based on system health', async () => {
      SystemMonitoringService.start();
      
      // Test healthy system
      let response = await request(app)
        .get('/api/health/detailed')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      
      // Simulate critical performance issue
      SystemMonitoringService.recordUnlockCalculation('skill123', 'node456', 2000, true);
      
      // Health check should still return 200 but with warnings
      response = await request(app)
        .get('/api/health/detailed');
      
      expect(response.status).toBe(200); // Still operational but with issues
      expect(response.body.alerts.criticalCount).toBeGreaterThan(0);
    });
  });

  describe('System Status Monitoring Integration', () => {
    it('should integrate all monitoring services seamlessly', async () => {
      SystemMonitoringService.start();
      
      // Simulate various system activities
      SystemMonitoringService.recordRequest('POST', '/api/sessions', 150, 200);
      SystemMonitoringService.recordDatabaseOperation('save_session', 200, true);
      SystemMonitoringService.recordUnlockCalculation('skill123', 'node456', 400, true);
      
      await ErrorLoggingService.logPerformance('api_request', 150);
      await ErrorLoggingService.logSystemEvent('session_created', { userId: 'user123' });
      
      const systemStatus = SystemMonitoringService.getSystemStatus();
      const health = ErrorLoggingService.getSystemHealth();
      const performanceStats = ErrorLoggingService.getPerformanceStatistics();
      
      // Verify integration
      expect(systemStatus.isMonitoring).toBe(true);
      expect(systemStatus.systemMetrics.requestCount).toBe(1);
      expect(health.score).toBe(100); // Should be healthy
      expect(performanceStats).toHaveProperty('api_request');
      expect(performanceStats).toHaveProperty('unlock_calculation');
    });

    it('should provide actionable recommendations based on system state', async () => {
      SystemMonitoringService.start();
      
      // Simulate performance issues
      await ErrorLoggingService.logPerformance('unlock_calculation', 1200); // 2.4x threshold
      
      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .expect(200);
      
      expect(response.body.recommendations).toBeDefined();
      expect(response.body.recommendations.length).toBeGreaterThan(0);
      
      const perfRecommendation = response.body.recommendations.find(r => 
        r.category === 'performance' && r.title.includes('unlock')
      );
      
      expect(perfRecommendation).toBeDefined();
      expect(perfRecommendation.priority).toBe('high');
      expect(perfRecommendation.actions).toContain('Review unlock algorithm complexity');
    });
  });

  describe('Animation System Resilience (Requirement 8.3)', () => {
    it('should handle animation failures gracefully with enhanced logging', () => {
      const animationError = new Error('Canvas context not available');
      
      const result = ErrorLoggingService.handleAnimationFailure(
        'node123', 
        'unlock', 
        animationError,
        { duration: 500, easing: 'ease-in-out' }
      );
      
      expect(result.nodeId).toBe('node123');
      expect(result.animationType).toBe('unlock');
      expect(result.category).toBe('animation');
      expect(result.fallbackApplied).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Compliance and Requirements Tracking', () => {
    it('should track compliance with Requirement 7.2 (unlock performance)', async () => {
      // Test compliant performance
      await ErrorLoggingService.logPerformance('unlock_calculation', 400);
      
      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .expect(200);
      
      expect(response.body.compliance.requirements['7.2_unlock_performance']).toBeDefined();
      expect(response.body.compliance.requirements['7.2_unlock_performance'].status).toBe('compliant');
      expect(response.body.compliance.requirements['7.2_unlock_performance'].current).toBe(400);
      expect(response.body.compliance.requirements['7.2_unlock_performance'].threshold).toBe(500);
    });

    it('should track compliance with Requirement 8.3 (animation resilience)', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .expect(200);
      
      expect(response.body.compliance.requirements['8.3_animation_resilience']).toBeDefined();
      expect(response.body.compliance.requirements['8.3_animation_resilience'].status).toBe('compliant');
    });

    it('should calculate overall compliance percentage', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .expect(200);
      
      expect(response.body.compliance.overallCompliance).toBeDefined();
      expect(response.body.compliance.overallCompliance.percentage).toBeGreaterThanOrEqual(0);
      expect(response.body.compliance.overallCompliance.percentage).toBeLessThanOrEqual(100);
      expect(response.body.compliance.overallCompliance.status).toBeDefined();
    });
  });
});