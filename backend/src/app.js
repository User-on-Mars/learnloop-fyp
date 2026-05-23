/**
 * app.js — Express app factory (no server start, no DB connect)
 * 
 * Exported separately from server.js so tests can import the app
 * without starting the HTTP server or connecting to MongoDB.
 */

import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
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
import subscriptionRoutes from "./routes/subscription.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";
import contactRoutes from "./routes/contact.js";
import publishRequestRoutes from "./routes/publishRequests.js";
import notificationRoutes from "./routes/notifications.js";
import { requireAuth } from "./middleware/auth.js";
import { checkSkillMapLimit } from "./middleware/subscription.js";
import {
  securityHeaders,
  generalRateLimit,
  authRateLimit,
  sanitizeRequest,
  auditLogger,
  SECURITY_EVENTS
} from "./middleware/security.js";
import { errorHandler, requestIdMiddleware } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

// Compression
app.use(compression({ level: 6 }));

// Security headers
app.use(securityHeaders);

// Request ID tracing
app.use(requestIdMiddleware);

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://learnloop-fyp-frontend.vercel.app',
  'https://learnloop-fyp.vercel.app'
];

const corsOrigins = [
  ...(process.env.CLIENT_URL || '').split(','),
  ...defaultCorsOrigins
]
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const isAllowedCorsOrigin = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/$/, '');
  return corsOrigins.includes(normalizedOrigin) ||
    /^https:\/\/learnloop[-\w]*\.vercel\.app$/.test(normalizedOrigin);
};

const corsOptions = {
  origin: (origin, callback) => callback(null, isAllowedCorsOrigin(origin)),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400
};

// CORS
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Rate limiting (production only)
if (process.env.NODE_ENV === 'production') {
  app.use(generalRateLimit);
}

// Stripe needs the raw request body for webhook signature verification.
app.use("/api", stripeWebhookRoutes);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// XSS sanitization
app.use(sanitizeRequest);

// Health check
app.use("/api", healthRoutes);

// Auth routes with audit logging
if (process.env.NODE_ENV === 'production') {
  app.use("/api/auth", authRateLimit, auditLogger(SECURITY_EVENTS.AUTH_LOGIN));
} else {
  app.use("/api/auth", auditLogger(SECURITY_EVENTS.AUTH_LOGIN));
}

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/active-sessions", activeSessionRoutes);
app.use("/api/reflections", reflectionRoutes);
app.use("/api/sessions", sessionRoutes);

// Skill map wizard endpoints
app.post(
  "/api/skills/maps",
  requireAuth,
  checkSkillMapLimit,
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
app.use("/api/rooms", roomXpRoutes);
app.use("/api/rooms", roomProgressRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", invitationRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/publish-requests", publishRequestRoutes);

// Error handler
app.use(errorHandler);

export default app;
