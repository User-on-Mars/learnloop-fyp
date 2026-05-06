/**
 * Remove duplicate WeeklyReward entries.
 * Keeps the first entry per (userId, weekEndDate) and removes the rest.
 * 
 * Usage: node scripts/deduplicateWeeklyRewards.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import WeeklyReward from '../src/models/WeeklyReward.js';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Find duplicates: group by userId + weekEndDate, keep only the first _id
  const duplicates = await WeeklyReward.aggregate([
    {
      $group: {
        _id: { userId: '$userId', weekEndDate: '$weekEndDate' },
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${duplicates.length} duplicate group(s):`);

  let totalRemoved = 0;
  for (const dup of duplicates) {
    // Keep the first entry, remove the rest
    const [keep, ...remove] = dup.ids;
    console.log(`  User ${dup._id.userId} week ${dup._id.weekEndDate}: keeping ${keep}, removing ${remove.length} duplicate(s)`);
    await WeeklyReward.deleteMany({ _id: { $in: remove } });
    totalRemoved += remove.length;
  }

  console.log(`\n✅ Removed ${totalRemoved} duplicate record(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
