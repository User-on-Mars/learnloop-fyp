import mongoose from 'mongoose'

const PracticeSchema = new mongoose.Schema({
  userId: { 
    type: String, // Changed to String to support Firebase UIDs
    required: true
  },
  skillName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  minutesPracticed: { 
    type: Number, 
    required: true,
    min: 1,
    max: 1440 // max 24 hours
  },
  tags: [{ 
    type: String,
    trim: true,
    maxlength: 50
  }],
  timerSeconds: { 
    type: Number, 
    default: 0,
    min: 0
  },
  date: { 
    type: Date, 
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  confidence: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  blockers: {
    type: String,
    maxlength: 500,
    trim: true,
    default: ''
  },
  nextStep: {
    type: String,
    maxlength: 500,
    trim: true,
    default: ''
  }
}, { 
  timestamps: true 
})

// Index for efficient queries by user and date
PracticeSchema.index({ userId: 1, date: -1 })
PracticeSchema.index({ userId: 1, skillName: 1 })

export default mongoose.model('Practice', PracticeSchema)