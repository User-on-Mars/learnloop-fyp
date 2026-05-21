import mongoose from 'mongoose';

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Notification preferences
  emailNotifications: {
    type: Boolean,
    default: true
  },
  practiceReminders: {
    type: Boolean,
    default: true
  },
  weeklyDigest: {
    type: Boolean,
    default: true
  },
  streakAlerts: {
    type: Boolean,
    default: true
  },
  xpNotifications: {
    type: Boolean,
    default: true
  },
  // UI preferences
  soundEffects: {
    type: Boolean,
    default: true
  },
  timerSound: {
    type: Boolean,
    default: true
  },
  darkMode: {
    type: Boolean,
    default: false
  },
  compactView: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);

export default UserPreferences;
