import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import { createServer } from "http";
import { connectDB } from "./config/db.js";
import cacheService from "./services/CacheService.js";
import WebSocketService from "./services/WebSocketService.js";
import authRoutes from "./routes/auth.js";
import practiceRoutes from "./routes/practice.js";
import activeSessionRoutes from "./routes/activeSessions.js";
import reflectionRoutes from "./routes/reflections.js";
import sessionRoutes from "./routes/sessions.js";
import healthRoutes from "./routes/health.js";
import skillRoutes from "./routes/skills.js";
import skillMapRoutes, {
  createSkillMapSchema,
  validateCreateSkillMapBody,
  postCreateSkillMap,
  getSkillMapFullHandler,
} from "./routes/skillMaps.js";
import nodeRoutes from "./routes/nodes.js";
import adminRoutes from "./routes/admin.js";
import xpRoutes from "./routes/xp.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import templateRoutes from "./routes/templates.js";
import roomRoutes from "./routes/rooms.js";
import invitationRoutes from "./routes/invitations.js";
import roomXpRoutes from "./routes/roomXp.js";
import roomProgressRoutes from "./routes/roomProgress.js";
import { requireAuth } from "./middleware/auth.js";
import { checkAccountStatus } from "./middleware/adminAuth.js";
import { 
  securityHeaders, 
  generalRateLimit, 
  authRateLimit, 
  sanitizeRequest,
  auditLogger,
  SECURITY_EVENTS 
} from "./middleware/security.js";
import { 
  errorHandler, 
  requestIdMiddleware, 
  healthCheck,
  monitoringStatus,
  monitoringDashboard
} from "./middleware/errorHandler.js";
import ErrorLoggingService from "./services/ErrorLoggingService.js";
import SystemMonitoringService from "./services/SystemMonitoringService.js";
import WeeklyResetScheduler from "./services/WeeklyResetScheduler.js";
import DailyStreakResetScheduler from "./services/DailyStreakResetScheduler.js";
import InvitationExpiryScheduler from "./services/InvitationExpiryScheduler.js";
import RoomWeeklyStreakResetScheduler from "./services/RoomWeeklyStreakResetScheduler.js";

dotenv.config();
const app = express();
const server = createServer(app);

// Compression middleware for faster responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Balance between speed and compression ratio
}));

// Security headers
app.use(securityHeaders);

// Request ID middleware for tracing
app.use(requestIdMiddleware);

// Rate limiting - apply general rate limiting to all routes (disabled in development)
if (process.env.NODE_ENV === 'production') {
  app.use(generalRateLimit);
}

// DEV CORS: allow all origins + preflight (fixes your browser's OPTIONS failure)
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID"],
    maxAge: 86400 // 24 hours
  })
);
// Ensure preflights are answered
app.options("*", cors());

app.use(express.json({ limit: '10mb' })); // Limit payload size for security

// Request sanitization middleware
app.use(sanitizeRequest);

// Request logging middleware with audit logging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.method === 'POST' || req.method === 'PUT' ? req.body : '');
  next();
});

// Enhanced health check endpoints with monitoring
app.use("/api", healthRoutes);

// Apply specific rate limiting to auth routes (disabled in development)
if (process.env.NODE_ENV === 'production') {
  app.use("/api/auth", authRateLimit, auditLogger(SECURITY_EVENTS.AUTH_LOGIN));
} else {
  app.use("/api/auth", auditLogger(SECURITY_EVENTS.AUTH_LOGIN));
}

