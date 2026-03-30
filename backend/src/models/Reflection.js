import mongoose from 'mongoose'

const ReflectionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    maxlength: 200,
    trim: true,
    default: ''
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  mood: {
    type: String,
    enum: ['Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful', null],
    default: null
  },
  tags: [{
    type: String,
    maxlength: 50
  }]
}, {
  timestamps: true
})

// Index for efficient querying by user and date
ReflectionSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model('Reflection', ReflectionSchema)
