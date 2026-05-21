import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import UserPreferences from '../models/UserPreferences.js';

const router = Router();

/**
 * GET /api/preferences
 * Get user preferences
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    let preferences = await UserPreferences.findOne({ userId });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await UserPreferences.create({
        userId,
        emailNotifications: true,
        practiceReminders: true,
        weeklyDigest: true,
        streakAlerts: true,
        xpNotifications: true,
        soundEffects: true,
        timerSound: true,
        darkMode: false,
        compactView: false
      });
    }

    res.json({
      preferences: {
        emailNotifications: preferences.emailNotifications,
        practiceReminders: preferences.practiceReminders,
        weeklyDigest: preferences.weeklyDigest,
        streakAlerts: preferences.streakAlerts,
        xpNotifications: preferences.xpNotifications,
        soundEffects: preferences.soundEffects,
        timerSound: preferences.timerSound,
        darkMode: preferences.darkMode,
        compactView: preferences.compactView
      }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Failed to load preferences' });
  }
});

/**
 * PUT /api/preferences
 * Update user preferences
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Validate that only allowed fields are being updated
    const allowedFields = [
      'emailNotifications',
      'practiceReminders',
      'weeklyDigest',
      'streakAlerts',
      'xpNotifications',
      'soundEffects',
      'timerSound',
      'darkMode',
      'compactView'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (field in updates) {
        updateData[field] = Boolean(updates[field]);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid preferences to update' });
    }

    // Update or create preferences
    const preferences = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json({
      message: 'Preferences updated successfully',
      preferences: {
        emailNotifications: preferences.emailNotifications,
        practiceReminders: preferences.practiceReminders,
        weeklyDigest: preferences.weeklyDigest,
        streakAlerts: preferences.streakAlerts,
        xpNotifications: preferences.xpNotifications,
        soundEffects: preferences.soundEffects,
        timerSound: preferences.timerSound,
        darkMode: preferences.darkMode,
        compactView: preferences.compactView
      }
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
});

/**
 * PATCH /api/preferences
 * Update a single preference
 */
router.patch('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { key, value } = req.body;

    // Validate key
    const allowedFields = [
      'emailNotifications',
      'practiceReminders',
      'weeklyDigest',
      'streakAlerts',
      'xpNotifications',
      'soundEffects',
      'timerSound',
      'darkMode',
      'compactView'
    ];

    if (!allowedFields.includes(key)) {
      return res.status(400).json({ message: 'Invalid preference key' });
    }

    // Update single preference
    const preferences = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: { [key]: Boolean(value) } },
      { new: true, upsert: true }
    );

    res.json({
      message: 'Preference updated successfully',
      preferences: {
        emailNotifications: preferences.emailNotifications,
        practiceReminders: preferences.practiceReminders,
        weeklyDigest: preferences.weeklyDigest,
        streakAlerts: preferences.streakAlerts,
        xpNotifications: preferences.xpNotifications,
        soundEffects: preferences.soundEffects,
        timerSound: preferences.timerSound,
        darkMode: preferences.darkMode,
        compactView: preferences.compactView
      }
    });
  } catch (error) {
    console.error('Update preference error:', error);
    res.status(500).json({ message: 'Failed to update preference' });
  }
});

export default router;
