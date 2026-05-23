import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import SubscriptionService from '../services/SubscriptionService.js';
import EsewaService from '../services/EsewaService.js';
import StripeService from '../services/StripeService.js';
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
    // First, find the most recent weekEndDate so we only show ONE week's winners
    const mostRecent = await WeeklyReward.findOne()
      .sort({ weekEndDate: -1 })
      .select('weekEndDate')
      .lean();

    if (!mostRecent) {
      return res.json({ rewards: [] });
    }

    // Get all rewards from that specific week only, sorted by rank
    const latest = await WeeklyReward.find({ weekEndDate: mostRecent.weekEndDate })
      .sort({ rank: 1 })
      .limit(3)
      .lean();

    // Mask emails for public display (e.g. "jo***@gmail.com")
    const masked = latest.map(r => {
      let maskedEmail = '';
      if (r.userEmail) {
        const [local, domain] = r.userEmail.split('@');
        if (local && domain) {
          maskedEmail = local.slice(0, 2) + '***@' + domain;
        }
      }
      return { ...r, userEmail: maskedEmail };
    });

    res.json({ rewards: masked });
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

    // Send upgrade notification + payment receipt (email + in-app)
    if (result.applied) {
      try {
        const user = await User.findOne({ firebaseUid: req.user.id }).lean()
          || await User.findOne({ _id: req.user.id }).lean();
        if (user) {
          const sub = await SubscriptionService.getSubscription(req.user.id);
          await NotificationService.sendSubscriptionUpgradeNotification(user, sub);

          // Send payment receipt
          const payment = await EsewaService.getPaymentByTransaction(result.transactionUuid);
          if (payment) {
            await NotificationService.sendPaymentReceiptNotification(user, payment, sub);
          }
        }
      } catch (notifErr) {
        console.error('⚠️ Failed to send upgrade/receipt notification:', notifErr.message);
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

// ─── Stripe Checkout Payment Flow ───────────────────────────────────────────

/**
 * POST /api/subscription/stripe/checkout
 * Create a Stripe Checkout Session for a one-time Pro payment.
 */
router.post('/stripe/checkout', async (req, res) => {
  try {
    const tier = await SubscriptionService.getTier(req.user.id);
    if (tier === 'pro') {
      return res.status(400).json({ message: 'You already have an active Pro subscription' });
    }

    const { planId } = req.body;
    const result = await StripeService.createCheckoutSession(req.user.id, planId || 'pro_1month');
    console.log(`Stripe checkout created for user ${req.user.id}: ${result.sessionId} (plan: ${planId || 'pro_1month'})`);
    res.json(result);
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error.message);
    res.status(500).json({ message: error.message || 'Failed to create Stripe checkout session' });
  }
});

/**
 * POST /api/subscription/stripe/verify
 * Verify a Checkout Session after Stripe redirects back to the app.
 * Webhook still remains the source of truth; this makes the UI update instantly.
 */
router.post('/stripe/verify', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: 'Missing Stripe session ID' });
    }

    const result = await StripeService.completeCheckoutSession(sessionId, req.user.id);
    const info = await SubscriptionService.getSubscriptionInfo(req.user.id);

    if (result.applied && result.justApplied) {
      try {
        const user = await User.findOne({ firebaseUid: req.user.id }).lean()
          || await User.findOne({ _id: req.user.id }).lean();
        if (user) {
          const sub = await SubscriptionService.getSubscription(req.user.id);
          await NotificationService.sendSubscriptionUpgradeNotification(user, sub);

          const payment = await StripeService.getPaymentByTransaction(result.transactionUuid);
          if (payment) {
            await NotificationService.sendPaymentReceiptNotification(user, payment, sub);
          }
        }
      } catch (notifErr) {
        console.error('Failed to send Stripe upgrade/receipt notification:', notifErr.message);
      }
    }

    res.json({
      payment: result,
      subscription: info,
    });
  } catch (error) {
    console.error('Error verifying Stripe payment:', error.message);
    res.status(400).json({ message: error.message || 'Stripe payment verification failed' });
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
 * GET /api/subscription/billing-history
 * Unified billing history: payments + rewards, sorted by date.
 * Supports pagination and filters.
 */
router.get('/billing-history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const type = req.query.type || ''; // 'payment' | 'reward' | ''
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    const [payments, rewards] = await Promise.all([
      EsewaService.getPaymentHistory(req.user.id),
      WeeklyReward.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    // Normalize into a unified format
    let history = [
      ...payments.map(p => ({
        id: p._id,
        type: 'payment',
        date: p.createdAt,
        plan: p.plan,
        amount: p.totalAmount,
        currency: p.currency || 'NPR',
        status: p.status,
        transactionId: p.transactionUuid,
        durationDays: p.durationDays,
        method: p.provider === 'stripe' ? 'Stripe' : 'eSewa',
        label: { pro_1month: '1 Month', pro_3month: '3 Months', pro_6month: '6 Months' }[p.plan] || p.plan,
      })),
      ...rewards.map(r => ({
        id: r._id,
        type: 'reward',
        date: r.createdAt,
        plan: `reward_rank${r.rank}`,
        amount: 0,
        currency: 'NPR',
        status: 'COMPLETE',
        transactionId: null,
        durationDays: r.rewardDays,
        method: 'Weekly Reward',
        label: `${r.rewardLabel} Pro (Rank #${r.rank})`,
        rank: r.rank,
        weeklyXp: r.weeklyXp,
        subscriptionExtendedTo: r.subscriptionExtendedTo,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply type filter
    if (type) {
      history = history.filter(h => h.type === type);
    }

    // Apply date range filter
    if (startDate) {
      history = history.filter(h => new Date(h.date) >= new Date(startDate));
    }
    if (endDate) {
      history = history.filter(h => new Date(h.date) <= new Date(endDate + 'T23:59:59.999Z'));
    }

    const total = history.length;
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paged = history.slice(skip, skip + limit);

    res.json({ history: paged, total, page, pages });
  } catch (error) {
    console.error('❌ Error getting billing history:', error.message);
    res.status(500).json({ message: 'Failed to get billing history' });
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
