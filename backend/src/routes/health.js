/**
 * Health Check Routes
 * 
 * Comprehensive health monitoring endpoints for production deployment
 */

import express from 'express';
import { connectDB } from '../config/db.js';
import cacheService from '../services/CacheService.js';
import SystemMonitoringService from '../services/SystemMonitoringService.js';

const router = express.Router();

/**
 * Basic health check - fast response for load balancers
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * Detailed health check - comprehensive system status
 */
router.get('/health/detailed', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {},
    performance: {},
    system: {}
  };

  let overallHealthy = true;

  try {
    // Check MongoDB connection
    try {
      const mongoose = await import('mongoose');
      const dbState = mongoose.connection.readyState;
      healthStatus.services.mongodb = {
        status: dbState === 1 ? 'healthy' : 'unhealthy',
        state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState],
        responseTime: null
      };
      
      if (dbState !== 1) {
        overallHealthy = false;
      }
    } catch (error) {
      healthStatus.services.mongodb = {
        status: 'unhealthy',
        error: error.message
      };
      overallHealthy = false;
    }

    // Check Redis connection
    try {
      const startTime = Date.now();
      await cacheService.ping();
      const responseTime = Date.now() - startTime;
      
      healthStatus.services.redis = {
        status: 'healthy',
        responseTime: `${responseTime}ms`
      };
    } catch (error) {
      healthStatus.services.redis = {
        status: 'unhealthy',
        error: error.message
      };
      overallHealthy = false;
    }

    // Check WebSocket service
    try {
      const WebSocketService = (await import('../services/WebSocketService.js')).default;
      const wsStats = WebSocketService.getConnectionStats();
      
      healthStatus.services.websocket = {
        status: 'healthy',
        connections: wsStats.totalConnections,
        users: wsStats.totalUsers,
        rooms: wsStats.totalRooms
      };
    } catch (error) {
      healthStatus.services.websocket = {
        status: 'unhealthy',
        error: error.message
      };
      // WebSocket issues don't make the service unhealthy
    }

    // Performance metrics
    const performanceStats = SystemMonitoringService.getPerformanceStats();
    healthStatus.performance = {
      averageResponseTime: performanceStats.averageResponseTime,
      requestsPerMinute: performanceStats.requestsPerMinute,
      errorRate: performanceStats.errorRate,
      memoryUsage: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };

    // System information
    healthStatus.system = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuUsage: process.cpuUsage(),
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null
    };

    // Set overall status
    healthStatus.status = overallHealthy ? 'healthy' : 'unhealthy';
    
    res.status(overallHealthy ? 200 : 503).json(healthStatus);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Readiness check - indicates if service is ready to accept traffic
 */
router.get('/health/ready', async (req, res) => {
  try {
    // Check critical dependencies
    const mongoose = await import('mongoose');
    const dbReady = mongoose.connection.readyState === 1;
    
    let cacheReady = false;
    try {
      await cacheService.ping();
      cacheReady = true;
    } catch (error) {
      // Cache not critical for readiness
      cacheReady = true;
    }

    const isReady = dbReady && cacheReady;

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbReady ? 'ready' : 'not_ready',
        cache: cacheReady ? 'ready' : 'not_ready'
      }
    });

  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Liveness check - indicates if service is alive (for Kubernetes)
 */
router.get('/health/live', (req, res) => {
  // Simple check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Performance metrics endpoint
 */
router.get('/health/metrics', (req, res) => {
  try {
    const performanceStats = SystemMonitoringService.getPerformanceStats();
    const memoryUsage = process.memoryUsage();
    
    res.status(200).json({
      timestamp: new Date().toISOString(),
      performance: performanceStats,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        unit: 'MB'
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        cpuUsage: process.cpuUsage()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

export default router;