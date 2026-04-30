import mongoose from 'mongoose';

const UserStreakSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  currentStreak: { type: Number, default: 0, min: 0 },
  longestStreak: { type: Number, default: 0, min: 0 },
  lastPracticeDate: { type: Date, default: null },
  streakStartDate: { type: Date, default: null }
}, { timestamps: true });

UserStreakSchema.index({ currentStreak: -1 });

export default mongoose.model('UserStreak', UserStreakSchema);
