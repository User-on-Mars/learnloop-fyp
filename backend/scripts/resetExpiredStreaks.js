import dotenv from 'dotenv';
import mongoose from 'mongoose';
import StreakService from '../src/services/StreakService.js';

dotenv.config();

/**
 * Script to manually reset all expired streaks
 * Run with: node backend/scripts/resetExpiredStreaks.js
 */
async function resetExpiredStreaks() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    console.log('\n🔍 Checking for expired streaks...');
    const result = await StreakService.resetExpiredStreaks();

    console.log(`\n✅ Reset completed!`);
    console.log(`   - Streaks reset: ${result.resetCount}`);

    if (result.resetCount === 0) {
      console.log('\n💡 No expired streaks found. All streaks are up to date!');
    } else {
      console.log(`\n💡 ${result.resetCount} user(s) had their streaks reset due to inactivity.`);
    }

  } catch (error) {
    console.error('\n❌ Error resetting expired streaks:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from database');
    process.exit(0);
  }
}

resetExpiredStreaks();
