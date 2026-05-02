import mongoose from 'mongoose';

/**
 * PublishRequest - User requests to publish their skillmap as a template
 */
const PublishRequestSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  skillmapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  adminNote: {
    type: String,
    default: '',
    maxlength: 500,
    trim: true
  },
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: String,
    default: null
  },
  // Snapshot of skillmap data at submission time
  skillmapSnapshot: {
    name: String,
    description: String,
    icon: String,
    color: String,
    goal: String,
    nodeCount: Number,
    completionPercentage: Number
  }
}, { 
  timestamps: true 
});

// Compound indexes for efficient queries
PublishRequestSchema.index({ userId: 1, status: 1 });
PublishRequestSchema.index({ status: 1, submittedAt: 1 });

// Statics
PublishRequestSchema.statics.getPendingRequests = async function() {
  return this.find({ status: 'pending' })
    .sort({ submittedAt: 1 }) // Oldest first
    .lean();
};

PublishRequestSchema.statics.getUserPendingCount = async function(userId) {
  return this.countDocuments({ userId, status: 'pending' });
};

PublishRequestSchema.statics.getUserMonthlySubmissions = async function(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.countDocuments({
    userId,
    submittedAt: { $gte: thirtyDaysAgo }
  });
};

export default mongoose.model('PublishRequest', PublishRequestSchema);
