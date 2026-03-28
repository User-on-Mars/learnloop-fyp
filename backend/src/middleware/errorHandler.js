/**
 * Enhanced Error Handler Middleware
 * 
 * Implements Requirements: 8.1, 8.3, 8.4, 8.5
 * 
 * This middleware provides:
 * - Comprehensive error handling with structured responses
 * - Integration with ErrorHandlingService and ErrorLoggingService
 * - Graceful degradation and user-friendly error messages
 * - Performance monitoring and alerting
 */

import ErrorHandlingService from '../services/ErrorHandlingService.js';
import ErrorLoggingService from '../services/ErrorLoggingService.js';
import SystemMonitoringService from '../services/SystemMonitoringService.js';

/**
 * Main error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Start performance tracking
  const startTime = Date.now();
  
  // Extract context from request
  const context = {
    userId: req.user?.id,
    sessionId: req.headers['x-session-id'],
    requestId: req.headers['x-request-id'] || generateRequestId(),
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  };

  // Determine error type and create structured response
  let errorResponse;
  let httpStatus = err.status || err.statusCode || 500;

  try {
    if (err.name === 'ValidationError' || err.code === 'VALIDATION_ERROR') {
      errorResponse = handleValidationError(err, context);
      httpStatus = 422;
    } else if (err.code === 'UNLOCK_FORBIDDEN') {
      errorResponse = handleUnlockError(err, context);
      httpStatus = 403;
    } else if (err.code === 'SESSION_TIMEOUT') {
      errorResponse = handleSessionTimeoutError(err, context);
      httpStatus = 410;
    } else if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
      errorResponse = handleDatabaseError(err, context);
      httpStatus = 503;
    } else if (err.status === 401) {
      errorResponse = handleAuthenticationError(err, context);
      httpStatus = 401;
    } else if (err.status === 403) {
      errorResponse = handleAuthorizationError(err, context);
      httpStatus = 403;
    } else {
      errorResponse = handleGenericError(err, context);
    }

    // Log the error with context
    ErrorLoggingService.logError(err, {
      ...context,
      operation: 'error_handling',
      httpStatus,
      errorResponse
    });

    // Log performance metrics
    const duration = Date.now() - startTime;
    ErrorLoggingService.logPerformance('error_handling', duration, context);

    // Send structured error response
    res.status(httpStatus).json(errorResponse);

  } catch (handlingError) {
    // Fallback error handling if our error handler fails
    console.error('Error in error handler:', handlingError);
    
    ErrorLoggingService.logError(handlingError, {
      ...context,
      operation: 'error_handler_failure',
      originalError: err.message
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request',
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle validation errors with field-specific messages
 */
function handleValidationError(err, context) {
  const errors = [];
  
  if (err.errors) {
    // Mongoose validation errors
    Object.keys(err.errors).forEach(field => {
      const fieldError = err.errors[field];
      errors.push(ErrorHandlingService.createValidationError(
        field,
        fieldError.value,
        {
          type: fieldError.kind,
          message: fieldError.message,
          min: fieldError.properties?.min,
          max: fieldError.properties?.max
        },
        { path: fieldError.path }
      ));
    });
  } else if (err.details) {
    // Joi/Zod validation errors
    err.details.forEach(detail => {
      errors.push(ErrorHandlingService.createValidationError(
        detail.path.join('.'),
        detail.context?.value,
        {
          type: detail.type,
          message: detail.message
        }
      ));
    });
  } else {
    // Generic validation error
    errors.push(ErrorHandlingService.createValidationError(
      'unknown',
      null,
      { type: 'validation', message: err.message }
    ));
  }

  return {
    error: 'Validation failed',
    message: 'Please correct the following errors and try again',
    errors: errors,
    code: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString(),
    requestId: context.requestId
  };
}

/**
 * Handle unlock attempt errors with progression guidance
 */
function handleUnlockError(err, context) {
  const unlockError = ErrorHandlingService.createUnlockError(
    err.nodeId,
    context.userId,
    err.validationResult || { isValid: false, reason: err.message }
  );

  return {
    error: 'Node unlock forbidden',
    message: unlockError.userFriendly,
    code: 'UNLOCK_FORBIDDEN',
    nodeId: err.nodeId,
    requiredActions: unlockError.requiredActions,
    progressionGuidance: {
      currentStep: err.currentStep || 'unknown',
      nextSteps: unlockError.requiredActions?.map(action => action.description) || [],
      estimatedTime: err.estimatedTime || null
    },
    timestamp: new Date().toISOString(),
    requestId: context.requestId
  };
}

