import mongoose from 'mongoose';

const NodeSchema = new mongoose.Schema({
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    default: '',
    maxlength: 200,
    trim: true
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000,
    trim: true
  },
  status: {
    type: String,
    enum: ['Locked', 'Unlocked', 'In_Progress', 'Completed'],
    default: 'Locked'
  },
  isStart: {
    type: Boolean,
    default: false
  },
  isGoal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Validation middleware
NodeSchema.pre('save', function(next) {
  // Validate status enum
  const validStatuses = ['Locked', 'Unlocked', 'In_Progress', 'Completed'];
  if (!validStatuses.includes(this.status)) {
    const error = new Error(`Status must be one of: ${validStatuses.join(', ')}`);
    return next(error);
  }
  
  // Validate title length
  if (this.title && this.title.length > 200) {
    const error = new Error('Node title must not exceed 200 characters');
    return next(error);
  }
  
  // Validate description length
  if (this.description && this.description.length > 2000) {
    const error = new Error('Node description must not exceed 2000 characters');
    return next(error);
  }
  
  // Validate order is positive
  if (this.order < 1) {
    const error = new Error('Node order must be at least 1');
    return next(error);
  }
  
  next();
});

// Compound indexes for efficient queries
// Note: Unique index on skillId + order covers the non-unique version
NodeSchema.index({ skillId: 1, order: 1 }, { unique: true });
NodeSchema.index({ userId: 1, status: 1 });
NodeSchema.index({ skillId: 1, userId: 1 });

export default mongoose.model('Node', NodeSchema);
