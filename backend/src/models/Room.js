import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  description: {
    type: String,
    default: '',
    maxlength: 200,
    trim: true
  },
  color: {
    type: String,
    default: '#0d9488',
    trim: true
  },
  icon: {
    type: String,
    default: 'Users',
    trim: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
RoomSchema.index({ ownerId: 1, deletedAt: 1 });
RoomSchema.index({ createdAt: -1 });

// Virtual for member count (populated separately)
RoomSchema.virtual('memberCount', {
  ref: 'RoomMember',
  localField: '_id',
  foreignField: 'roomId',
  count: true
});

export default mongoose.model('Room', RoomSchema);
