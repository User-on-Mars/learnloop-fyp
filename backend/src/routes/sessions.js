import express from 'express';
import { requireAuth, verifySessionOwnership } from '../middleware/auth.js';
import { checkSessionLimit } from '../middleware/subscription.js';
import { 
  sessionRateLimit, 
  validateReflectionInput, 
  handleValidationErrors,
  auditLogger,
  SECURITY_EVENTS 
} from '../middleware/security.js';
import { validateRequest, sessionDataSchema, reflectionDataSchema } from '../middleware/validation.js';
import SessionController from '../controllers/sessionController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Apply rate limiting to session operations
router.use(sessionRateLimit);

// POST /api/sessions/start - Start a new learning session
router.post('/start', 
  auditLogger(SECURITY_EVENTS.SESSION_START),
  validateRequest(sessionDataSchema),
  checkSessionLimit,
  SessionController.startSession
);

// PUT /api/sessions/{id}/progress - Update session progress
router.put('/:id/progress', 
  verifySessionOwnership,
  validateRequest(sessionDataSchema),
  SessionController.updateProgress
);

// POST /api/sessions/{id}/complete - Complete session with reflection
router.post('/:id/complete', 
  verifySessionOwnership,
  auditLogger(SECURITY_EVENTS.SESSION_COMPLETE),
  validateRequest(reflectionDataSchema),
  SessionController.completeSession
);

// GET /api/sessions/active - Get current active session
router.get('/active', SessionController.getActiveSession);

// GET /api/sessions/history/{nodeId} - Get session history for node
router.get('/history/:nodeId', SessionController.getSessionHistory);

// POST /api/sessions/{id}/recover - Recover and resume abandoned session
router.post('/:id/recover', 
  verifySessionOwnership,
  auditLogger(SECURITY_EVENTS.SESSION_START),
  SessionController.recoverSession
);

// POST /api/sessions/{id}/abandon - Manually abandon session
router.post('/:id/abandon', 
  verifySessionOwnership,
  auditLogger(SECURITY_EVENTS.SESSION_COMPLETE),
  SessionController.abandonSession
);

export default router;