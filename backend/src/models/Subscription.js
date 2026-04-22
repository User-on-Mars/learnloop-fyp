import mongoose from 'mongoose';

/**
 * Subscription model - tracks user subscription tier and limits.
 * 
 * Tiers:
 *   free - Default for all users
 *   pro  - Paid tier with expanded limits
 * 
 * This model is payment-provider agnostic. When you integrate Stripe/Paddle/etc,
 * store the external subscription ID in `externalId` and update status via webhooks.
 */
const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tier: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing'],
    default: 'active'
  },
  // For future payment provider integration (Stripe subscription ID, etc.)
  externalId: {
    type: String,
    default: null
  },
  // When the current billing period started
  currentPeriodStart: {
    type: Date,
    default: null
  },
  // When the current billing period ends (null = no expiry for free tier)
  currentPeriodEnd: {
    type: Date,
    default: null
  },
  // When the subscription was canceled (still active until period end)
  canceledAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

/**
 * Check if the subscription grants pro-level access right now.
 */
SubscriptionSchema.methods.isPro = function () {
  if (this.tier !== 'pro') return false;
  if (this.status === 'canceled' && this.currentPeriodEnd) {
    // Still active until period end
    return new Date() < this.currentPeriodEnd;
  }
  return this.status === 'active' || this.status === 'trialing';
};

export default mongoose.model('Subscription', SubscriptionSchema);
