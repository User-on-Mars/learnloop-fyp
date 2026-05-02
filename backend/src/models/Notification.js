import mongoose from 'mongoose';

/**
 * Notification - In-app notifications for users
 */
const NotificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'room_invitation_received',
      'room_invitation_accepted',
      'room_invitation_declined',
      'room_member_kicked',
      'room_deleted',
      'publish_request_approved',
      'publish_request_rejected',
      'published_template_removed',
      'new_publish_request',
      'subscription_upgraded',
      'subscription_canceled',
      'weekly_reward_won',
      'payment_receipt'
    ],
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { 
  timestamps: true 
});

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });

// Statics
NotificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false });
};

NotificationSchema.statics.getUserNotifications = async function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

NotificationSchema.statics.markAsRead = async function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
};

NotificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, read: false },
    { read: true }
  );
};

NotificationSchema.statics.deleteNotification = async function(notificationId, userId) {
  return this.findOneAndDelete({ _id: notificationId, userId });
};

export default mongoose.model('Notification', NotificationSchema);
