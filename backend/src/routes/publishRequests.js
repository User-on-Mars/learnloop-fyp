import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import PublishRequestService from '../services/PublishRequestService.js';
import ErrorLoggingService from '../services/ErrorLoggingService.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * Check if user can submit a publish request
 * GET /api/publish-requests/eligibility
 */
router.get('/eligibility', async (req, res) => {
  try {
    const userId = req.user.id;
    const eligibility = await PublishRequestService.checkSubmissionEligibility(userId);
    
    res.json(eligibility);
  } catch (error) {
    console.error('Check eligibility error:', error);
    await ErrorLoggingService.logError(error, {
      userId: req.user.id,
      endpoint: '/eligibility'
    });
    res.status(500).json({ message: 'Failed to check eligibility' });
  }
});

/**
 * Submit a publish request
 * POST /api/publish-requests
 * Body: { skillmapId: string }
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillmapId } = req.body;

    if (!skillmapId) {
      return res.status(400).json({ message: 'Skillmap ID is required' });
    }

    const request = await PublishRequestService.submitPublishRequest(userId, skillmapId);
    
    res.status(201).json({
      message: 'Publish request submitted successfully',
      request
    });
  } catch (error) {
    console.error('Submit publish request error:', error);
    await ErrorLoggingService.logError(error, {
      userId: req.user.id,
      skillmapId: req.body.skillmapId,
      endpoint: '/submit'
    });
    
    // Return user-friendly error messages
    if (error.message.includes('already have a pending')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('monthly submission limit')) {
      return res.status(429).json({ message: error.message });
    }
    if (error.message.includes('at least 5 skills')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to submit publish request' });
  }
});

/**
 * Get user's publish requests
 * GET /api/publish-requests/my-requests
 */
router.get('/my-requests', async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await PublishRequestService.getUserRequests(userId);
    
    res.json({ requests });
  } catch (error) {
    console.error('Get user requests error:', error);
    await ErrorLoggingService.logError(error, {
      userId: req.user.id,
      endpoint: '/my-requests'
    });
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
});

/**
 * Cancel a pending request (user)
 * DELETE /api/publish-requests/:requestId
 */
router.delete('/:requestId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    // Verify the request belongs to the user
    const PublishRequest = (await import('../models/PublishRequest.js')).default;
    const request = await PublishRequest.findById(requestId).lean();
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    if (request.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const updatedRequest = await PublishRequestService.cancelRequest(
      requestId,
      'Cancelled by user'
    );
    
    res.json({
      message: 'Request cancelled successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    await ErrorLoggingService.logError(error, {
      userId: req.user.id,
      requestId: req.params.requestId,
      endpoint: '/cancel'
    });
    
    if (error.message.includes('Only pending requests')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to cancel request' });
  }
});

// ─── Admin Routes ───────────────────────────────────────────

/**
 * Get all publish requests history (admin)
 * GET /api/publish-requests/admin/history
 */
router.get('/admin/history', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await PublishRequestService.getAllRequests({ status, page, limit });
    
    res.json(result);
  } catch (error) {
    console.error('Get request history error:', error);
    await ErrorLoggingService.logError(error, {
      adminId: req.user.id,
      endpoint: '/admin/history'
    });
    res.status(500).json({ message: 'Failed to fetch request history' });
  }
});

/**
 * Get all pending publish requests (admin)
 * GET /api/publish-requests/admin/pending
 */
router.get('/admin/pending', requireAdmin, async (req, res) => {
  try {
    const requests = await PublishRequestService.getPendingRequests();
    
    res.json({ requests });
  } catch (error) {
    console.error('Get pending requests error:', error);
    await ErrorLoggingService.logError(error, {
      adminId: req.user.id,
      endpoint: '/admin/pending'
    });
    res.status(500).json({ message: 'Failed to fetch pending requests' });
  }
});

/**
 * Approve a publish request (admin)
 * POST /api/publish-requests/admin/:requestId/approve
 * Body: { adminNote?: string }
 */
router.post('/admin/:requestId/approve', requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { requestId } = req.params;
    const { adminNote } = req.body;

    const result = await PublishRequestService.approveRequest(
      requestId,
      adminId,
      adminNote || ''
    );
    
    res.json({
      message: 'Request approved successfully',
      request: result.request,
      template: result.template
    });
  } catch (error) {
    console.error('Approve request error:', error);
    await ErrorLoggingService.logError(error, {
      adminId: req.user.id,
      requestId: req.params.requestId,
      endpoint: '/admin/approve'
    });
    
    if (error.message.includes('already been reviewed')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to approve request' });
  }
});

/**
 * Reject a publish request (admin)
 * POST /api/publish-requests/admin/:requestId/reject
 * Body: { adminNote: string }
 */
router.post('/admin/:requestId/reject', requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { requestId } = req.params;
    const { adminNote } = req.body;

    if (!adminNote || adminNote.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Rejection reason is required' 
      });
    }

    const request = await PublishRequestService.rejectRequest(
      requestId,
      adminId,
      adminNote
    );
    
    res.json({
      message: 'Request rejected successfully',
      request
    });
  } catch (error) {
    console.error('Reject request error:', error);
    await ErrorLoggingService.logError(error, {
      adminId: req.user.id,
      requestId: req.params.requestId,
      endpoint: '/admin/reject'
    });
    
    if (error.message.includes('already been reviewed')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to reject request' });
  }
});

export default router;