// your API routes with audit logging
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/practice", auditLogger(SECURITY_EVENTS.NODE_UPDATE), practiceRoutes);
app.use("/api/active-sessions", auditLogger(SECURITY_EVENTS.SESSION_START), activeSessionRoutes);
app.use("/api/reflections", auditLogger(SECURITY_EVENTS.SESSION_COMPLETE), reflectionRoutes);
app.use("/api/sessions", auditLogger(SECURITY_EVENTS.SESSION_START), sessionRoutes);
/* Wizard endpoints registered on app (not only nested router) so POST is never lost to routing order */
app.post(
  "/api/skills/maps",
  requireAuth,
  validateCreateSkillMapBody(createSkillMapSchema),
  postCreateSkillMap
);
app.get("/api/skills/maps/:id/full", requireAuth, getSkillMapFullHandler);
app.use("/api/skills", skillRoutes);
app.use("/api/skill-maps", skillMapRoutes);
app.use("/api/nodes", nodeRoutes);
app.use("/api/xp", xpRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/rooms", auditLogger(SECURITY_EVENTS.NODE_UPDATE), roomXpRoutes);
app.use("/api/rooms", auditLogger(SECURITY_EVENTS.NODE_UPDATE), roomProgressRoutes);
app.use("/api", auditLogger(SECURITY_EVENTS.UNAUTHORIZED_ACCESS), invitationRoutes);

// Error handling middleware with security logging
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  // Log security-relevant errors
  if (err.status === 401 || err.status === 403) {
    console.log(`🔒 SECURITY EVENT [${SECURITY_EVENTS.UNAUTHORIZED_ACCESS}]:`, {
      timestamp: new Date().toISOString(),
      userId: req.user?.id || 'anonymous',
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.originalUrl,
      error: err.message
    });
  }
  
  res.status(err.status || 500).json({ 
    message: err.status < 500 ? err.message : 'Internal server error', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Enhanced error handling middleware
app.use(errorHandler);

// start server (keep your existing PORT/env)
const PORT = process.env.PORT || 4000;

// Initialize database and cache connections
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ MongoDB connected');
    
    // Try to connect to Redis cache (optional)
    try {
      await cacheService.connect();
      console.log('✅ Redis cache connected');
    } catch (redisError) {
      console.warn('⚠️ Redis cache unavailable - continuing without caching:', redisError.message);
    }
    
    // Initialize WebSocket service
    WebSocketService.initialize(server);
    console.log('✅ WebSocket service initialized');
    
    // Log system startup
    await ErrorLoggingService.logSystemEvent('server_startup', {
      nodeEnv: process.env.NODE_ENV,
      port: PORT,
      timestamp: new Date().toISOString()
    });
    
    // Start system monitoring
    SystemMonitoringService.start();
    console.log('✅ System monitoring started');
    
    // Start weekly reset scheduler
    WeeklyResetScheduler.start();
    console.log('✅ Weekly reset scheduler started');
    
    // Start daily streak reset scheduler
    DailyStreakResetScheduler.start();
    console.log('✅ Daily streak reset scheduler started');
    
    // Start invitation expiry scheduler
    InvitationExpiryScheduler.start();
    console.log('✅ Invitation expiry scheduler started');
    
    // Start room weekly streak reset scheduler
    RoomWeeklyStreakResetScheduler.start();
    console.log('✅ Room weekly streak reset scheduler started');
    
    // Start the server
    const serverInstance = server.listen(PORT, () => {
      console.log(`🚀 API running on http://localhost:${PORT}`);
    });
    
    return serverInstance;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    
    // Log startup failure
    await ErrorLoggingService.logError(error, {
      operation: 'server_startup',
      fatal: true
    });
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    // Stop weekly reset scheduler
    WeeklyResetScheduler.stop();
    console.log('✅ Weekly reset scheduler stopped');
    
    // Stop daily streak reset scheduler
    DailyStreakResetScheduler.stop();
    console.log('✅ Daily streak reset scheduler stopped');
    
    // Stop invitation expiry scheduler
    InvitationExpiryScheduler.stop();
    console.log('✅ Invitation expiry scheduler stopped');
    
    // Stop room weekly streak reset scheduler
    RoomWeeklyStreakResetScheduler.stop();
    console.log('✅ Room weekly streak reset scheduler stopped');
    
    // Stop system monitoring
    SystemMonitoringService.stop();
    console.log('✅ System monitoring stopped');
    
    // Shutdown WebSocket service
    WebSocketService.shutdown();
    console.log('✅ WebSocket service stopped');
    
    // Log shutdown event
    await ErrorLoggingService.logSystemEvent('server_shutdown', {
      reason: 'SIGINT',
      uptime: process.uptime()
    });
    
    await cacheService.disconnect();
    console.log('✅ Cache disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully (SIGTERM)...');
  try {
    // Stop weekly reset scheduler
    WeeklyResetScheduler.stop();
    console.log('✅ Weekly reset scheduler stopped');
    
    // Stop daily streak reset scheduler
    DailyStreakResetScheduler.stop();
    console.log('✅ Daily streak reset scheduler stopped');
    
    // Stop invitation expiry scheduler
    InvitationExpiryScheduler.stop();
    console.log('✅ Invitation expiry scheduler stopped');
    
    // Stop room weekly streak reset scheduler
    RoomWeeklyStreakResetScheduler.stop();
    console.log('✅ Room weekly streak reset scheduler stopped');
    
    // Stop system monitoring
    SystemMonitoringService.stop();
    console.log('✅ System monitoring stopped');
    
    // Shutdown WebSocket service
    WebSocketService.shutdown();
    console.log('✅ WebSocket service stopped');
    
    // Log shutdown event
    await ErrorLoggingService.logSystemEvent('server_shutdown', {
      reason: 'SIGTERM',
      uptime: process.uptime()
    });
    
    await cacheService.disconnect();
    console.log('✅ Cache disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();
