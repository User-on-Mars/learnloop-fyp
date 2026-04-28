import crypto from 'crypto';
import Payment from '../models/Payment.js';
import SubscriptionService from './SubscriptionService.js';

/**
 * eSewa ePay V2 integration service.
 *
 * Testing credentials (from eSewa docs):
 *   Product Code : EPAYTEST
 *   Secret Key   : 8gBm/:&EnhH.1/q
 *   Payment URL  : https://rc-epay.esewa.com.np/api/epay/main/v2/form
 *   Status URL   : https://rc.esewa.com.np/api/epay/transaction/status/
 *
 * Production:
 *   Product Code : (provided by eSewa)
 *   Secret Key   : (provided by eSewa)
 *   Payment URL  : https://epay.esewa.com.np/api/epay/main/v2/form
 *   Status URL   : https://esewa.com.np/api/epay/transaction/status/
 */

// ─── Config ────────────────────────────────────────────────

function getConfig() {
  const isProduction = process.env.ESEWA_ENV === 'production';

  return {
    productCode: process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST',
    secretKey: process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q',
    paymentUrl: isProduction
      ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
      : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    statusUrl: isProduction
      ? 'https://esewa.com.np/api/epay/transaction/status/'
      : 'https://rc.esewa.com.np/api/epay/transaction/status/',
    successUrl: process.env.ESEWA_SUCCESS_URL || `${process.env.CLIENT_URL || 'http://localhost:5173'}/subscription/esewa/success`,
    failureUrl: process.env.ESEWA_FAILURE_URL || `${process.env.CLIENT_URL || 'http://localhost:5173'}/subscription/esewa/failure`,
  };
}

// ─── Pro plan pricing (in NPR) ─────────────────────────────

const PRO_PLANS = {
  pro_1month: {
    id: 'pro_1month',
    name: 'Pro — 1 Month',
    amount: 299,
    taxAmount: 0,
    serviceCharge: 0,
    deliveryCharge: 0,
    durationDays: 30,
    monthlyPrice: 299,
    savings: 0,
  },
  pro_3month: {
    id: 'pro_3month',
    name: 'Pro — 3 Months',
    amount: 749,
    taxAmount: 0,
    serviceCharge: 0,
    deliveryCharge: 0,
    durationDays: 90,
    monthlyPrice: 250,
    savings: 148,
  },
  pro_6month: {
    id: 'pro_6month',
    name: 'Pro — 6 Months',
    amount: 1299,
    taxAmount: 0,
    serviceCharge: 0,
    deliveryCharge: 0,
    durationDays: 180,
    monthlyPrice: 217,
    savings: 495,
  },
};

// ─── HMAC Signature ────────────────────────────────────────

/**
 * Generate HMAC-SHA256 signature in base64 as required by eSewa.
 * Input format: "total_amount={},transaction_uuid={},product_code={}"
 */
function generateSignature(totalAmount, transactionUuid, productCode, secretKey) {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(message);
  return hmac.digest('base64');
}

/**
 * Verify a signature from eSewa's response.
 */
function verifySignature(data, signature, secretKey) {
  // Build the message from signed_field_names
  const fieldNames = data.signed_field_names?.split(',') || [];
  const message = fieldNames.map(f => `${f}=${data[f]}`).join(',');
  const expected = crypto.createHmac('sha256', secretKey).update(message).digest('base64');
  return expected === signature;
}

// ─── Service ───────────────────────────────────────────────

class EsewaService {
  /**
   * Initiate a payment — creates a Payment record and returns form data
   * that the frontend will POST to eSewa's payment page.
   */
  async initiatePayment(userId, planId = 'pro_1month') {
    const config = getConfig();
    const plan = PRO_PLANS[planId];
    if (!plan) throw new Error(`Invalid plan: ${planId}`);
    const totalAmount = plan.amount + plan.taxAmount + plan.serviceCharge + plan.deliveryCharge;

    // Generate unique transaction ID: userId-timestamp
    const transactionUuid = `${userId.slice(-8)}-${Date.now()}`;

    // Generate HMAC signature
    const signature = generateSignature(
      totalAmount,
      transactionUuid,
      config.productCode,
      config.secretKey
    );

    // Save payment record
    const payment = await Payment.create({
      userId,
      transactionUuid,
      productCode: config.productCode,
      amount: plan.amount,
      taxAmount: plan.taxAmount,
      totalAmount,
      status: 'PENDING',
      plan: plan.id,
      durationDays: plan.durationDays,
    });

    // Return form data for the frontend to POST to eSewa
    return {
      paymentUrl: config.paymentUrl,
      formData: {
        amount: String(plan.amount),
        tax_amount: String(plan.taxAmount),
        total_amount: String(totalAmount),
        transaction_uuid: transactionUuid,
        product_code: config.productCode,
        product_service_charge: String(plan.serviceCharge),
        product_delivery_charge: String(plan.deliveryCharge),
        success_url: config.successUrl,
        failure_url: config.failureUrl,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature,
      },
      payment: {
        id: payment._id,
        transactionUuid,
        totalAmount,
        plan: plan.name,
      },
    };
  }

