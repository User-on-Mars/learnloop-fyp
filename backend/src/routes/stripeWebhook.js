import express, { Router } from 'express';
import StripeService from '../services/StripeService.js';

const router = Router();

router.post(
  '/subscription/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    try {
      const event = StripeService.constructWebhookEvent(req.body, signature);

      if (event.type === 'checkout.session.completed') {
        await StripeService.completeCheckoutSession(event.data.object);
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
