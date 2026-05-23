import express, { Router } from 'express';
import StripeService from '../services/StripeService.js';
import SubscriptionService from '../services/SubscriptionService.js';
import NotificationService from '../services/NotificationService.js';
import User from '../models/User.js';

const router = Router();

router.post(
  '/subscription/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    try {
      const event = StripeService.constructWebhookEvent(req.body, signature);

      if (event.type === 'checkout.session.completed') {
        const result = await StripeService.completeCheckoutSession(event.data.object);
        if (result.applied && result.justApplied) {
          try {
            const payment = await StripeService.getPaymentByTransaction(result.transactionUuid);
            const user = await User.findOne({ firebaseUid: payment?.userId }).lean()
              || await User.findOne({ _id: payment?.userId }).lean();
            if (user && payment) {
              const sub = await SubscriptionService.getSubscription(payment.userId);
              await NotificationService.sendSubscriptionUpgradeNotification(user, sub);
              await NotificationService.sendPaymentReceiptNotification(user, payment, sub);
            }
          } catch (notificationError) {
            console.error('Stripe webhook notification error:', notificationError.message);
          }
        }
      }

      if (event.type === 'checkout.session.expired') {
        await StripeService.expireCheckoutSession(event.data.object.id);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook error:', error.message);
      res.status(400).json({ message: error.message || 'Invalid Stripe webhook' });
    }
  }
);

export default router;
