/**
 * System Monitoring Service - Advanced monitoring and alerting
 * 
 * Implements Requirements: 8.3, 7.2
 * 
 * This service provides:
 * - Real-time system health monitoring
 * - Performance threshold alerting
 * - Resource usage tracking
 * - Automated incident response
 * - Integration with external monitoring systems
 */

import ErrorLoggingService from './ErrorLoggingService.js';
import os from 'os';
import { performance } from 'perf_hooks';

class SystemMonitoringService {
  
  // Monitoring intervals (in milliseconds)
  static MONITORING_INTERVALS = {
    HEALTH_CHECK: 30000,      // 30 seconds
    PERFORMANCE: 60000,       // 1 minute
    RESOURCE_USAGE: 120000,   // 2 minutes
    CLEANUP: 300000           // 5 minutes
  };

  // Alert thresholds
  static ALERT_THRESHOLDS = {
    CPU_USAGE: 80,            // 80% CPU usage
    MEMORY_USAGE: 85,         // 85% memory usage
    ERROR_RATE: 10,           // 10 errors per minute
    RESPONSE_TIME: 2000,      // 2 seconds average response time
    DISK_USAGE: 90,           // 90% disk usage
    ACTIVE_CONNECTIONS: 1000  // 1000 concurrent connections
  };

  // Critical operation thresholds (from Requirements 7.2)
  static CRITICAL_THRESHOLDS = {
    UNLOCK_CALCULATION: 500,  // 500ms for unlock calculations
    DATABASE_QUERY: 1000,     // 1 second for database queries
    SESSION_OPERATION: 1500,  // 1.5 seconds for session operations
    API_RESPONSE: 2000        // 2 seconds for API responses
  };

