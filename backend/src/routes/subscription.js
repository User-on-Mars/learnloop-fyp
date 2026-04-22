import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import SubscriptionService from '../services/SubscriptionService.js';
import EsewaService from '../services/EsewaService.js';
import NotificationService from '../services/NotificationService.js';
import User from '../models/User.js';
import WeeklyReward from '../models/WeeklyReward.js';

const router = Router();

// ─── Public routes (no auth needed) ───────────────────────

/**
 * GET /api/subscription/plan
 * Get the Pro plan pricing info (for displaying price before login).
 */
router.get('/plan', (req, res) => {
  try {
    const plan = EsewaService.getPlanInfo();
    res.json(plan);
  } catch (error) {
    console.error('❌ Error getting plan info:', error.message);
    res.status(500).json({ message: 'Failed to get plan info' });
  }
});

// ─── Public: latest weekly rewards (for landing page) ─────
/**
 * GET /api/subscription/rewards/latest
 * Public — top 3 winners for display on the home page.
 */
router.get('/rewards/latest', async (req, res) => {
  try {
    const latest = await WeeklyReward.find()
      .sort({ weekEndDate: -1, rank: 1 })
      .limit(3)
      .lean();
    res.json({ rewards: latest });
  } catch (error) {
    console.error('❌ Error getting latest rewards:', error.message);
    res.status(500).json({ message: 'Failed to get latest rewards' });
  }
});

// ─── Authenticated routes ─────────────────────────────────

router.use(requireAuth);

/**
 * GET /api/subscription
 * Get current user's subscription info (tier, limits, usage).
 */
router.get('/', async (req, res) => {
  try {
    const info = await SubscriptionService.getSubscriptionInfo(req.user.id);
    res.json(info);
  } catch (error) {
    console.error('❌ Error getting subscription:', error.message);
    res.status(500).json({ message: 'Failed to get subscription info' });
  }
});

/**
 * GET /api/subscription/limits
 * Get the static tier limits config (for displaying plan comparison).
 */
router.get('/limits', async (req, res) => {
  try {
    const config = SubscriptionService.getTierLimitsConfig();
    res.json(config);
  } catch (error) {
    console.error('❌ Error getting tier limits:', error.message);
    res.status(500).json({ message: 'Failed to get tier limits' });
  }
});

/**
 * GET /api/subscription/payments
 * Get user's payment history.
 */
router.get('/payments', async (req, res) => {
  try {
    const payments = await EsewaService.getPaymentHistory(req.user.id);
    res.json({ payments });
  } catch (error) {
    console.error('❌ Error getting payment history:', error.message);
    res.status(500).json({ message: 'Failed to get payment history' });
  }
});

// ─── eSewa Payment Flow ───────────────────────────────────

/**
 * POST /api/subscription/esewa/initiate
 * Initiate an eSewa payment. Returns form data that the frontend
 * will use to redirect the user to eSewa's payment page.
 */
router.post('/esewa/initiate', async (req, res) => {
  try {
    // Check if user is already pro
    const tier = await SubscriptionService.getTier(req.user.id);
    if (tier === 'pro') {
      return res.status(400).json({ message: 'You already have an active Pro subscription' });
    }

    const { planId } = req.body;
    const result = await EsewaService.initiatePayment(req.user.id, planId || 'pro_1month');
    console.log(`💳 eSewa payment initiated for user ${req.user.id}: ${result.payment.transactionUuid} (plan: ${planId || 'pro_1month'})`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error initiating eSewa payment:', error.message);
    res.status(500).json({ message: error.message || 'Failed to initiate payment' });
  }
});

/**
 * POST /api/subscription/esewa/verify
 * Verify an eSewa payment after redirect. The frontend sends the
 * base64-encoded data from the success URL query parameter.
 */
router.post('/esewa/verify', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ message: 'Missing payment data' });
    }

    const result = await EsewaService.verifyPayment(data);

    // Return updated subscription info
    const info = await SubscriptionService.getSubscriptionInfo(req.user.id);

    // Send upgrade notification (email + in-app)
    if (result.applied) {
      try {
        const user = await User.findOne({ firebaseUid: req.user.id }).lean()
          || await User.findOne({ _id: req.user.id }).lean();
        if (user) {
          const sub = await SubscriptionService.getSubscription(req.user.id);
          await NotificationService.sendSubscriptionUpgradeNotification(user, sub);
        }
      } catch (notifErr) {
        console.error('⚠️ Failed to send upgrade notification:', notifErr.message);
      }
    }

    res.json({
      payment: result,
      subscription: info,
    });
  } catch (error) {
    console.error('❌ Error verifying eSewa payment:', error.message);
    res.status(400).json({ message: error.message || 'Payment verification failed' });
  }
});

// ─── Weekly Rewards (User-facing) ─────────────────────────

/**
 * GET /api/subscription/rewards
 * Get current user's reward history.
 */
router.get('/rewards', async (req, res) => {
  try {
    const rewards = await WeeklyReward.find({ userId: req.user.id })
      .sort({ weekEndDate: -1 })
      .limit(20)
      .lean();
    res.json({ rewards });
  } catch (error) {
    console.error('❌ Error getting user rewards:', error.message);
    res.status(500).json({ message: 'Failed to get rewards' });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel pro subscription (remains active until period end).
 */
router.post('/cancel', async (req, res) => {
  try {
    const sub = await SubscriptionService.cancelSubscription(req.user.id);
    const info = await SubscriptionService.getSubscriptionInfo(req.user.id);

    // Send cancel notification (email + in-app)
    try {
      const user = await User.findOne({ firebaseUid: req.user.id }).lean()
        || await User.findOne({ _id: req.user.id }).lean();
      if (user) {
        await NotificationService.sendSubscriptionCancelNotification(user, sub);
      }
    } catch (notifErr) {
      console.error('⚠️ Failed to send cancel notification:', notifErr.message);
    }

    res.json({ message: 'Subscription canceled. Access continues until period end.', ...info });
  } catch (error) {
    console.error('❌ Error canceling subscription:', error.message);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

export default router;
