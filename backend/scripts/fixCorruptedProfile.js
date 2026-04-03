#!/usr/bin/env node
/**
 * Fix corrupted XP profile
 * Run: node scripts/fixCorruptedProfile.js
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import UserXpProfile from '../src/models/UserXpProfile.js';

dotenv.config();

async function fixCorruptedProfile() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const corruptedId = 'u9v3F2HdngbRBtQuXeBkWRAa0723';
    const correctId = 'u9v3F2HdngbRBtQuXeBkWR';

    // Find the corrupted profile
    const corrupted = await UserXpProfile.findOne({ userId: corruptedId }).lean();
    if (!corrupted) {
      console.log('❌ Corrupted profile not found');
      process.exit(1);
    }

    console.log('Found corrupted profile:');
    console.log(`  userId: ${corrupted.userId}`);
    console.log(`  totalXp: ${corrupted.totalXp}`);
    console.log(`  weeklyXp: ${corrupted.weeklyXp}\n`);

    // Delete corrupted profile
    console.log(`🗑️  Deleting corrupted profile...`);
    await UserXpProfile.deleteOne({ userId: corruptedId });
    console.log('✅ Deleted\n');

    // Create new profile with correct userId
    console.log(`📝 Creating new profile with correct userId: ${correctId}`);
    const newProfile = await UserXpProfile.create({
      userId: correctId,
      totalXp: corrupted.totalXp,
      weeklyXp: corrupted.weeklyXp,
      weekStartDate: corrupted.weekStartDate || new Date(),
      leagueTier: corrupted.leagueTier || 'Newcomer'
    });
    console.log('✅ Created new profile:', newProfile._id);

    console.log('\n✅ Fix complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixCorruptedProfile();
