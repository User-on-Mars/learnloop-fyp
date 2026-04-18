import mongoose from 'mongoose';

const RoomInvitationSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  invitedBy: {
    type: String,
    required: true
  },
  invitedEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  invitedUserId: {
    type: String,
    default: null,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
RoomInvitationSchema.index({ roomId: 1, invitedEmail: 1, status: 1 });
RoomInvitationSchema.index({ invitedUserId: 1, status: 1 });
RoomInvitationSchema.index({ status: 1, expiresAt: 1 }); // For expiry job

export default mongoose.model('RoomInvitation', RoomInvitationSchema);