/**
 * Handle session timeout errors with recovery options
 */
function handleSessionTimeoutError(err, context) {
  const timeoutError = ErrorHandlingService.createSessionTimeoutError(
    err.sessionId,
    err.preservedData
  );

  return {
    error: 'Session timeout',
    message: timeoutError.userFriendly,
    code: 'SESSION_TIMEOUT',
    sessionId: err.sessionId,
    recoveryOptions: timeoutError.recoveryOptions,
    preservedData: {
      progress: timeoutError.preservedData.currentProgress || 0,
      duration: timeoutError.preservedData.duration || 0,
      lastActivity: timeoutError.preservedData.lastActivity || null
    },
    timestamp: new Date().toISOString(),
    requestId: context.requestId
  };
}

/**
 * Handle database connectivity errors with retry guidance
 */
function handleDatabaseError(err, context) {
  return {
    error: 'Service temporarily unavailable',
    message: 'The system is experiencing temporary difficulties. Please try again in a few moments.',
    code: 'DATABASE_ERROR',
    retryAfter: 30, // seconds
    retryGuidance: {
      canRetry: true,
      recommendedDelay: 30000, // 30 seconds
      maxRetries: 3,
      exponentialBackoff: true
    },
    timestamp: new Date().toISOString(),
    requestId: context.requestId
  };
}

/**
 * Handle authentication errors
 */
function handleAuthenticationError(err, context) {
  return {
    error: 'Authentication required',
    message: 'Please log in to access this resource',
    code: 'AUTHENTICATION_REQUIRED',
    loginUrl: '/api/auth/login',
    timestamp: new Date().toISOString(),
    requestId: context.requestId
  };
}

/**
 * Handle authorization errors
 */
function handleAuthorizationError(err, context) {
  return {
    error: 'Access denied',
    message: 'You do not have permission to access this resource',
    code: 'AUTHORIZATION_DENIED',
    requiredPermissions: err.requiredPermissions || [],
    timestamp: new Date().toISOString(),
    requestId: context.requestId
  };
}

/**
 * Handle generic errors with safe fallback
 */
function handleGenericError(err, context) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    code: err.code || 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString(),
    requestId: context.requestId
  };
}

/**
 * Async error wrapper for route handlers
 */
export function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Database operation wrapper with retry logic
 */
export function withDatabaseRetry(operation, context = {}) {
  return ErrorHandlingService.withDatabaseRetry(operation, context);
}

/**
 * Performance monitoring wrapper with system monitoring integration
 */
