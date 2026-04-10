import mongoose from 'mongoose';

const XpTransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  source: {
    type: String,
    required: true,
    enum: ['practice', 'reflection', 'admin_adjustment']
  },
  baseAmount: { type: Number, required: true, min: 0 },
  multiplier: { type: Number, required: true, min: 1 },
  finalAmount: { type: Number, required: true, min: 0 },
  referenceId: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

XpTransactionSchema.index({ userId: 1, createdAt: -1 });
XpTransactionSchema.index({ userId: 1, source: 1, createdAt: -1 });

export default mongoose.model('XpTransaction', XpTransactionSchema);
