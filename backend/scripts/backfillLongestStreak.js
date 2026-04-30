/**
 * Backfill longestStreak field for existing UserStreak records.
 * Sets longestStreak to currentStreak for users who don't have it set.
 * 
 * Usage: node scripts/backfillLongestStreak.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserStreak from '../src/models/UserStreak.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learnloop';

async function backfillLongestStreak() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all streaks where longestStreak is not set or is 0
    const streaksToUpdate = await UserStreak.find({
      $or: [
        { longestStreak: { $exists: false } },
        { longestStreak: null },
        { longestStreak: 0, currentStreak: { $gt: 0 } }
      ]
    });

    console.log(`📊 Found ${streaksToUpdate.length} streak records to update`);

    let updated = 0;
    for (const streak of streaksToUpdate) {
      // Set longestStreak to currentStreak if currentStreak is higher
      const newLongestStreak = Math.max(streak.longestStreak || 0, streak.currentStreak || 0);
      
      if (newLongestStreak > 0) {
        await UserStreak.updateOne(
          { _id: streak._id },
          { $set: { longestStreak: newLongestStreak } }
        );
        updated++;
        console.log(`  ✓ Updated user ${streak.userId}: longestStreak = ${newLongestStreak}`);
      }
    }

    console.log(`\n✅ Backfill complete! Updated ${updated} records.`);
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

backfillLongestStreak();
