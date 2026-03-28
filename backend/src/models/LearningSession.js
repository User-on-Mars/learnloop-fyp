import mongoose from 'mongoose';

const ProgressCheckpointSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const SessionReflectionSchema = new mongoose.Schema({
  understanding: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  difficulty: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  completionConfidence: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  wouldRecommend: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }]
}, { _id: false });

const LearningSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Node',
    required: true
  },
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true
  },
  // Session lifecycle fields
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'abandoned'],
    default: 'active'
  },
  startTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    default: 0,
    min: 0
  },
  // Progress tracking
  progressCheckpoints: [ProgressCheckpointSchema],
  currentProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Reflection data
  reflection: SessionReflectionSchema
}, {
  timestamps: true
});

// Validation for session lifecycle
LearningSessionSchema.pre('save', function(next) {
  // Validate reflection data for completed sessions
  if (this.status === 'completed' && !this.reflection) {
    const error = new Error('Completed sessions must have reflection data');
    return next(error);
  }
  
  // Validate reflection scores if reflection exists
  if (this.reflection) {
    const { understanding, difficulty, completionConfidence } = this.reflection;
    
    if (understanding < 1 || understanding > 5) {
      const error = new Error('Understanding score must be between 1 and 5');
      return next(error);
    }
    
    if (difficulty < 1 || difficulty > 5) {
      const error = new Error('Difficulty score must be between 1 and 5');
      return next(error);
    }
    
    if (completionConfidence < 1 || completionConfidence > 5) {
      const error = new Error('Completion confidence score must be between 1 and 5');
      return next(error);
    }
  }
  
  // Auto-abandon sessions exceeding 4 hours (14400 seconds)
  if (this.status === 'active' && this.duration > 14400) {
    this.status = 'abandoned';
  }
  
  // Set endTime for completed or abandoned sessions
  if ((this.status === 'completed' || this.status === 'abandoned') && !this.endTime) {
    this.endTime = new Date();
  }
  
  next();
});

// Compound indexes for efficient queries
LearningSessionSchema.index({ userId: 1, nodeId: 1 });
LearningSessionSchema.index({ userId: 1, status: 1 });
LearningSessionSchema.index({ skillId: 1, userId: 1 });
LearningSessionSchema.index({ startTime: 1 }); // For session timeout queries

export default mongoose.model('LearningSession', LearningSessionSchema);