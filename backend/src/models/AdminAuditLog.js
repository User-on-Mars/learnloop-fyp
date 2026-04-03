import mongoose from 'mongoose'

const AdminAuditLogSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    index: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'ban_user',
      'unban_user',
      'promote_to_admin',
      'demote_from_admin',
      'adjust_xp',
      'void_xp',
      'manual_weekly_reset',
      'recalculate_xp',
      'delete_skill_map',
      'dismiss_flag',
      'update_xp_settings',
      'update_flag_settings',
      'export_data'
    ]
  },
  targetUserId: {
    type: String,
    default: null
  },
  targetUserEmail: {
    type: String,
    default: null
  },
  reason: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: false })

AdminAuditLogSchema.index({ adminId: 1, createdAt: -1 })
AdminAuditLogSchema.index({ action: 1, createdAt: -1 })
AdminAuditLogSchema.index({ targetUserId: 1, createdAt: -1 })

AdminAuditLogSchema.statics.record = async function(adminId, adminEmail, action, targetUserId, targetUserEmail, reason, metadata) {
  try {
    const entry = await this.create({
      adminId,
      adminEmail,
      action,
      targetUserId,
      targetUserEmail,
      reason,
      metadata
    })
    return entry
  } catch (error) {
    console.error('Failed to record audit log:', error)
    return null
  }
}

export default mongoose.model('AdminAuditLog', AdminAuditLogSchema)
