import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StreakService from '../src/services/StreakService.js';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

// Run the expired streak reset
console.log('Running expired streak reset...');
const result = await StreakService.resetExpiredStreaks();
console.log(`Reset ${result.resetCount} expired streaks.`);

// Verify
const db = mongoose.connection.db;
const streaks = await db.collection('userstreaks').find({}).toArray();
const now = new Date();

console.log(`\n=== Streak Data After Reset ===\n`);
for (const s of streaks) {
  const user = await db.collection('users').findOne({ firebaseUid: s.userId });
  const name = user?.name || s.userId?.slice(-8);
  const lastDate = s.lastPracticeDate ? new Date(s.lastPracticeDate) : null;
  const daysSince = lastDate ? Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)) : 'N/A';
  console.log(`${name.padEnd(20)} | streak: ${String(s.currentStreak).padStart(2)} | last: ${lastDate ? lastDate.toISOString().split('T')[0] : 'never'} | ${daysSince}d ago`);
}

await mongoose.disconnect();
console.log('\nDone.');