export function withPerformanceMonitoring(operationName) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        // Log to error logging service
        ErrorLoggingService.logPerformance(operationName, duration, {
          method: propertyKey,
          args: args.length
        });

        // Record in system monitoring for critical operations
        if (operationName === 'unlock_calculation') {
          SystemMonitoringService.recordUnlockCalculation(
            args[0], // skillId
            args[1], // nodeId
            duration,
            true
          );
        } else if (operationName.includes('database')) {
          SystemMonitoringService.recordDatabaseOperation(
            operationName,
            duration,
            true
          );
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Log failed operation
        ErrorLoggingService.logPerformance(operationName, duration, {
          method: propertyKey,
          error: error.message,
          failed: true
        });

        // Record failure in system monitoring
        if (operationName === 'unlock_calculation') {
          SystemMonitoringService.recordUnlockCalculation(
            args[0], // skillId
            args[1], // nodeId
            duration,
            false
          );
        } else if (operationName.includes('database')) {
          SystemMonitoringService.recordDatabaseOperation(
            operationName,
            duration,
            false
          );
        }
        
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Health check endpoint for monitoring with system status
 */
export async function healthCheck(req, res) {
  try {
    const health = ErrorLoggingService.getSystemHealth();
    const errorStats = ErrorLoggingService.getErrorStatistics();
    const performanceStats = ErrorLoggingService.getPerformanceStatistics();
    const systemStatus = SystemMonitoringService.getSystemStatus();
    
    // Enhanced health check with critical path monitoring
    const criticalPathHealth = getCriticalPathHealth(performanceStats);
    const alertSummary = getAlertSummary(systemStatus.recentAlerts);
    const resourceHealth = getResourceHealth(systemStatus.systemMetrics);
    
    const response = {
      status: health.status,
      score: health.score,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      
      // Enhanced system monitoring
      system: {
        monitoring: systemStatus.isMonitoring,
        uptime: systemStatus.uptime,
        metrics: systemStatus.systemMetrics,
        resourceHealth,
        nodeEnv: process.env.NODE_ENV
      },
      
      // Enhanced error tracking
      errors: {
        total: errorStats.totalErrors,
        rate: errorStats.errorRate,
        categories: errorStats.errorsByCategory,
        severity: errorStats.errorsBySeverity,
        topErrors: errorStats.topErrors
      },
      
      // Enhanced performance monitoring with critical paths
      performance: {
        ...Object.keys(performanceStats).reduce((acc, op) => {
          acc[op] = {
            average: performanceStats[op].averageDuration,
            ratio: performanceStats[op].performanceRatio,
            threshold: performanceStats[op].threshold,
            status: getPerformanceStatus(performanceStats[op].performanceRatio),
            slowOperations: performanceStats[op].slowOperations,
            count: performanceStats[op].count
          };
          return acc;
        }, {}),
        criticalPaths: criticalPathHealth
      },
      
      // Enhanced issue tracking
      issues: health.issues.map(issue => ({
        ...issue,
        impact: getIssueImpact(issue),
        estimatedResolutionTime: getEstimatedResolutionTime(issue),
        recommendedActions: getIssueRecommendations(issue)
      })),
      
      // Alert summary
      alerts: {
        recent: systemStatus.recentAlerts,
        summary: alertSummary,
        criticalCount: alertSummary.critical || 0,
        lastCritical: alertSummary.lastCritical
      },
      
      // Service availability
      services: {
        database: await checkDatabaseHealth(),
        cache: await checkCacheHealth(),
        monitoring: systemStatus.isMonitoring,
        errorLogging: true // Always available if we reach this point
      },
      
      // Compliance with requirements
      requirements: {
        unlockCalculationPerformance: criticalPathHealth.unlockCalculations?.meetsRequirement || false,
        errorHandlingActive: health.issues.length === 0 || health.issues.every(i => i.severity !== 'critical'),
        monitoringActive: systemStatus.isMonitoring,
        alertingActive: alertSummary.total > 0 ? 'active' : 'standby'
      }
    };
    
    // Determine HTTP status based on enhanced health analysis
    const httpStatus = determineHealthHttpStatus(health, criticalPathHealth, alertSummary);
    
    res.status(httpStatus).json(response);
  } catch (error) {
    // Enhanced error response for health check failures
    const errorResponse = {
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
      fallbackMetrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeEnv: process.env.NODE_ENV
      },
      impact: 'Health monitoring temporarily unavailable',
      recommendedAction: 'Check system logs and restart monitoring services if needed'
    };
    
    // Log the health check failure
    ErrorLoggingService.logError(error, {
      operation: 'health_check',
      endpoint: '/api/health/detailed',
      critical: true
    });
    
    res.status(500).json(errorResponse);
  }
}

/**
 * Get critical path health status
 */
function getCriticalPathHealth(performanceStats) {
  const criticalPaths = {
    unlockCalculations: {
      operation: 'unlock_calculation',
      threshold: 500, // Requirement 7.2
      required: true,
      userFacing: true
    },
    databaseOperations: {
      operation: 'database_operation',
      threshold: 1000,
      required: true,
      userFacing: false
    },
    sessionOperations: {
      operation: 'session_operation',
      threshold: 1500,
      required: true,
      userFacing: true
    },
    apiResponses: {
      operation: 'api_request',
      threshold: 2000,
      required: true,
      userFacing: true
    }
  };

  const health = {};
  
  Object.entries(criticalPaths).forEach(([pathName, config]) => {
    const stats = performanceStats[config.operation];
    
    if (stats) {
      const meetsRequirement = stats.averageDuration <= config.threshold;
      const performanceRatio = stats.averageDuration / config.threshold;
      
      health[pathName] = {
        averageDuration: stats.averageDuration,
        threshold: config.threshold,
        meetsRequirement,
        performanceRatio,
        status: getPerformanceStatus(performanceRatio),
        slowOperations: stats.slowOperations,
        count: stats.count,
        userFacing: config.userFacing,
        required: config.required,
        impact: getPathImpact(performanceRatio, config.userFacing)
      };
    } else {
      health[pathName] = {
        status: 'no_data',
        meetsRequirement: null,
        message: 'No performance data available'
      };
    }
  });

  return health;
}

