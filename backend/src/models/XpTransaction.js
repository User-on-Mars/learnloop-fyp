import mongoose from 'mongoose';

const XpTransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  source: {
    type: String,
    required: true,
    enum: ['session_completion', 'reflection', 'streak_bonus', 'skillmap_completion']
  },
  baseAmount: { type: Number, required: true, min: 1 },
  multiplier: { type: Number, required: true, enum: [1, 2] },
  finalAmount: { type: Number, required: true, min: 1 },
  referenceId: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

XpTransactionSchema.index({ userId: 1, createdAt: -1 });
XpTransactionSchema.index({ userId: 1, source: 1, createdAt: -1 });

export default mongoose.model('XpTransaction', XpTransactionSchema);
