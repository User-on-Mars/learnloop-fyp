import mongoose from 'mongoose'

const AdminFlagSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    default: null
  },
  flagType: {
    type: String,
    required: true,
    enum: [
      'xp_farming',
      'too_many_sessions',
      'short_sessions',
      'duplicate_reflection',
      'high_daily_xp',
      'never_active'
    ]
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high']
  },
  detail: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['open', 'dismissed', 'actioned'],
    default: 'open'
  },
  triggeredAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: String,
    default: null
  }
}, { timestamps: false })

AdminFlagSchema.index({ status: 1, severity: -1, triggeredAt: -1 })
AdminFlagSchema.index({ userId: 1, status: 1 })

export default mongoose.model('AdminFlag', AdminFlagSchema)
