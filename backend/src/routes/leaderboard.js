import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import LeaderboardService from '../services/LeaderboardService.js';

const router = Router();

// All leaderboard routes require authentication
router.use(requireAuth);

// GET /api/leaderboard/weekly?page=1 — Weekly XP leaderboard
router.get('/weekly', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const data = await LeaderboardService.getWeeklyBoard(page, 50);
    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching weekly leaderboard:', error.message);
    res.status(500).json({
      error: { message: 'Failed to retrieve weekly leaderboard', code: 'SERVER_ERROR' }
    });
  }
});

// GET /api/leaderboard/streaks?page=1 — Streak leaderboard
router.get('/streaks', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const data = await LeaderboardService.getStreakBoard(page, 50);
    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching streak leaderboard:', error.message);
    res.status(500).json({
      error: { message: 'Failed to retrieve streak leaderboard', code: 'SERVER_ERROR' }
    });
  }
});

// GET /api/leaderboard/all-time?page=1 — All-time XP leaderboard
router.get('/all-time', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const data = await LeaderboardService.getAllTimeBoard(page, 50);
    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching all-time leaderboard:', error.message);
    res.status(500).json({
      error: { message: 'Failed to retrieve all-time leaderboard', code: 'SERVER_ERROR' }
    });
  }
});

// GET /api/leaderboard/my-ranks — Current user's ranks across all boards
router.get('/my-ranks', async (req, res) => {
  try {
    const ranks = await LeaderboardService.getUserRanks(req.user.id);
    res.json(ranks);
  } catch (error) {
    console.error('❌ Error fetching user ranks:', error.message);
    res.status(500).json({
      error: { message: 'Failed to retrieve user ranks', code: 'SERVER_ERROR' }
    });
  }
});

// POST /api/leaderboard/clear-cache — Clear leaderboard cache (for debugging)
router.post('/clear-cache', async (req, res) => {
  try {
    await LeaderboardService.clearCache();
    console.log('✅ Leaderboard cache cleared manually');
    res.json({ ok: true, message: 'Cache cleared' });
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
