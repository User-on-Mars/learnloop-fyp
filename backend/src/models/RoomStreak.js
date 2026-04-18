import mongoose from 'mongoose';

const RoomStreakSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  currentStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  lastActivityDate: {
    type: Date,
    default: null
  },
  lastResetAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate streak records per user per room
RoomStreakSchema.index({ roomId: 1, userId: 1 }, { unique: true });

export default mongoose.model('RoomStreak', RoomStreakSchema);
