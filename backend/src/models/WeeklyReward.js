import mongoose from 'mongoose';

/**
 * WeeklyReward — tracks subscription rewards given to top leaderboard users each week.
 */
const WeeklyRewardSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userName: { type: String, default: 'Unknown' },
  userEmail: { type: String, default: '' },
  rank: { type: Number, required: true }, // 1, 2, or 3
  weeklyXp: { type: Number, required: true },
  rewardDays: { type: Number, required: true }, // 180, 90, or 30
  rewardLabel: { type: String, required: true }, // "6 months", "3 months", "1 month"
  weekEndDate: { type: Date, required: true }, // The Sunday that ended the week
  subscriptionExtendedTo: { type: Date, required: true }, // New end date after reward
}, { timestamps: true });

WeeklyRewardSchema.index({ weekEndDate: -1 });
WeeklyRewardSchema.index({ userId: 1, weekEndDate: -1 });

export default mongoose.model('WeeklyReward', WeeklyRewardSchema);
