import mongoose from 'mongoose'

const ActiveSessionSchema = new mongoose.Schema({
  userId: { 
    type: String,
    required: true,
    index: true 
  },
  skillName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  tags: [{ 
    type: String,
    trim: true,
    maxlength: 50
  }],
  notes: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  timer: {
    type: Number,
    required: true,
    default: 0
  },
  targetTime: {
    type: Number,
    required: true,
    default: 0
  },
  isCountdown: {
    type: Boolean,
    default: true
  },
  isRunning: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
})

// Index for efficient queries by user
ActiveSessionSchema.index({ userId: 1 })

export default mongoose.model('ActiveSession', ActiveSessionSchema)
