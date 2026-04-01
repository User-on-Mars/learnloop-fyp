import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import XpService from '../services/XpService.js';
import XpTransaction from '../models/XpTransaction.js';

const router = Router();

// All XP routes require authentication
router.use(requireAuth);

// GET /api/xp/profile — Get current user's XP profile
router.get('/profile', async (req, res) => {
  try {
    const profile = await XpService.getProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    console.error('❌ Error fetching XP profile:', error.message);
    res.status(500).json({
      error: { message: 'Failed to retrieve XP profile', code: 'SERVER_ERROR' }
    });
  }
});

// GET /api/xp/transactions — Get current user's recent XP transactions (paginated)
router.get('/transactions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const [transactions, total] = await Promise.all([
      XpTransaction.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      XpTransaction.countDocuments({ userId: req.user.id })
    ]);

    res.json({ transactions, total, page, pageSize });
  } catch (error) {
    console.error('❌ Error fetching XP transactions:', error.message);
    res.status(500).json({
      error: { message: 'Failed to retrieve XP transactions', code: 'SERVER_ERROR' }
    });
  }
});

export default router;
