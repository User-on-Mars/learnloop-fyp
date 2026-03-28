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
    maxlength: 100
  },
  nodeCount: {
    type: Number,
    required: true,
    min: 2,
    max: 16
  },
  description: {
    type: String,
    default: '',
    maxlength: 120,
    trim: true
  },
  icon: {
    type: String,
    default: '🗺️',
    trim: true,
    maxlength: 16
  },
  goal: {
    type: String,
    default: '',
    maxlength: 2000,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'active'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Validation middleware
SkillSchema.pre('save', function(next) {
  if (!this.name || this.name.length < 1 || this.name.length > 100) {
    const error = new Error('Skill name must be 1-100 characters');
    return next(error);
  }
  
  if (!this.nodeCount || this.nodeCount < 2 || this.nodeCount > 16) {
    const error = new Error('Node count must be between 2 and 16');
    return next(error);
  }
  
  next();
});

// Compound indexes for efficient queries
SkillSchema.index({ userId: 1, createdAt: -1 });
SkillSchema.index({ userId: 1, name: 1 });

export default mongoose.model('Skill', SkillSchema);
