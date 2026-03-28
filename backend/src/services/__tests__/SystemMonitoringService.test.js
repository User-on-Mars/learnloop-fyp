/**
 * SystemMonitoringService Tests
 * 
 * Tests for advanced system monitoring and alerting
 * Validates Requirements: 8.3, 7.2
 */

import { jest } from '@jest/globals';
import SystemMonitoringService from '../SystemMonitoringService.js';

// Mock ErrorLoggingService
jest.mock('../ErrorLoggingService.js', () => ({
  default: {
    LOG_LEVELS: {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug'
    },
    logSystemEvent: jest.fn(),
    logPerformance: jest.fn(),
    getSystemHealth: jest.fn(() => ({
      score: 100,
      status: 'healthy',
      issues: []
    })),
    getPerformanceStatistics: jest.fn(() => ({})),
    getErrorStatistics: jest.fn(() => ({
      totalErrors: 0,
      errorRate: 0,
      errorsByCategory: {}
    }))
  }
}));

describe('SystemMonitoringService', () => {
  
  beforeEach(() => {
    // Reset service state
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
  
  describe('start and stop', () => {
    it('should start monitoring successfully', () => {
      expect(SystemMonitoringService.isMonitoring).toBe(false);
      
      SystemMonitoringService.start();
      
      expect(SystemMonitoringService.isMonitoring).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Starting system monitoring...');
    });
    
    it('should not start monitoring if already running', () => {
      SystemMonitoringService.start();
      const firstCall = console.log.mock.calls.length;
      
      SystemMonitoringService.start();
      
      expect(console.warn).toHaveBeenCalledWith('System monitoring is already running');
      expect(console.log.mock.calls.length).toBe(firstCall); // No additional start logs
    });
    
    it('should stop monitoring successfully', () => {
      SystemMonitoringService.start();
      expect(SystemMonitoringService.isMonitoring).toBe(true);
      
      SystemMonitoringService.stop();
      
      expect(SystemMonitoringService.isMonitoring).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Stopping system monitoring...');
    });
  });
  
  describe('recordRequest', () => {
    it('should record successful API request', () => {
      SystemMonitoringService.recordRequest('GET', '/api/skills', 150, 200);
      
      expect(SystemMonitoringService.systemMetrics.requestCount).toBe(1);
      expect(SystemMonitoringService.systemMetrics.errorCount).toBe(0);
    });
    
    it('should record failed API request', () => {
      SystemMonitoringService.recordRequest('POST', '/api/sessions', 300, 500);
      
      expect(SystemMonitoringService.systemMetrics.requestCount).toBe(1);
      expect(SystemMonitoringService.systemMetrics.errorCount).toBe(1);
    });
    
    it('should trigger alert for slow API response', () => {
      const slowDuration = 3000; // 3 seconds, above 2 second threshold
      
      SystemMonitoringService.recordRequest('GET', '/api/skills', slowDuration, 200);
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(1);
      expect(SystemMonitoringService.alertHistory[0].type).toBe('slow_api_response');
      expect(SystemMonitoringService.alertHistory[0].severity).toBe('medium');
    });
  });
  
  describe('recordDatabaseOperation', () => {
    it('should record successful database operation', () => {
      SystemMonitoringService.recordDatabaseOperation('find_user', 50, true);
      
      expect(SystemMonitoringService.systemMetrics.errorCount).toBe(0);
    });
    
    it('should record failed database operation', () => {
      SystemMonitoringService.recordDatabaseOperation('save_session', 200, false);
      
      expect(SystemMonitoringService.systemMetrics.errorCount).toBe(1);
    });
    
    it('should trigger alert for slow database operation', () => {
      const slowDuration = 1500; // Above 1 second threshold
      
      SystemMonitoringService.recordDatabaseOperation('complex_query', slowDuration, true);
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(1);
      expect(SystemMonitoringService.alertHistory[0].type).toBe('slow_database_operation');
    });
  });
  
  describe('recordUnlockCalculation', () => {
    it('should record successful unlock calculation', () => {
      SystemMonitoringService.recordUnlockCalculation('skill123', 'node456', 300, true);
      
      expect(SystemMonitoringService.systemMetrics.errorCount).toBe(0);
    });
    
    it('should record failed unlock calculation', () => {
      SystemMonitoringService.recordUnlockCalculation('skill123', 'node456', 400, false);
      
      expect(SystemMonitoringService.systemMetrics.errorCount).toBe(1);
    });
    
    it('should trigger critical alert for slow unlock calculation', () => {
      const slowDuration = 800; // Above 500ms threshold (Requirement 7.2)
      
      SystemMonitoringService.recordUnlockCalculation('skill123', 'node456', slowDuration, true);
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(1);
      expect(SystemMonitoringService.alertHistory[0].type).toBe('unlock_calculation_timeout');
      expect(SystemMonitoringService.alertHistory[0].severity).toBe('critical');
      expect(SystemMonitoringService.alertHistory[0].data.threshold).toBe(500);
    });
  });
  
  describe('getSystemStatus', () => {
    it('should return comprehensive system status', () => {
      SystemMonitoringService.start();
      SystemMonitoringService.recordRequest('GET', '/api/test', 100, 200);
      
      const status = SystemMonitoringService.getSystemStatus();
      
      expect(status.isMonitoring).toBe(true);
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.systemMetrics.requestCount).toBe(1);
      expect(status.systemMetrics.memoryUsage).toBeDefined();
      expect(status.systemMetrics.cpuUsage).toBeDefined();
      expect(status.recentAlerts).toEqual([]);
    });
  });
  
  describe('alert system', () => {
    it('should record performance alerts correctly', () => {
      // Trigger a performance alert
      SystemMonitoringService._triggerPerformanceAlert('test_performance', {
        operation: 'test_op',
        duration: 1000
      });
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(1);
      
      const alert = SystemMonitoringService.alertHistory[0];
      expect(alert.type).toBe('test_performance');
      expect(alert.severity).toBe('medium');
      expect(alert.category).toBe('performance');
      expect(alert.id).toContain('perf_');
    });
    
    it('should record system alerts correctly', () => {
      SystemMonitoringService._triggerAlert('test_system', {
        metric: 'cpu_usage',
        value: 90
      });
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(1);
      
      const alert = SystemMonitoringService.alertHistory[0];
      expect(alert.type).toBe('test_system');
      expect(alert.severity).toBe('high');
      expect(alert.category).toBe('system');
    });
    
    it('should record critical alerts correctly', () => {
      SystemMonitoringService._triggerCriticalAlert('test_critical', {
        error: 'System failure'
      });
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(1);
      
      const alert = SystemMonitoringService.alertHistory[0];
      expect(alert.type).toBe('test_critical');
      expect(alert.severity).toBe('critical');
      expect(alert.category).toBe('critical');
      expect(alert.id).toContain('critical_');
    });
    
    it('should limit alert history size', () => {
      // Add more than 1000 alerts
      for (let i = 0; i < 1005; i++) {
        SystemMonitoringService._triggerAlert(`test_${i}`, { index: i });
      }
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(1000);
      
      // Check that oldest alerts were removed
      const firstAlert = SystemMonitoringService.alertHistory[0];
      expect(firstAlert.type).toBe('test_5'); // First 5 should be removed
    });
  });
  
  describe('performance history', () => {
    it('should track performance history correctly', () => {
      // Mock performance statistics
      const mockPerformanceStats = {
        unlock_calculation: {
          averageDuration: 300,
          slowOperations: 1
        },
        database_query: {
          averageDuration: 150,
          slowOperations: 0
        }
      };
      
      const ErrorLoggingService = require('../ErrorLoggingService.js').default;
      ErrorLoggingService.getPerformanceStatistics.mockReturnValue(mockPerformanceStats);
      
      SystemMonitoringService._monitorPerformance();
      
      expect(SystemMonitoringService.performanceHistory).toHaveLength(1);
      
      const entry = SystemMonitoringService.performanceHistory[0];
      expect(entry.performance).toEqual(mockPerformanceStats);
      expect(entry.timestamp).toBeDefined();
    });
    
    it('should limit performance history size', () => {
      // Add more than 100 entries
      for (let i = 0; i < 105; i++) {
        SystemMonitoringService.performanceHistory.push({
          timestamp: Date.now() - i * 1000,
          performance: {},
          errors: {}
        });
      }
      
      SystemMonitoringService._monitorPerformance();
      
      expect(SystemMonitoringService.performanceHistory.length).toBeLessThanOrEqual(100);
    });
  });
  
  describe('resource monitoring', () => {
    it('should get resource usage correctly', () => {
      const resourceUsage = SystemMonitoringService._getResourceUsage();
      
      expect(resourceUsage.memory).toBeDefined();
      expect(resourceUsage.memory.used).toBeGreaterThan(0);
      expect(resourceUsage.memory.total).toBeGreaterThan(0);
      expect(resourceUsage.memory.percentage).toBeGreaterThanOrEqual(0);
      
      expect(resourceUsage.cpu).toBeDefined();
      expect(resourceUsage.system).toBeDefined();
      expect(resourceUsage.system.uptime).toBeGreaterThan(0);
    });
  });
  
  describe('cleanup', () => {
    it('should clean up old performance history', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago
      
      SystemMonitoringService.performanceHistory = [
        { timestamp: oldTimestamp, performance: {}, errors: {} },
        { timestamp: recentTimestamp, performance: {}, errors: {} }
      ];
      
      SystemMonitoringService._performCleanup();
      
      expect(SystemMonitoringService.performanceHistory).toHaveLength(1);
      expect(SystemMonitoringService.performanceHistory[0].timestamp).toBe(recentTimestamp);
    });
    
    it('should clean up old alerts', () => {
      const oldTimestamp = new Date(Date.now() - (31 * 24 * 60 * 60 * 1000)).toISOString(); // 31 days ago
      const recentTimestamp = new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)).toISOString(); // 1 day ago
      
      SystemMonitoringService.alertHistory = [
        { timestamp: oldTimestamp, type: 'old_alert' },
        { timestamp: recentTimestamp, type: 'recent_alert' }
      ];
      
      SystemMonitoringService._performCleanup();
      
      expect(SystemMonitoringService.alertHistory).toHaveLength(1);
      expect(SystemMonitoringService.alertHistory[0].type).toBe('recent_alert');
    });
  });
});