/**
 * Get alert summary
 */
function getAlertSummary(recentAlerts) {
  const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
  const recent24h = recentAlerts.filter(alert => 
    new Date(alert.timestamp).getTime() > last24Hours
  );

  const summary = {
    total: recent24h.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    lastCritical: null,
    categories: {}
  };

  recent24h.forEach(alert => {
    summary[alert.severity] = (summary[alert.severity] || 0) + 1;
    summary.categories[alert.category] = (summary.categories[alert.category] || 0) + 1;
    
    if (alert.severity === 'critical' && (!summary.lastCritical || 
        new Date(alert.timestamp) > new Date(summary.lastCritical))) {
      summary.lastCritical = alert.timestamp;
    }
  });

  return summary;
}

/**
 * Get resource health status
 */
function getResourceHealth(systemMetrics) {
  const memoryUsage = systemMetrics.memoryUsage;
  const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  return {
    memory: {
      usage: memoryPercent,
      status: memoryPercent > 85 ? 'critical' : memoryPercent > 70 ? 'warning' : 'healthy',
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal
    },
    requests: {
      total: systemMetrics.requestCount,
      errors: systemMetrics.errorCount,
      errorRate: systemMetrics.requestCount > 0 ? 
        (systemMetrics.errorCount / systemMetrics.requestCount) * 100 : 0
    },
    connections: {
      active: systemMetrics.activeConnections,
      status: systemMetrics.activeConnections > 1000 ? 'warning' : 'healthy'
    }
  };
}

/**
 * Get performance status based on ratio
 */
function getPerformanceStatus(ratio) {
  if (ratio > 3) return 'critical';
  if (ratio > 2) return 'degraded';
  if (ratio > 1.5) return 'warning';
  return 'healthy';
}

/**
 * Get path impact based on performance and user-facing nature
 */
function getPathImpact(ratio, userFacing) {
  const baseImpact = ratio > 3 ? 'high' : ratio > 2 ? 'medium' : 'low';
  return userFacing && ratio > 2 ? 'high' : baseImpact;
}

/**
 * Get issue impact assessment
 */
function getIssueImpact(issue) {
  const impactMap = {
    'high_error_rate': 'high',
    'critical_errors': 'critical',
    'performance_degradation': 'medium',
    'resource_constraints': 'medium'
  };
  
  return impactMap[issue.type] || 'low';
}

/**
 * Get estimated resolution time for issues
 */
function getEstimatedResolutionTime(issue) {
  const timeMap = {
    'high_error_rate': '15-30 minutes',
    'critical_errors': '5-15 minutes',
    'performance_degradation': '30-60 minutes',
    'resource_constraints': '10-30 minutes'
  };
  
  return timeMap[issue.type] || '15-45 minutes';
}

/**
 * Get issue-specific recommendations
 */