  /**
   * Verify payment after eSewa redirects back to success URL.
   * The frontend sends the base64-encoded response data from the URL query.
   *
   * Steps:
   *   1. Decode the base64 response
   *   2. Verify the HMAC signature
   *   3. Check payment status via eSewa's status API
   *   4. If COMPLETE, upgrade the user's subscription
   */
  async verifyPayment(encodedData) {
    const config = getConfig();

    // 1. Decode base64 response
    let responseData;
    try {
      const decoded = Buffer.from(encodedData, 'base64').toString('utf8');
      responseData = JSON.parse(decoded);
    } catch (err) {
      throw new Error('Invalid payment response data');
    }

    const { transaction_uuid, transaction_code, status, total_amount, product_code, signature } = responseData;

    if (!transaction_uuid) {
      throw new Error('Missing transaction UUID in response');
    }

    // 2. Find the payment record
    const payment = await Payment.findOne({ transactionUuid: transaction_uuid });
    if (!payment) {
      throw new Error('Payment record not found');
    }

    // 3. Verify signature integrity
    if (signature) {
      const isValid = verifySignature(responseData, signature, config.secretKey);
      if (!isValid) {
        payment.status = 'FAILED';
        await payment.save();
        throw new Error('Invalid payment signature — possible tampering');
      }
    }

    // 4. Double-check with eSewa's status API
    const verifiedStatus = await this.checkTransactionStatus(
      transaction_uuid,
      payment.totalAmount,
      config.productCode
    );

    // 5. Update payment record
    payment.status = verifiedStatus.status;
    payment.refId = verifiedStatus.ref_id || transaction_code || null;
    payment.transactionCode = transaction_code || null;

    if (verifiedStatus.status === 'COMPLETE' && !payment.applied) {
      // Upgrade the user's subscription
      const periodEnd = new Date(Date.now() + payment.durationDays * 24 * 60 * 60 * 1000);
      await SubscriptionService.upgradeToPro(payment.userId, {
        externalId: `esewa:${transaction_uuid}`,
        periodEnd,
      });
      payment.applied = true;
      console.log(`✅ eSewa payment verified & subscription upgraded for user ${payment.userId}`);
    }

    await payment.save();

    return {
      status: payment.status,
      transactionUuid: payment.transactionUuid,
      applied: payment.applied,
      plan: payment.plan,
    };
  }

  /**
   * Check transaction status directly with eSewa's API.
   * GET https://rc.esewa.com.np/api/epay/transaction/status/?product_code=X&total_amount=X&transaction_uuid=X
   */
  async checkTransactionStatus(transactionUuid, totalAmount, productCode) {
    const config = getConfig();
    const url = `${config.statusUrl}?product_code=${encodeURIComponent(productCode || config.productCode)}&total_amount=${totalAmount}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`eSewa status check failed: HTTP ${response.status}`);
        return { status: 'AMBIGUOUS', ref_id: null };
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('eSewa status check error:', err.message);
      return { status: 'AMBIGUOUS', ref_id: null };
    }
  }

  /**
   * Get payment history for a user.
   */
  async getPaymentHistory(userId) {
    return Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
  }

  /**
   * Get a single payment by transaction UUID.
   */
  async getPaymentByTransaction(transactionUuid) {
    return Payment.findOne({ transactionUuid }).lean();
  }

  /**
   * Get all pro plan pricing info (for frontend display).
   */
  getPlanInfo() {
    return Object.values(PRO_PLANS).map(plan => ({
      ...plan,
      totalAmount: plan.amount + plan.taxAmount + plan.serviceCharge + plan.deliveryCharge,
      currency: 'NPR',
    }));
  }
}

export default new EsewaService();
