import mongoose from 'mongoose';

const WeeklyResetHistorySchema = new mongoose.Schema({
  weekEndDate: { type: Date, required: true },
  promotions: [{
    userId: String,
    fromTier: String,
    toTier: String
  }],
  relegations: [{
    userId: String,
    fromTier: String,
    toTier: String
  }],
  totalRankedUsers: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('WeeklyResetHistory', WeeklyResetHistorySchema);