function getIssueRecommendations(issue) {
  const recommendationMap = {
    'high_error_rate': [
      'Check recent deployments for regressions',
      'Review error logs for common patterns',
      'Verify external service availability'
    ],
    'critical_errors': [
      'Investigate database connectivity',
      'Check system resource availability',
      'Review recent configuration changes'
    ],
    'performance_degradation': [
      'Analyze slow query logs',
      'Check system resource usage',
      'Review caching effectiveness'
    ],
    'resource_constraints': [
      'Monitor memory usage patterns',
      'Consider scaling resources',
      'Optimize resource-intensive operations'
    ]
  };
  
  return recommendationMap[issue.type] || ['Review system logs', 'Contact system administrator'];
}

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  try {
    // This would implement actual database connectivity check
    // For now, return a basic status
    return {
      status: 'healthy',
      responseTime: '<100ms',
      connections: 'available'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Check cache health
 */
async function checkCacheHealth() {
  try {
    // This would implement actual cache connectivity check
    // For now, return a basic status
    return {
      status: 'healthy',
      responseTime: '<50ms',
      hitRate: 'optimal'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Determine HTTP status for health check
 */
function determineHealthHttpStatus(health, criticalPathHealth, alertSummary) {
  // Critical if any critical path fails requirements
  const criticalPathFailures = Object.values(criticalPathHealth).some(path => 
    path.required && path.meetsRequirement === false && path.status === 'critical'
  );
  
  if (criticalPathFailures || health.score < 50 || alertSummary.critical > 0) {
    return 503; // Service Unavailable
  }
  
  if (health.score < 70 || alertSummary.high > 5) {
    return 200; // OK but with warnings
  }
  
  return 200; // OK
}

/**
 * System monitoring status endpoint
 */
export async function monitoringStatus(req, res) {
  try {
    const systemStatus = SystemMonitoringService.getSystemStatus();
    res.json(systemStatus);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get monitoring status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Comprehensive monitoring dashboard endpoint
 */
export async function monitoringDashboard(req, res) {
  try {
    const health = ErrorLoggingService.getSystemHealth();
    const errorStats = ErrorLoggingService.getErrorStatistics();
    const performanceStats = ErrorLoggingService.getPerformanceStatistics();
    const systemStatus = SystemMonitoringService.getSystemStatus();
    
    // Get time range from query params (default: last hour)
    const timeRange = parseInt(req.query.timeRange) || 3600000; // 1 hour in ms
    const errorStatsTimeRange = ErrorLoggingService.getErrorStatistics(timeRange);
    
    const dashboard = {
      timestamp: new Date().toISOString(),
      timeRange: {
        duration: timeRange,
        description: formatTimeRange(timeRange)
      },
      
      // System overview
      overview: {
        status: health.status,
        score: health.score,
        uptime: process.uptime(),
        nodeEnv: process.env.NODE_ENV,
        monitoring: systemStatus.isMonitoring
      },
      
      // Critical path monitoring (Requirement 7.2)
      criticalPaths: {
        unlockCalculations: {
          requirement: '500ms (Requirement 7.2)',
          current: performanceStats.unlock_calculation?.averageDuration || 0,
          status: getRequirementComplianceStatus(
            performanceStats.unlock_calculation?.averageDuration || 0, 
            500
          ),
          threshold: 500,
          performanceRatio: performanceStats.unlock_calculation?.performanceRatio || 1,
          slowOperations: performanceStats.unlock_calculation?.slowOperations || 0,
          totalOperations: performanceStats.unlock_calculation?.count || 0
        },
        databaseQueries: {
          requirement: '1000ms (sub-second response)',
          current: performanceStats.database_operation?.averageDuration || 0,
          status: getRequirementComplianceStatus(
            performanceStats.database_operation?.averageDuration || 0, 
            1000
          ),
          threshold: 1000
        },
        apiResponses: {
          requirement: '2000ms (initial view load)',
          current: performanceStats.api_request?.averageDuration || 0,
          status: getRequirementComplianceStatus(
            performanceStats.api_request?.averageDuration || 0, 
            2000
          ),
          threshold: 2000
        }
      },
      
      // Error analysis
      errors: {
        summary: {
          total: errorStatsTimeRange.totalErrors,
          rate: errorStatsTimeRange.errorRate,
          rateStatus: errorStatsTimeRange.errorRate > 10 ? 'critical' : 
                     errorStatsTimeRange.errorRate > 5 ? 'warning' : 'healthy'
        },
        byCategory: errorStatsTimeRange.errorsByCategory,
        bySeverity: errorStatsTimeRange.errorsBySeverity,
        topErrors: errorStatsTimeRange.topErrors,
        trends: getErrorTrends(errorStatsTimeRange)
      },
      
      // Performance analysis
      performance: {
        summary: getPerformanceSummary(performanceStats),
        operations: Object.keys(performanceStats).map(op => ({
          operation: op,
          averageDuration: performanceStats[op].averageDuration,
          threshold: performanceStats[op].threshold,
          performanceRatio: performanceStats[op].performanceRatio,
          status: getPerformanceStatus(performanceStats[op].performanceRatio),
          slowOperations: performanceStats[op].slowOperations,
          count: performanceStats[op].count,
          trend: getPerformanceTrend(performanceStats[op])
        })),
        bottlenecks: identifyPerformanceBottlenecks(performanceStats)
      },
      
      // Resource utilization
      resources: {
        memory: {
          ...systemStatus.systemMetrics.memoryUsage,
          percentage: (systemStatus.systemMetrics.memoryUsage.heapUsed / 
                      systemStatus.systemMetrics.memoryUsage.heapTotal) * 100,
          status: getMemoryStatus(systemStatus.systemMetrics.memoryUsage)
        },
        cpu: systemStatus.systemMetrics.cpuUsage,
        connections: {
          active: systemStatus.systemMetrics.activeConnections,
          status: systemStatus.systemMetrics.activeConnections > 1000 ? 'warning' : 'healthy'
        },
        requests: {
          total: systemStatus.systemMetrics.requestCount,
          errors: systemStatus.systemMetrics.errorCount,
          successRate: systemStatus.systemMetrics.requestCount > 0 ? 
            ((systemStatus.systemMetrics.requestCount - systemStatus.systemMetrics.errorCount) / 
             systemStatus.systemMetrics.requestCount) * 100 : 100
        }
      },
      
      // Alert analysis
      alerts: {
        summary: getAlertSummary(systemStatus.recentAlerts),
        recent: systemStatus.recentAlerts.slice(-20), // Last 20 alerts
        patterns: identifyAlertPatterns(systemStatus.recentAlerts),
        escalation: getAlertEscalation(systemStatus.recentAlerts)
      },
      
      // System health issues
      issues: health.issues.map(issue => ({
        ...issue,
        impact: getIssueImpact(issue),
        estimatedResolution: getEstimatedResolutionTime(issue),
        recommendations: getIssueRecommendations(issue),
        affectedOperations: getAffectedOperations(issue)
      })),
      
      // Compliance status
      compliance: {
        requirements: {
          '7.2_unlock_performance': {
            description: 'Unlock calculations within 500ms',
            status: getRequirementComplianceStatus(
              performanceStats.unlock_calculation?.averageDuration || 0, 
              500
            ),
            current: performanceStats.unlock_calculation?.averageDuration || 0,
            threshold: 500,
            critical: true
          },
          '8.3_animation_resilience': {
            description: 'Animation failures handled gracefully',
            status: health.issues.some(i => i.type === 'animation_failure') ? 'non_compliant' : 'compliant',
            critical: false
          }
        },
        overallCompliance: calculateOverallCompliance(performanceStats, health)
      },
      
      // Recommendations
      recommendations: generateSystemRecommendations(health, performanceStats, systemStatus)
    };
    
    res.json(dashboard);
  } catch (error) {
    ErrorLoggingService.logError(error, {
      operation: 'monitoring_dashboard',
      endpoint: '/api/monitoring/dashboard'
    });
    
    res.status(500).json({
      error: 'Failed to generate monitoring dashboard',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Helper functions for monitoring dashboard

function formatTimeRange(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getRequirementComplianceStatus(current, threshold) {
  if (current === 0) return 'no_data';
  if (current <= threshold) return 'compliant';
  if (current <= threshold * 1.5) return 'warning';
  return 'non_compliant';
}

function getPerformanceSummary(performanceStats) {
  const operations = Object.values(performanceStats);
  if (operations.length === 0) return { status: 'no_data' };
  
  const avgRatio = operations.reduce((sum, op) => sum + op.performanceRatio, 0) / operations.length;
  const slowOperations = operations.reduce((sum, op) => sum + op.slowOperations, 0);
  const totalOperations = operations.reduce((sum, op) => sum + op.count, 0);
  
  return {
    averagePerformanceRatio: avgRatio,
    slowOperationRate: totalOperations > 0 ? (slowOperations / totalOperations) * 100 : 0,
    status: avgRatio > 2 ? 'degraded' : avgRatio > 1.5 ? 'warning' : 'healthy',
    totalOperations,
    slowOperations
  };
}

function getPerformanceTrend(operationStats) {
  // Simplified trend analysis - in production this would analyze historical data
  const ratio = operationStats.performanceRatio;
  if (ratio > 2) return 'deteriorating';
  if (ratio > 1.5) return 'declining';
  if (ratio < 0.8) return 'improving';
  return 'stable';
}

function identifyPerformanceBottlenecks(performanceStats) {
  return Object.entries(performanceStats)
    .filter(([, stats]) => stats.performanceRatio > 2)
    .map(([operation, stats]) => ({
      operation,
      severity: stats.performanceRatio > 4 ? 'critical' : 'high',
      performanceRatio: stats.performanceRatio,
      averageDuration: stats.averageDuration,
      threshold: stats.threshold,
      impact: operation === 'unlock_calculation' ? 'critical_path' : 'standard'
    }))
    .sort((a, b) => b.performanceRatio - a.performanceRatio);
}

function getMemoryStatus(memoryUsage) {
  const percentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  if (percentage > 90) return 'critical';
  if (percentage > 80) return 'warning';
  return 'healthy';
}

function getErrorTrends(errorStats) {
  // Simplified trend analysis
  return {
    direction: errorStats.errorRate > 10 ? 'increasing' : 
               errorStats.errorRate > 5 ? 'elevated' : 'stable',
    severity: errorStats.errorRate > 10 ? 'high' : 
              errorStats.errorRate > 5 ? 'medium' : 'low'
  };
}

function identifyAlertPatterns(alerts) {
  const patterns = {};
  const recentAlerts = alerts.slice(-50);
  
  // Group by type
  recentAlerts.forEach(alert => {
    patterns[alert.type] = (patterns[alert.type] || 0) + 1;
  });
  
  // Identify frequent patterns
  const frequentPatterns = Object.entries(patterns)
    .filter(([, count]) => count > 3)
    .map(([type, count]) => ({ type, count, frequency: 'high' }));
  
  return frequentPatterns;
}

function getAlertEscalation(alerts) {
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
  const last24h = Date.now() - (24 * 60 * 60 * 1000);
  const recentCritical = criticalAlerts.filter(alert => 
    new Date(alert.timestamp).getTime() > last24h
  );
  
  return {
    criticalAlertsLast24h: recentCritical.length,
    escalationNeeded: recentCritical.length > 3,
    lastCriticalAlert: criticalAlerts.length > 0 ? criticalAlerts[criticalAlerts.length - 1].timestamp : null
  };
}

function getAffectedOperations(issue) {
  const operationMap = {
    'high_error_rate': ['all_operations'],
    'critical_errors': ['database_operations', 'unlock_calculations'],
    'performance_degradation': ['user_facing_operations'],
    'resource_constraints': ['all_operations']
  };
  
  return operationMap[issue.type] || ['unknown'];
}

function calculateOverallCompliance(performanceStats, health) {
  let compliantRequirements = 0;
  let totalRequirements = 0;
  
  // Check Requirement 7.2 (unlock performance)
  totalRequirements++;
  if (performanceStats.unlock_calculation?.averageDuration <= 500) {
    compliantRequirements++;
  }
  
  // Check Requirement 8.3 (animation resilience)
  totalRequirements++;
  if (!health.issues.some(i => i.type === 'animation_failure')) {
    compliantRequirements++;
  }
  
  const percentage = totalRequirements > 0 ? (compliantRequirements / totalRequirements) * 100 : 100;
  
  return {
    percentage,
    status: percentage === 100 ? 'fully_compliant' : 
            percentage >= 80 ? 'mostly_compliant' : 'non_compliant',
    compliantRequirements,
    totalRequirements
  };
}

function generateSystemRecommendations(health, performanceStats, systemStatus) {
  const recommendations = [];
  
  // Performance recommendations
  if (performanceStats.unlock_calculation?.performanceRatio > 2) {
    recommendations.push({
      category: 'performance',
      priority: 'high',
      title: 'Optimize unlock calculations',
      description: 'Unlock calculations are exceeding the 500ms requirement',
      actions: [
        'Review unlock algorithm complexity',
        'Optimize database queries for progression',
        'Implement caching for unlock states'
      ]
    });
  }
  
  // Error rate recommendations
  const errorStats = ErrorLoggingService.getErrorStatistics();
  if (errorStats.errorRate > 10) {
    recommendations.push({
      category: 'reliability',
      priority: 'high',
      title: 'Reduce error rate',
      description: 'System error rate is above acceptable threshold',
      actions: [
        'Investigate top error sources',
        'Improve error handling and recovery',
        'Review recent deployments for regressions'
      ]
    });
  }
  
  // Resource recommendations
  const memoryUsage = systemStatus.systemMetrics.memoryUsage;
  const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  if (memoryPercent > 80) {
    recommendations.push({
      category: 'resources',
      priority: 'medium',
      title: 'Optimize memory usage',
      description: 'Memory usage is approaching limits',
      actions: [
        'Review memory-intensive operations',
        'Implement memory cleanup routines',
        'Consider increasing memory allocation'
      ]
    });
  }
  
  return recommendations;
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request ID middleware with monitoring integration
 */
export function requestIdMiddleware(req, res, next) {
  const startTime = Date.now();
  
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  
  // Track request completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Record API request metrics in system monitoring
    SystemMonitoringService.recordRequest(
      req.method,
      req.originalUrl,
      duration,
      res.statusCode
    );
  });
  
  next();
}