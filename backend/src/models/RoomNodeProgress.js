import mongoose from 'mongoose';

/**
 * RoomNodeProgress - Tracks user progress on nodes within room skill maps.
 * This is completely separate from personal skill map progress.
 * 
 * Requirements: 18.1-18.4 - Room Skill Map Progress Isolation
 */
const RoomNodeProgressSchema = new mongoose.Schema({
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
  skillMapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true,
    index: true
  },
  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Node',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Locked', 'Unlocked', 'In_Progress', 'Completed'],
    default: 'Locked',
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate progress records
RoomNodeProgressSchema.index({ 
  roomId: 1, 
  userId: 1, 
  skillMapId: 1, 
  nodeId: 1 
}, { unique: true });

// Indexes for efficient queries
RoomNodeProgressSchema.index({ roomId: 1, userId: 1, skillMapId: 1 });
RoomNodeProgressSchema.index({ roomId: 1, skillMapId: 1 });
RoomNodeProgressSchema.index({ userId: 1, roomId: 1 });

// Validation middleware
RoomNodeProgressSchema.pre('save', function(next) {
  // Set completedAt timestamp when status changes to Completed
  if (this.status === 'Completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Clear completedAt if status is not Completed
  if (this.status !== 'Completed' && this.completedAt) {
    this.completedAt = null;
  }
  
  next();
});

export default mongoose.model('RoomNodeProgress', RoomNodeProgressSchema);