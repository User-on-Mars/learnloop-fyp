import mongoose from 'mongoose';

const UserXpProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  totalXp: { type: Number, default: 0, min: 0 },
  weeklyXp: { type: Number, default: 0, min: 0 },
  weekStartDate: { type: Date, required: true },
  leagueTier: {
    type: String,
    enum: ['Gold', 'Silver', 'Bronze', 'Newcomer'],
    default: 'Newcomer'
  }
}, { timestamps: true });

UserXpProfileSchema.index({ weeklyXp: -1 });
UserXpProfileSchema.index({ totalXp: -1 });
UserXpProfileSchema.index({ leagueTier: 1 });

export default mongoose.model('UserXpProfile', UserXpProfileSchema);
