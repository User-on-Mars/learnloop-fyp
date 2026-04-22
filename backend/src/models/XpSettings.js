import mongoose from 'mongoose';

/**
 * XpSettings - Admin-configurable XP reward values and league thresholds
 * Single document collection (singleton pattern)
 */
const XpSettingsSchema = new mongoose.Schema({
  reflectionXp: { 
    type: Number, 
    required: true, 
    default: 20,
    min: 0,
    max: 1000
  },
  practiceXpPerMinute: { 
    type: Number, 
    required: true, 
    default: 2,
    min: 0,
    max: 100
  },
  streak5DayMultiplier: {
    type: Number,
    required: true,
    default: 2,
    min: 1,
    max: 10
  },
  streak7DayMultiplier: {
    type: Number,
    required: true,
    default: 5,
    min: 1,
    max: 10
  },
  // League tier thresholds (weekly XP required)
  bronzeThreshold: {
    type: Number,
    required: true,
    default: 50,
    min: 0,
    max: 10000
  },
  silverThreshold: {
    type: Number,
    required: true,
    default: 100,
    min: 0,
    max: 10000
  },
  goldThreshold: {
    type: Number,
    required: true,
    default: 200,
    min: 0,
    max: 10000
  },
  // Leaderboard settings
  leaderboardSize: {
    type: Number,
    required: true,
    default: 10,
    min: 1,
    max: 100
  },
  // Auto-flag thresholds
  maxSessionsPerDay: {
    type: Number,
    required: true,
    default: 20,
    min: 1,
    max: 1000
  },
  minSessionDuration: {
    type: Number,
    required: true,
    default: 60,
    min: 1,
    max: 3600
  },
  maxDailyXp: {
    type: Number,
    required: true,
    default: 500,
    min: 1,
    max: 100000
  },
  // Contact email shown on the public contact page
  contactEmail: {
    type: String,
    default: 'weweebo@gmail.com',
    trim: true
  }
}, { timestamps: true });

// Ensure only one settings document exists
XpSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

XpSettingsSchema.statics.updateSettings = async function(updates) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    await settings.save();
  }
  return settings;
};

export default mongoose.model('XpSettings', XpSettingsSchema);
