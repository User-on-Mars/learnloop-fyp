import mongoose from 'mongoose';

/**
 * XpSettings - Admin-configurable XP reward values
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
