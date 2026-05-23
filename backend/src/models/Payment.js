import mongoose from 'mongoose';

/**
 * Payment model — tracks eSewa payment transactions.
 * Each payment attempt creates a record. On success, the subscription is upgraded.
 */
const PaymentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  // Unique transaction ID sent to eSewa (alphanumeric + hyphen only)
  transactionUuid: {
    type: String,
    required: true,
    unique: true
  },
  provider: {
    type: String,
    enum: ['esewa', 'stripe'],
    default: 'esewa',
    index: true
  },
  // eSewa product code (EPAYTEST for testing, merchant code for production)
  productCode: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    default: 'NPR'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Payment status from eSewa
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETE', 'FAILED', 'CANCELED', 'AMBIGUOUS', 'FULL_REFUND', 'PARTIAL_REFUND', 'NOT_FOUND', 'EXPIRED'],
    default: 'PENDING'
  },
  // eSewa reference ID (returned after successful payment)
  refId: {
    type: String,
    default: null
  },
  // eSewa transaction code
  transactionCode: {
    type: String,
    default: null
  },
  stripeCheckoutSessionId: {
    type: String,
    default: null,
    index: true
  },
  stripePaymentIntentId: {
    type: String,
    default: null
  },
  stripeCustomerId: {
    type: String,
    default: null
  },
  // What the payment is for
  plan: {
    type: String,
    enum: ['pro_monthly', 'pro_1month', 'pro_3month', 'pro_6month'],
    default: 'pro_1month'
  },
  // Duration in days the subscription lasts
  durationDays: {
    type: Number,
    default: 30
  },
  // Whether this payment has been applied to the subscription
  applied: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

PaymentSchema.index({ userId: 1, status: 1 });

export default mongoose.model('Payment', PaymentSchema);
