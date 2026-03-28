/**
 * ErrorLoggingService - Structured error logging and monitoring
 * 
 * Implements Requirements: 8.3, 7.2
 * 
 * This service provides:
 * - Structured error logging with context
 * - Performance monitoring for critical paths
 * - Error alerting for system failures
 * - Metrics collection and analysis
 */

import fs from 'fs/promises';
import path from 'path';

class ErrorLoggingService {
  
  // Log levels for structured logging
  static LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn', 
    INFO: 'info',
    DEBUG: 'debug'
  };

  // Performance thresholds (in milliseconds)
  static PERFORMANCE_THRESHOLDS = {
    UNLOCK_CALCULATION: 500,    // Requirement 7.2: 500ms for unlock calculations
    DATABASE_QUERY: 1000,       // 1 second for database queries
    ANIMATION_FRAME: 16.67,     // 60fps = 16.67ms per frame
    API_RESPONSE: 2000,         // 2 seconds for API responses
    SESSION_OPERATION: 1500     // 1.5 seconds for session operations
  };

  // Error severity levels for alerting
  static SEVERITY_LEVELS = {
    CRITICAL: 'critical',    // System down, data loss
    HIGH: 'high',           // Major functionality broken
    MEDIUM: 'medium',       // Minor functionality issues
    LOW: 'low'              // Performance degradation
  };

  constructor() {
    this.logBuffer = [];
    this.performanceMetrics = new Map();
    this.errorCounts = new Map();
    this.alertThresholds = {
      errorRate: 10,          // Errors per minute
      performanceDegradation: 5, // Times slower than threshold
      criticalErrors: 1       // Critical errors trigger immediate alert
    };
    
    // Initialize log directory
    this._initializeLogging();
    
    // Start periodic log flushing
    this._startLogFlushing();
  }

  /**
   * Log structured error with context
   */
  async logError(error, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: ErrorLoggingService.LOG_LEVELS.ERROR,
      category: error.category || 'unknown',
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack,
      context: {
        userId: context.userId,
        sessionId: context.sessionId,
        nodeId: context.nodeId,
        skillId: context.skillId,
        operation: context.operation,
        requestId: context.requestId,
        userAgent: context.userAgent,
        ip: context.ip,
        ...context
      },
      severity: this._determineSeverity(error, context),
      fingerprint: this._generateErrorFingerprint(error, context)
    };

    // Add to buffer for batch processing
    this.logBuffer.push(logEntry);
    
    // Update error counts for alerting
    this._updateErrorCounts(logEntry);
    
    // Check if immediate alerting is needed
    if (logEntry.severity === ErrorLoggingService.SEVERITY_LEVELS.CRITICAL) {
      await this._sendImmediateAlert(logEntry);
    }
    
    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${logEntry.severity.toUpperCase()}] ${logEntry.category}:`, logEntry.message, logEntry.context);
    }
    
    return logEntry.fingerprint;
  }

  /**
   * Log performance metrics for critical paths
   */
  async logPerformance(operation, duration, context = {}) {
    const threshold = (ErrorLoggingService.PERFORMANCE_THRESHOLDS[operation.toUpperCase()]) || 1000;
    const isSlowOperation = duration > threshold;
    const performanceRatio = duration / threshold;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: isSlowOperation ? ErrorLoggingService.LOG_LEVELS.WARN : ErrorLoggingService.LOG_LEVELS.INFO,
      type: 'performance',
      operation,
      duration,
      threshold,
      performanceRatio,
      isSlowOperation,
      context: {
        userId: context.userId,
        sessionId: context.sessionId,
        nodeId: context.nodeId,
        ...context
      }
    };

    this.logBuffer.push(logEntry);
    
    // Update performance metrics
    this._updatePerformanceMetrics(operation, duration, threshold);
    
    // Check for performance degradation alerts
    if (performanceRatio > this.alertThresholds.performanceDegradation) {
      await this._sendPerformanceAlert(logEntry);
    }
    
    if (process.env.NODE_ENV === 'development' && isSlowOperation) {
      console.warn(`[PERFORMANCE] ${operation} took ${duration}ms (threshold: ${threshold}ms)`);
    }
    
    return logEntry;
  }

  /**
   * Log system events and state changes
   */
  async logSystemEvent(event, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: ErrorLoggingService.LOG_LEVELS.INFO,
      type: 'system_event',
      event,
      data,
      context: {
        nodeEnv: process.env.NODE_ENV,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    this.logBuffer.push(logEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SYSTEM] ${event}:`, data);
    }
    
    return logEntry;
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(timeWindow = 3600000) { // Default: 1 hour
    const cutoffTime = Date.now() - timeWindow;
    const recentErrors = Array.from(this.errorCounts.entries())
      .filter(([timestamp]) => timestamp > cutoffTime);
    
    const errorsByCategory = new Map();
    const errorsBySeverity = new Map();
    let totalErrors = 0;
    
    recentErrors.forEach(([, errorData]) => {
      totalErrors += errorData.count;
      
      // Group by category
      const categoryCount = errorsByCategory.get(errorData.category) || 0;
      errorsByCategory.set(errorData.category, categoryCount + errorData.count);
      
      // Group by severity
      const severityCount = errorsBySeverity.get(errorData.severity) || 0;
      errorsBySeverity.set(errorData.severity, severityCount + errorData.count);
    });
    
    return {
      timeWindow,
      totalErrors,
      errorRate: totalErrors / (timeWindow / 60000), // Errors per minute
      errorsByCategory: Object.fromEntries(errorsByCategory),
      errorsBySeverity: Object.fromEntries(errorsBySeverity),
      topErrors: this._getTopErrors(recentErrors)
    };
  }

  /**
   * Get performance statistics for monitoring
   */
  getPerformanceStatistics() {
    const stats = {};
    
    for (const [operation, metrics] of this.performanceMetrics) {
      const durations = metrics.durations.slice(-100); // Last 100 measurements
      
      stats[operation] = {
        threshold: metrics.threshold,
        count: metrics.count,
        averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        slowOperations: metrics.slowCount,
        performanceRatio: metrics.averageRatio,
        lastMeasurement: metrics.lastMeasurement
      };
    }
    
    return stats;
  }

  /**
   * Check system health based on error and performance metrics
   */
  getSystemHealth() {
    const errorStats = this.getErrorStatistics();
    const performanceStats = this.getPerformanceStatistics();
    
    let healthScore = 100;
    const issues = [];
    
    // Check error rate
    if (errorStats.errorRate > this.alertThresholds.errorRate) {
      healthScore -= 30;
      issues.push({
        type: 'high_error_rate',
        severity: ErrorLoggingService.SEVERITY_LEVELS.HIGH,
        message: `Error rate (${errorStats.errorRate.toFixed(2)}/min) exceeds threshold (${this.alertThresholds.errorRate}/min)`
      });
    }
    
    // Check critical errors
    const criticalErrors = errorStats.errorsBySeverity[ErrorLoggingService.SEVERITY_LEVELS.CRITICAL] || 0;
    if (criticalErrors > 0) {
      healthScore -= 50;
      issues.push({
        type: 'critical_errors',
        severity: ErrorLoggingService.SEVERITY_LEVELS.CRITICAL,
        message: `${criticalErrors} critical errors detected`
      });
    }
    
    // Check performance degradation
    const slowOperations = Object.entries(performanceStats)
      .filter(([, stats]) => stats.performanceRatio > this.alertThresholds.performanceDegradation);
    
    if (slowOperations.length > 0) {
      healthScore -= 20;
      issues.push({
        type: 'performance_degradation',
        severity: ErrorLoggingService.SEVERITY_LEVELS.MEDIUM,
        message: `${slowOperations.length} operations performing below threshold`,
        operations: slowOperations.map(([op, stats]) => ({
          operation: op,
          ratio: stats.performanceRatio
        }))
      });
    }
    
    return {
      score: Math.max(0, healthScore),
      status: this._getHealthStatus(healthScore),
      issues,
      lastCheck: new Date().toISOString(),
      errorStats,
      performanceStats
    };
  }

  /**
   * Initialize logging system
   * @private
   */
  async _initializeLogging() {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(logDir, { recursive: true });
      
      // Create daily log file
      const today = new Date().toISOString().split('T')[0];
      this.logFilePath = path.join(logDir, `node-system-${today}.log`);
      
    } catch (error) {
      console.error('Failed to initialize logging:', error);
    }
  }

  /**
   * Start periodic log flushing to file
   * @private
   */
  _startLogFlushing() {
    setInterval(async () => {
      await this._flushLogs();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Flush log buffer to file
   * @private
   */
  async _flushLogs() {
    if (this.logBuffer.length === 0) return;
    
    try {
      const logs = this.logBuffer.splice(0); // Empty the buffer
      const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
      
      if (this.logFilePath) {
        await fs.appendFile(this.logFilePath, logLines);
      }
      
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Put logs back in buffer if write failed
      this.logBuffer.unshift(...logs);
    }
  }

  /**
   * Determine error severity based on error and context
   * @private
   */
  _determineSeverity(error, context) {
    // Critical: System failures, data corruption
    if (error.code === 'DATABASE_CONNECTION_FAILED' || 
        error.code === 'DATA_CORRUPTION' ||
        error.message.includes('ECONNREFUSED')) {
      return ErrorLoggingService.SEVERITY_LEVELS.CRITICAL;
    }
    
    // High: Authentication failures, major functionality broken
    if (error.code === 'AUTHENTICATION_FAILED' ||
        error.code === 'UNLOCK_ENGINE_FAILURE' ||
        error.category === 'unlock' && context.operation === 'calculateNextUnlocks') {
      return ErrorLoggingService.SEVERITY_LEVELS.HIGH;
    }
    
    // Medium: Validation errors, minor functionality issues
    if (error.category === 'validation' ||
        error.category === 'animation' ||
        error.code === 'SESSION_TIMEOUT') {
      return ErrorLoggingService.SEVERITY_LEVELS.MEDIUM;
    }
    
    // Low: Performance issues, warnings
    return ErrorLoggingService.SEVERITY_LEVELS.LOW;
  }

  /**
   * Generate unique fingerprint for error deduplication
   * @private
   */
  _generateErrorFingerprint(error, context) {
    const key = `${error.code || 'UNKNOWN'}_${error.category || 'unknown'}_${context.operation || 'unknown'}`;
    return Buffer.from(key).toString('base64').substring(0, 16);
  }

  /**
   * Update error counts for alerting
   * @private
   */
  _updateErrorCounts(logEntry) {
    const minute = Math.floor(Date.now() / 60000) * 60000; // Round to minute
    const key = `${minute}_${logEntry.fingerprint}`;
    
    const existing = this.errorCounts.get(key) || {
      count: 0,
      category: logEntry.category,
      severity: logEntry.severity,
      message: logEntry.message
    };
    
    existing.count++;
    this.errorCounts.set(key, existing);
    
    // Clean up old entries (older than 1 hour)
    const cutoff = Date.now() - 3600000;
    for (const [timestamp] of this.errorCounts) {
      if (parseInt(timestamp.split('_')[0]) < cutoff) {
        this.errorCounts.delete(timestamp);
      }
    }
  }

  /**
   * Update performance metrics
   * @private
   */
  _updatePerformanceMetrics(operation, duration, threshold) {
    const existing = this.performanceMetrics.get(operation) || {
      count: 0,
      slowCount: 0,
      durations: [],
      threshold,
      totalDuration: 0,
      averageRatio: 1
    };
    
    existing.count++;
    existing.durations.push(duration);
    existing.totalDuration += duration;
    existing.lastMeasurement = Date.now();
    
    if (duration > threshold) {
      existing.slowCount++;
    }
    
    // Keep only last 100 measurements
    if (existing.durations.length > 100) {
      const removed = existing.durations.shift();
      existing.totalDuration -= removed;
    }
    
    // Calculate average performance ratio
    const avgDuration = existing.totalDuration / existing.durations.length;
    existing.averageRatio = avgDuration / threshold;
    
    this.performanceMetrics.set(operation, existing);
  }

  /**
   * Send immediate alert for critical errors
   * @private
   */
  async _sendImmediateAlert(logEntry) {
    // Enhanced critical alert with more context
    const alertData = {
      fingerprint: logEntry.fingerprint,
      context: logEntry.context,
      timestamp: logEntry.timestamp,
      severity: logEntry.severity,
      category: logEntry.category,
      systemHealth: this.getSystemHealth(),
      affectedOperations: this._getAffectedOperations(logEntry),
      recommendedActions: this._getRecommendedActions(logEntry)
    };

    // In production, this would integrate with alerting systems like PagerDuty, Slack, etc.
    console.error(`🚨 CRITICAL ALERT: ${logEntry.message}`, alertData);
    
    // Enhanced alert notification for different channels
    await this._notifyAlertChannels('critical', logEntry, alertData);
    
    // Log the alert with enhanced context
    await this.logSystemEvent('critical_alert_sent', {
      errorFingerprint: logEntry.fingerprint,
      errorMessage: logEntry.message,
      context: logEntry.context,
      alertData,
      notificationChannels: ['console', 'log_file', 'monitoring_system']
    });
  }

  /**
   * Send performance degradation alert
   * @private
   */
  async _sendPerformanceAlert(logEntry) {
    const alertData = {
      operation: logEntry.operation,
      duration: logEntry.duration,
      threshold: logEntry.threshold,
      context: logEntry.context,
      performanceImpact: this._calculatePerformanceImpact(logEntry),
      systemLoad: this._getCurrentSystemLoad()
    };

    console.warn(`⚠️ PERFORMANCE ALERT: ${logEntry.operation} is ${logEntry.performanceRatio.toFixed(2)}x slower than threshold`, alertData);
    
    // Enhanced performance alert notification
    await this._notifyAlertChannels('performance', logEntry, alertData);
  }

  /**
   * Calculate performance impact of slow operation
   * @private
   */
  _calculatePerformanceImpact(logEntry) {
    const metrics = this.performanceMetrics.get(logEntry.operation);
    if (!metrics) return { impact: 'unknown' };

    const recentSlowOperations = metrics.slowCount;
    const totalOperations = metrics.count;
    const slowOperationRate = (recentSlowOperations / totalOperations) * 100;

    return {
      slowOperationRate: slowOperationRate.toFixed(2),
      impact: slowOperationRate > 20 ? 'high' : slowOperationRate > 10 ? 'medium' : 'low',
      affectedUsers: this._estimateAffectedUsers(logEntry.operation),
      recommendedActions: this._getPerformanceRecommendations(logEntry.operation, logEntry.performanceRatio)
    };
  }

  /**
   * Get current system load for context
   * @private
   */
  _getCurrentSystemLoad() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memoryUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      cpuUser: cpuUsage.user,
      cpuSystem: cpuUsage.system,
      uptime: process.uptime()
    };
  }

  /**
   * Estimate affected users for performance issues
   * @private
   */
  _estimateAffectedUsers(operation) {
    // This would integrate with user session tracking in production
    const operationUserImpact = {
      'unlock_calculation': 'high', // Critical path for user progression
      'database_operation': 'medium',
      'api_request': 'medium',
      'session_operation': 'high'
    };

    return operationUserImpact[operation] || 'low';
  }

  /**
   * Get performance recommendations based on operation and ratio
   * @private
   */
  _getPerformanceRecommendations(operation, ratio) {
    const recommendations = [];

    if (operation === 'unlock_calculation' && ratio > 2) {
      recommendations.push('Consider optimizing unlock algorithm');
      recommendations.push('Check database indexes for progression queries');
      recommendations.push('Review caching strategy for node states');
    }

    if (operation.includes('database') && ratio > 1.5) {
      recommendations.push('Analyze slow query logs');
      recommendations.push('Consider adding database indexes');
      recommendations.push('Check connection pool configuration');
    }

    if (ratio > 3) {
      recommendations.push('Consider scaling resources');
      recommendations.push('Review system load and memory usage');
    }

    return recommendations;
  }

  /**
   * Get affected operations for error context
   * @private
   */
  _getAffectedOperations(logEntry) {
    const category = logEntry.category;
    const operationImpact = {
      'database': ['unlock_calculation', 'session_operation', 'user_authentication'],
      'unlock': ['node_progression', 'skill_completion', 'user_progress'],
      'session': ['progress_tracking', 'reflection_saving', 'completion_evaluation'],
      'animation': ['user_experience', 'visual_feedback'],
      'authentication': ['user_access', 'data_security', 'session_management']
    };

    return operationImpact[category] || ['unknown_operations'];
  }

  /**
   * Get recommended actions for error resolution
   * @private
   */
  _getRecommendedActions(logEntry) {
    const actions = [];
    
    switch (logEntry.category) {
      case 'database':
        actions.push('Check database connectivity');
        actions.push('Review connection pool status');
        actions.push('Verify database server health');
        break;
      case 'unlock':
        actions.push('Verify node progression data integrity');
        actions.push('Check unlock algorithm performance');
        actions.push('Review user session state');
        break;
      case 'session':
        actions.push('Check session storage availability');
        actions.push('Verify user authentication status');
        actions.push('Review session timeout configuration');
        break;
      case 'animation':
        actions.push('Verify browser compatibility');
        actions.push('Check animation asset availability');
        actions.push('Review fallback mechanism status');
        break;
      default:
        actions.push('Review system logs for additional context');
        actions.push('Check system resource availability');
    }

    return actions;
  }

  /**
   * Notify alert channels (enhanced for production integration)
   * @private
   */
  async _notifyAlertChannels(alertType, logEntry, alertData) {
    const notifications = [];

    // Console notification (always active)
    notifications.push({ channel: 'console', status: 'sent' });

    // File logging (always active)
    notifications.push({ channel: 'log_file', status: 'sent' });

    // In production, add integrations:
    if (process.env.NODE_ENV === 'production') {
      // Slack integration
      if (process.env.SLACK_WEBHOOK_URL) {
        try {
          await this._sendSlackAlert(alertType, logEntry, alertData);
          notifications.push({ channel: 'slack', status: 'sent' });
        } catch (error) {
          notifications.push({ channel: 'slack', status: 'failed', error: error.message });
        }
      }

      // Email integration
      if (process.env.ALERT_EMAIL_ENABLED) {
        try {
          await this._sendEmailAlert(alertType, logEntry, alertData);
          notifications.push({ channel: 'email', status: 'sent' });
        } catch (error) {
          notifications.push({ channel: 'email', status: 'failed', error: error.message });
        }
      }

      // PagerDuty integration for critical alerts
      if (alertType === 'critical' && process.env.PAGERDUTY_INTEGRATION_KEY) {
        try {
          await this._sendPagerDutyAlert(logEntry, alertData);
          notifications.push({ channel: 'pagerduty', status: 'sent' });
        } catch (error) {
          notifications.push({ channel: 'pagerduty', status: 'failed', error: error.message });
        }
      }
    }

    // Log notification results
    await this.logSystemEvent('alert_notifications_sent', {
      alertType,
      errorFingerprint: logEntry.fingerprint,
      notifications,
      timestamp: new Date().toISOString()
    });

    return notifications;
  }

  /**
   * Send Slack alert (placeholder for production implementation)
   * @private
   */
  async _sendSlackAlert(alertType, logEntry, alertData) {
    // In production, implement Slack webhook integration
    console.log(`[SLACK ALERT] ${alertType}: ${logEntry.message}`);
    return Promise.resolve();
  }

  /**
   * Send email alert (placeholder for production implementation)
   * @private
   */
  async _sendEmailAlert(alertType, logEntry, alertData) {
    // In production, implement email service integration
    console.log(`[EMAIL ALERT] ${alertType}: ${logEntry.message}`);
    return Promise.resolve();
  }

  /**
   * Send PagerDuty alert (placeholder for production implementation)
   * @private
   */
  async _sendPagerDutyAlert(logEntry, alertData) {
    // In production, implement PagerDuty Events API integration
    console.log(`[PAGERDUTY ALERT] Critical: ${logEntry.message}`);
    return Promise.resolve();
  }

  /**
   * Get top errors by frequency
   * @private
   */
  _getTopErrors(recentErrors, limit = 5) {
    return recentErrors
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([, errorData]) => ({
        count: errorData.count,
        category: errorData.category,
        severity: errorData.severity,
        message: errorData.message
      }));
  }

  /**
   * Get health status based on score
   * @private
   */
  _getHealthStatus(score) {
    if (score >= 90) return 'healthy';
    if (score >= 70) return 'warning';
    if (score >= 50) return 'degraded';
    return 'critical';
  }
}

// Export singleton instance
export default new ErrorLoggingService();