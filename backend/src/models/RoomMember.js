import mongoose from 'mongoose';

const RoomMemberSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['owner', 'member'],
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate memberships
RoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

// Index for user's room list queries
RoomMemberSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('RoomMember', RoomMemberSchema);
