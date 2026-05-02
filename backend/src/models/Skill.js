import mongoose from 'mongoose';

const SkillSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 30
  },
  nodeCount: {
    type: Number,
    required: true,
    min: 0,
    max: 15
  },
  description: {
    type: String,
    default: '',
    maxlength: 150,
    trim: true
  },
  icon: {
    type: String,
    default: 'Map',
    trim: true,
    maxlength: 30
  },
  color: {
    type: String,
    default: '#2e5023',
    trim: true,
    maxlength: 20
  },
  goal: {
    type: String,
    default: '',
    maxlength: 30,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'active'],
    default: 'active'
  },
  fromTemplate: {
    type: Boolean,
    default: false
  },
  // Publish status fields
  publishStatus: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected'],
    default: 'draft'
  },
  publishedAt: {
    type: Date,
    default: null
  },
  authorCredit: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  }
}, {
  timestamps: true
});

// Validation middleware
SkillSchema.pre('save', function(next) {
  if (!this.name || this.name.length < 1 || this.name.length > 30) {
    const error = new Error('Skill name must be 1-30 characters');
    return next(error);
  }
  
  if (this.nodeCount < 0 || this.nodeCount > 15) {
    const error = new Error('Node count must be between 0 and 15');
    return next(error);
  }
  
  next();
});

// Compound indexes for efficient queries
SkillSchema.index({ userId: 1, createdAt: -1 });
SkillSchema.index({ userId: 1, name: 1 });

export default mongoose.model('Skill', SkillSchema);
