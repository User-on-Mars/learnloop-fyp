import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import SubscriptionService from './SubscriptionService.js';

const PRO_PLANS = {
  pro_1month: {
    id: 'pro_1month',
    name: 'Pro - 1 Month',
    amount: 299,
    durationDays: 30,
  },
  pro_3month: {
    id: 'pro_3month',
    name: 'Pro - 3 Months',
    amount: 749,
    durationDays: 90,
  },
  pro_6month: {
    id: 'pro_6month',
    name: 'Pro - 6 Months',
    amount: 1299,
    durationDays: 180,
  },
};

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getClientUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].replace(/\/$/, '');
}

function getSuccessUrl() {
  return process.env.STRIPE_SUCCESS_URL ||
    `${getClientUrl()}/subscription/stripe/success?session_id={CHECKOUT_SESSION_ID}`;
}

function getCancelUrl() {
  return process.env.STRIPE_CANCEL_URL || `${getClientUrl()}/subscription`;
}

function getCurrency() {
  return (process.env.STRIPE_CURRENCY || 'npr').toLowerCase();
}

class StripeService {
  async createCheckoutSession(userId, planId = 'pro_1month') {
    const plan = PRO_PLANS[planId];
    if (!plan) throw new Error(`Invalid plan: ${planId}`);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: getCurrency(),
            product_data: {
              name: `LearnLoop ${plan.name}`,
              description: `${plan.durationDays} days of Pro access`,
            },
            unit_amount: Math.round(plan.amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: getSuccessUrl(),
      cancel_url: getCancelUrl(),
      client_reference_id: userId,
      metadata: {
        userId,
        planId: plan.id,
        durationDays: String(plan.durationDays),
      },
    });

    const payment = await Payment.create({
      userId,
      transactionUuid: session.id,
      provider: 'stripe',
      productCode: 'STRIPE_CHECKOUT',
      currency: getCurrency().toUpperCase(),
      amount: plan.amount,
      taxAmount: 0,
      totalAmount: plan.amount,
      status: 'PENDING',
      plan: plan.id,
      durationDays: plan.durationDays,
      stripeCheckoutSessionId: session.id,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      payment: {
        id: payment._id,
        transactionUuid: payment.transactionUuid,
        totalAmount: payment.totalAmount,
        plan: plan.name,
      },
    };
  }

  async completeCheckoutSession(session, expectedUserId = null) {
    const sessionId = typeof session === 'string' ? session : session.id;
    const fullSession = typeof session === 'string'
      ? await getStripe().checkout.sessions.retrieve(session, { expand: ['payment_intent'] })
      : session;

    if (fullSession.payment_status !== 'paid') {
      return {
        status: 'PENDING',
        applied: false,
        justApplied: false,
        transactionUuid: sessionId,
      };
    }

    const userId = fullSession.metadata?.userId || fullSession.client_reference_id;
    const planId = fullSession.metadata?.planId || 'pro_1month';
    const plan = PRO_PLANS[planId] || PRO_PLANS.pro_1month;
    if (!userId) throw new Error('Stripe session is missing user metadata');
    if (expectedUserId && expectedUserId !== userId) {
      throw new Error('Stripe session does not belong to the current user');
    }

    let payment = await Payment.findOne({
      $or: [
        { stripeCheckoutSessionId: sessionId },
        { transactionUuid: sessionId },
      ],
    });

    if (!payment) {
      payment = await Payment.create({
        userId,
        transactionUuid: sessionId,
        provider: 'stripe',
        productCode: 'STRIPE_CHECKOUT',
        currency: (fullSession.currency || getCurrency()).toUpperCase(),
        amount: plan.amount,
        taxAmount: 0,
        totalAmount: plan.amount,
        status: 'PENDING',
        plan: plan.id,
        durationDays: plan.durationDays,
        stripeCheckoutSessionId: sessionId,
      });
    }

    const paymentIntentId = typeof fullSession.payment_intent === 'string'
      ? fullSession.payment_intent
      : fullSession.payment_intent?.id || null;

    const justApplied = !payment.applied;
    payment.status = 'COMPLETE';
    payment.refId = paymentIntentId;
    payment.transactionCode = sessionId;
    payment.stripePaymentIntentId = paymentIntentId;
    payment.stripeCustomerId = typeof fullSession.customer === 'string' ? fullSession.customer : null;

    if (justApplied) {
      const periodEnd = new Date(Date.now() + payment.durationDays * 24 * 60 * 60 * 1000);
      await SubscriptionService.upgradeToPro(payment.userId, {
        externalId: `stripe:${sessionId}`,
        periodEnd,
      });
      payment.applied = true;
    }

    await payment.save();

    return {
      status: payment.status,
      transactionUuid: payment.transactionUuid,
      applied: payment.applied,
      justApplied,
      plan: payment.plan,
    };
  }

  async expireCheckoutSession(sessionId) {
    const payment = await Payment.findOne({
      $or: [
        { stripeCheckoutSessionId: sessionId },
        { transactionUuid: sessionId },
      ],
      status: 'PENDING',
    });
    if (!payment) return null;
    payment.status = 'EXPIRED';
    await payment.save();
    return payment;
  }

  constructWebhookEvent(rawBody, signature) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook is not configured. Missing STRIPE_WEBHOOK_SECRET.');
    }
    return getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }

  async getPaymentByTransaction(transactionUuid) {
    return Payment.findOne({ transactionUuid }).lean();
  }
}

export default new StripeService();