  constructor() {
    this.isMonitoring = false;
    this.monitoringIntervals = {};
    this.systemMetrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      activeConnections: 0,
      lastHealthCheck: null
    };
    this.performanceHistory = [];
    this.alertHistory = [];
    this.incidentCounter = 0;
  }

  /**
   * Start system monitoring
   */
  start() {
    if (this.isMonitoring) {
      console.warn('System monitoring is already running');
      return;
    }

    console.log('Starting system monitoring...');
    this.isMonitoring = true;

    // Start monitoring intervals
    this.monitoringIntervals.healthCheck = setInterval(
      () => this._performHealthCheck(),
      SystemMonitoringService.MONITORING_INTERVALS.HEALTH_CHECK
    );

    this.monitoringIntervals.performance = setInterval(
      () => this._monitorPerformance(),
      SystemMonitoringService.MONITORING_INTERVALS.PERFORMANCE
    );

    this.monitoringIntervals.resources = setInterval(
      () => this._monitorResourceUsage(),
      SystemMonitoringService.MONITORING_INTERVALS.RESOURCE_USAGE
    );

    this.monitoringIntervals.cleanup = setInterval(
      () => this._performCleanup(),
      SystemMonitoringService.MONITORING_INTERVALS.CLEANUP
    );

    // Initial health check
    this._performHealthCheck();

    ErrorLoggingService.logSystemEvent('monitoring_started', {
      intervals: SystemMonitoringService.MONITORING_INTERVALS,
      thresholds: SystemMonitoringService.ALERT_THRESHOLDS
    });
  }

  /**
   * Stop system monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      console.warn('System monitoring is not running');
      return;
    }

    console.log('Stopping system monitoring...');
    this.isMonitoring = false;

    // Clear all intervals
    Object.values(this.monitoringIntervals).forEach(interval => {
      clearInterval(interval);
    });
    this.monitoringIntervals = {};

    ErrorLoggingService.logSystemEvent('monitoring_stopped', {
      uptime: Date.now() - this.systemMetrics.startTime,
      totalRequests: this.systemMetrics.requestCount,
      totalErrors: this.systemMetrics.errorCount
    });
  }

  /**
   * Record API request metrics
   */
  recordRequest(method, endpoint, duration, statusCode) {
    this.systemMetrics.requestCount++;
    
    if (statusCode >= 400) {
      this.systemMetrics.errorCount++;
    }

    // Check for slow API responses
    if (duration > SystemMonitoringService.CRITICAL_THRESHOLDS.API_RESPONSE) {
      this._triggerPerformanceAlert('slow_api_response', {
        method,
        endpoint,
        duration,
        threshold: SystemMonitoringService.CRITICAL_THRESHOLDS.API_RESPONSE
      });
    }

    // Log performance metrics
    ErrorLoggingService.logPerformance('api_request', duration, {
      method,
      endpoint,
      statusCode
    });
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(operation, duration, success = true) {
    if (!success) {
      this.systemMetrics.errorCount++;
    }

    // Check for slow database operations
    if (duration > SystemMonitoringService.CRITICAL_THRESHOLDS.DATABASE_QUERY) {
      this._triggerPerformanceAlert('slow_database_operation', {
        operation,
        duration,
        threshold: SystemMonitoringService.CRITICAL_THRESHOLDS.DATABASE_QUERY,
        success
      });
    }

    ErrorLoggingService.logPerformance('database_operation', duration, {
      operation,
      success
    });
  }

  /**
   * Record unlock calculation metrics (Requirement 7.2)
   */
  recordUnlockCalculation(skillId, nodeId, duration, success = true) {
    if (!success) {
      this.systemMetrics.errorCount++;
    }

    // Critical: Unlock calculations must complete within 500ms (Requirement 7.2)
    if (duration > SystemMonitoringService.CRITICAL_THRESHOLDS.UNLOCK_CALCULATION) {
      this._triggerCriticalAlert('unlock_calculation_timeout', {
        skillId,
        nodeId,
        duration,
        threshold: SystemMonitoringService.CRITICAL_THRESHOLDS.UNLOCK_CALCULATION,
        success,
        performanceImpact: this._calculateUnlockPerformanceImpact(duration),
        systemContext: this._getSystemContext(),
        userImpact: 'high', // Unlock calculations are critical path
        recommendedActions: this._getUnlockOptimizationRecommendations(duration)
      });
    }

    // Log performance with enhanced context
    ErrorLoggingService.logPerformance('unlock_calculation', duration, {
      skillId,
      nodeId,
      success,
      criticalPath: true,
      userFacing: true,
      performanceCategory: 'core_functionality'
    });
  }

  /**
   * Calculate unlock performance impact
   * @private
   */
  _calculateUnlockPerformanceImpact(duration) {
    const threshold = SystemMonitoringService.CRITICAL_THRESHOLDS.UNLOCK_CALCULATION;
    const ratio = duration / threshold;
    
    return {
      performanceRatio: ratio,
      delayCategory: ratio > 4 ? 'severe' : ratio > 2 ? 'significant' : 'moderate',
      userExperienceImpact: ratio > 2 ? 'poor' : 'degraded',
      estimatedUserFrustration: ratio > 3 ? 'high' : ratio > 2 ? 'medium' : 'low'
    };
  }

  /**
   * Get system context for alerts
   * @private
   */
  _getSystemContext() {
    const memoryUsage = process.memoryUsage();
    const resourceUsage = this._getResourceUsage();
    
    return {
      memoryPressure: (memoryUsage.heapUsed / memoryUsage.heapTotal) > 0.8,
      systemLoad: resourceUsage.cpu.loadAverage,
      activeConnections: this.systemMetrics.activeConnections,
      recentErrorRate: this._calculateRecentErrorRate(),
      uptime: process.uptime()
    };
  }

  /**
   * Get unlock optimization recommendations
   * @private
   */
  _getUnlockOptimizationRecommendations(duration) {
    const recommendations = [];
    const threshold = SystemMonitoringService.CRITICAL_THRESHOLDS.UNLOCK_CALCULATION;
    const ratio = duration / threshold;

    if (ratio > 4) {
      recommendations.push('URGENT: Review unlock algorithm complexity');
      recommendations.push('URGENT: Check database query optimization');
      recommendations.push('URGENT: Consider caching unlock states');
    } else if (ratio > 2) {
      recommendations.push('Optimize database indexes for progression queries');
      recommendations.push('Review unlock calculation logic');
      recommendations.push('Consider implementing unlock result caching');
    } else {
      recommendations.push('Monitor for patterns in slow unlock calculations');
      recommendations.push('Review system resource usage during unlock operations');
    }

    return recommendations;
  }

  /**
   * Calculate recent error rate
   * @private
   */
  _calculateRecentErrorRate() {
    const recentWindow = 5 * 60 * 1000; // 5 minutes
    const recentRequests = this.systemMetrics.requestCount; // Simplified for this implementation
    const recentErrors = this.systemMetrics.errorCount;
    
    return recentRequests > 0 ? (recentErrors / recentRequests) * 100 : 0;
  }

  /**
   * Get current system status
   */
  getSystemStatus() {
    const uptime = Date.now() - this.systemMetrics.startTime;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      isMonitoring: this.isMonitoring,
      uptime,
      systemMetrics: {
        ...this.systemMetrics,
        memoryUsage: {
          rss: memoryUsage.rss,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external
        },
        cpuUsage: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      recentAlerts: this.alertHistory.slice(-10),
      performanceSummary: this._getPerformanceSummary()
    };
  }

  /**
   * Perform comprehensive health check
   * @private
   */
  async _performHealthCheck() {
    const startTime = performance.now();
    
    try {
      const health = ErrorLoggingService.getSystemHealth();
      const resourceUsage = this._getResourceUsage();
      const criticalPathStatus = this._getCriticalPathStatus();
      const alertSummary = this._getAlertSummary();
      
      this.systemMetrics.lastHealthCheck = {
        timestamp: new Date().toISOString(),
        health,
        resourceUsage,
        criticalPathStatus,
        alertSummary,
        duration: performance.now() - startTime
      };

      // Enhanced health check analysis
      const healthAnalysis = this._analyzeSystemHealth(health, resourceUsage, criticalPathStatus);

      // Check for critical issues with enhanced context
      if (health.score < 50) {
        this._triggerCriticalAlert('system_health_critical', {
          score: health.score,
          issues: health.issues,
          resourceUsage,
          criticalPathStatus,
          analysis: healthAnalysis,
          immediateActions: this._getImmediateActions(health, resourceUsage)
        });
      } else if (health.score < 70) {
        this._triggerAlert('system_health_degraded', {
          score: health.score,
          issues: health.issues,
          resourceUsage,
          criticalPathStatus,
          analysis: healthAnalysis,
          recommendedActions: this._getRecommendedActions(health, resourceUsage)
        });
      }

      // Check resource usage thresholds with enhanced alerting
      this._checkResourceThresholds(resourceUsage);

      // Check critical path performance
      this._checkCriticalPathPerformance(criticalPathStatus);

    } catch (error) {
      console.error('Health check failed:', error);
      
      this._triggerCriticalAlert('health_check_failed', {
        error: error.message,
        duration: performance.now() - startTime,
        systemState: this._getEmergencySystemState()
      });
    }
  }

  /**
   * Get critical path status for monitoring
   * @private
   */
  _getCriticalPathStatus() {
    const performanceStats = ErrorLoggingService.getPerformanceStatistics();
    
    return {
      unlockCalculations: {
        averageDuration: performanceStats.unlock_calculation?.averageDuration || 0,
        threshold: SystemMonitoringService.CRITICAL_THRESHOLDS.UNLOCK_CALCULATION,
        performanceRatio: performanceStats.unlock_calculation?.performanceRatio || 1,
        slowOperations: performanceStats.unlock_calculation?.slowOperations || 0,
        status: this._getCriticalPathOperationStatus('unlock_calculation', performanceStats)
      },
      databaseOperations: {
        averageDuration: performanceStats.database_operation?.averageDuration || 0,
        threshold: SystemMonitoringService.CRITICAL_THRESHOLDS.DATABASE_QUERY,
        performanceRatio: performanceStats.database_operation?.performanceRatio || 1,
        status: this._getCriticalPathOperationStatus('database_operation', performanceStats)
      },
      sessionOperations: {
        averageDuration: performanceStats.session_operation?.averageDuration || 0,
        threshold: SystemMonitoringService.CRITICAL_THRESHOLDS.SESSION_OPERATION,
        performanceRatio: performanceStats.session_operation?.performanceRatio || 1,
        status: this._getCriticalPathOperationStatus('session_operation', performanceStats)
      },
      apiResponses: {
        averageDuration: performanceStats.api_request?.averageDuration || 0,
        threshold: SystemMonitoringService.CRITICAL_THRESHOLDS.API_RESPONSE,
        performanceRatio: performanceStats.api_request?.performanceRatio || 1,
        status: this._getCriticalPathOperationStatus('api_request', performanceStats)
      }
    };
  }

  /**
   * Get critical path operation status
   * @private
   */
  _getCriticalPathOperationStatus(operation, performanceStats) {
    const stats = performanceStats[operation];
    if (!stats) return 'unknown';

    const ratio = stats.performanceRatio || 1;
    
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'degraded';
    if (ratio > 1.5) return 'warning';
    return 'healthy';
  }

  /**
   * Get alert summary for health check
   * @private
   */
  _getAlertSummary() {
    const recentAlerts = this.alertHistory.slice(-50); // Last 50 alerts
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    
    const recent24hAlerts = recentAlerts.filter(alert => 
      new Date(alert.timestamp).getTime() > last24Hours
    );

    const alertsByCategory = {};
    const alertsBySeverity = {};

    recent24hAlerts.forEach(alert => {
      alertsByCategory[alert.category] = (alertsByCategory[alert.category] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    });

    return {
      total24h: recent24hAlerts.length,
      alertsByCategory,
      alertsBySeverity,
      criticalAlerts: alertsBySeverity.critical || 0,
      lastCriticalAlert: recentAlerts.find(alert => alert.severity === 'critical')?.timestamp || null
    };
  }

  /**
   * Analyze system health with enhanced context
   * @private
   */
  _analyzeSystemHealth(health, resourceUsage, criticalPathStatus) {
    const analysis = {
      overallStatus: health.status,
      primaryConcerns: [],
      performanceBottlenecks: [],
      resourceConstraints: [],
      criticalPathIssues: []
    };

    // Analyze critical path performance
    Object.entries(criticalPathStatus).forEach(([operation, status]) => {
      if (status.status === 'critical') {
        analysis.criticalPathIssues.push({
          operation,
          issue: `${operation} is ${status.performanceRatio.toFixed(2)}x slower than threshold`,
          impact: 'high',
          userFacing: true
        });
      }
    });

    // Analyze resource usage
    if (resourceUsage.system.memoryUsagePercentage > 85) {
      analysis.resourceConstraints.push({
        resource: 'memory',
        usage: resourceUsage.system.memoryUsagePercentage,
        impact: 'medium',
        recommendation: 'Consider increasing memory allocation or optimizing memory usage'
      });
    }

    if (resourceUsage.cpu.loadAverage > 0.8) {
      analysis.resourceConstraints.push({
        resource: 'cpu',
        usage: resourceUsage.cpu.loadAverage,
        impact: 'medium',
        recommendation: 'Review CPU-intensive operations and consider scaling'
      });
    }

    // Determine primary concerns
    if (analysis.criticalPathIssues.length > 0) {
      analysis.primaryConcerns.push('Critical path performance degradation');
    }
    if (analysis.resourceConstraints.length > 0) {
      analysis.primaryConcerns.push('Resource constraints detected');
    }
    if (health.issues.length > 0) {
      analysis.primaryConcerns.push('System health issues detected');
    }

    return analysis;
  }

  /**
   * Get immediate actions for critical health issues
   * @private
   */
  _getImmediateActions(health, resourceUsage) {
    const actions = [];

    // Critical path actions
    if (health.issues.some(issue => issue.type === 'performance_degradation')) {
      actions.push({
        action: 'investigate_performance_bottlenecks',
        priority: 'immediate',
        description: 'Investigate and resolve performance bottlenecks in critical paths'
      });
    }

    // Resource actions
    if (resourceUsage.system.memoryUsagePercentage > 90) {
      actions.push({
        action: 'address_memory_pressure',
        priority: 'immediate',
        description: 'Address high memory usage to prevent system instability'
      });
    }

    // Error rate actions
    if (health.issues.some(issue => issue.type === 'high_error_rate')) {
      actions.push({
        action: 'investigate_error_sources',
        priority: 'immediate',
        description: 'Investigate and resolve sources of high error rate'
      });
    }

    return actions;
  }

  /**
   * Get recommended actions for degraded health
   * @private
   */
  _getRecommendedActions(health, resourceUsage) {
    const actions = [];

    // Performance recommendations
    if (health.score < 80) {
      actions.push({
        action: 'performance_optimization_review',
        priority: 'high',
        description: 'Review and optimize system performance'
      });
    }

    // Resource optimization
    if (resourceUsage.system.memoryUsagePercentage > 75) {
      actions.push({
        action: 'memory_optimization',
        priority: 'medium',
        description: 'Optimize memory usage and consider scaling'
      });
    }

    return actions;
  }

  /**
   * ping Redis client 
   */
  async ping() {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis not connected');
    }
    return await this.client.ping();
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats() {
    // This method is intended to be implemented in SystemMonitoringService
    // and should return performance statistics.
    // For now, returning a placeholder or throwing an error.
    throw new Error('getPerformanceStats not implemented in SystemMonitoringService');
  }

  /**
   * Check critical path performance
   * @private
   */
  _checkCriticalPathPerformance(criticalPathStatus) {
    Object.entries(criticalPathStatus).forEach(([operation, status]) => {
      if (status.status === 'critical') {
        this._triggerCriticalAlert('critical_path_failure', {
          operation,
          averageDuration: status.averageDuration,
          threshold: status.threshold,
          performanceRatio: status.performanceRatio,
          userImpact: 'high',
          businessImpact: operation === 'unlockCalculations' ? 'critical' : 'high'
        });
      } else if (status.status === 'degraded') {
        this._triggerPerformanceAlert('critical_path_degradation', {
          operation,
          averageDuration: status.averageDuration,
          threshold: status.threshold,
          performanceRatio: status.performanceRatio
        });
      }
    });
  }

  /**
   * Get emergency system state for failed health checks
   * @private
   */
  _getEmergencySystemState() {
    try {
      return {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        activeConnections: this.systemMetrics.activeConnections,
        requestCount: this.systemMetrics.requestCount,
        errorCount: this.systemMetrics.errorCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: 'Failed to get emergency system state',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Monitor performance metrics
   * @private
   */
  _monitorPerformance() {
    const performanceStats = ErrorLoggingService.getPerformanceStatistics();
    const errorStats = ErrorLoggingService.getErrorStatistics();
    
    // Store performance history
    this.performanceHistory.push({
      timestamp: Date.now(),
      performance: performanceStats,
      errors: errorStats
    });

    // Keep only last 100 entries
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }

    // Check for performance degradation
    Object.entries(performanceStats).forEach(([operation, stats]) => {
      if (stats.performanceRatio > 2) { // 2x slower than threshold
        this._triggerPerformanceAlert('performance_degradation', {
          operation,
          averageDuration: stats.averageDuration,
          threshold: stats.threshold,
          ratio: stats.performanceRatio
        });
      }
    });

    // Check error rate
    if (errorStats.errorRate > SystemMonitoringService.ALERT_THRESHOLDS.ERROR_RATE) {
      this._triggerAlert('high_error_rate', {
        errorRate: errorStats.errorRate,
        threshold: SystemMonitoringService.ALERT_THRESHOLDS.ERROR_RATE,
        totalErrors: errorStats.totalErrors
      });
    }
  }

  /**
   * Monitor resource usage
   * @private
   */
  _monitorResourceUsage() {
    const resourceUsage = this._getResourceUsage();
    
    // Log resource usage
    ErrorLoggingService.logSystemEvent('resource_usage', resourceUsage);
    
    this._checkResourceThresholds(resourceUsage);
  }

  /**
   * Get current resource usage
   * @private
   */
  _getResourceUsage() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();
    
    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        rss: memoryUsage.rss,
        external: memoryUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAverage: loadAverage[0] // 1-minute load average
      },
      system: {
        uptime: os.uptime(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        memoryUsagePercentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      }
    };
  }

  /**
   * Check resource usage against thresholds
   * @private
   */
  _checkResourceThresholds(resourceUsage) {
    // Check memory usage
    if (resourceUsage.system.memoryUsagePercentage > SystemMonitoringService.ALERT_THRESHOLDS.MEMORY_USAGE) {
      this._triggerAlert('high_memory_usage', {
        usage: resourceUsage.system.memoryUsagePercentage,
        threshold: SystemMonitoringService.ALERT_THRESHOLDS.MEMORY_USAGE,
        freeMemory: resourceUsage.system.freeMemory
      });
    }

    // Check CPU load
    if (resourceUsage.cpu.loadAverage > SystemMonitoringService.ALERT_THRESHOLDS.CPU_USAGE / 100) {
      this._triggerAlert('high_cpu_usage', {
        loadAverage: resourceUsage.cpu.loadAverage,
        threshold: SystemMonitoringService.ALERT_THRESHOLDS.CPU_USAGE / 100
      });
    }
  }

  /**
   * Trigger performance alert
   * @private
   */
  _triggerPerformanceAlert(type, data) {
    const alert = {
      id: `perf_${++this.incidentCounter}`,
      type,
      severity: 'medium',
      timestamp: new Date().toISOString(),
      data,
      category: 'performance'
    };

    this._recordAlert(alert);
    console.warn(`🔶 PERFORMANCE ALERT [${alert.id}]: ${type}`, data);
  }

  /**
   * Trigger general alert
   * @private
   */
  _triggerAlert(type, data) {
    const alert = {
      id: `alert_${++this.incidentCounter}`,
      type,
      severity: 'high',
      timestamp: new Date().toISOString(),
      data,
      category: 'system'
    };

    this._recordAlert(alert);
    console.warn(`🟠 SYSTEM ALERT [${alert.id}]: ${type}`, data);
  }

  /**
   * Trigger critical alert
   * @private
   */
  _triggerCriticalAlert(type, data) {
    const alert = {
      id: `critical_${++this.incidentCounter}`,
      type,
      severity: 'critical',
      timestamp: new Date().toISOString(),
      data,
      category: 'critical'
    };

    this._recordAlert(alert);
    console.error(`🚨 CRITICAL ALERT [${alert.id}]: ${type}`, data);

    // In production, this would trigger immediate notifications
    // (PagerDuty, Slack, SMS, etc.)
  }

  /**
   * Record alert in history
   * @private
   */
  _recordAlert(alert) {
    this.alertHistory.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }

    // Log to error logging service
    ErrorLoggingService.logSystemEvent('alert_triggered', alert);
  }

  /**
   * Get performance summary
   * @private
   */
  _getPerformanceSummary() {
    if (this.performanceHistory.length === 0) {
      return null;
    }

    const recent = this.performanceHistory.slice(-10);
    const operations = {};

    recent.forEach(entry => {
      Object.entries(entry.performance).forEach(([operation, stats]) => {
        if (!operations[operation]) {
          operations[operation] = {
            samples: 0,
            totalDuration: 0,
            slowOperations: 0
          };
        }

        operations[operation].samples++;
        operations[operation].totalDuration += stats.averageDuration;
        operations[operation].slowOperations += stats.slowOperations;
      });
    });

    // Calculate averages
    Object.keys(operations).forEach(operation => {
      const op = operations[operation];
      op.averageDuration = op.totalDuration / op.samples;
      op.averageSlowOperations = op.slowOperations / op.samples;
    });

    return operations;
  }

  /**
   * Perform cleanup of old data
   * @private
   */
  _performCleanup() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    // Clean up old performance history
    this.performanceHistory = this.performanceHistory.filter(
      entry => entry.timestamp > cutoffTime
    );

    // Clean up old alerts (keep last 30 days)
    const alertCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.alertHistory = this.alertHistory.filter(
      alert => new Date(alert.timestamp).getTime() > alertCutoff
    );

    ErrorLoggingService.logSystemEvent('monitoring_cleanup', {
      performanceHistorySize: this.performanceHistory.length,
      alertHistorySize: this.alertHistory.length
    });
  }

  /**
   * Get performance statistics (Proxy to ErrorLoggingService)
   */
  getPerformanceStats() {
    return ErrorLoggingService.getPerformanceStatistics();
  }
}

// Export singleton instance
export default new SystemMonitoringService();