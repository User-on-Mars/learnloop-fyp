#!/usr/bin/env node
/**
 * Fix all corrupted XP profiles
 * Run: node scripts/fixAllCorruptedProfiles.js
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import UserXpProfile from '../src/models/UserXpProfile.js';
import User from '../src/models/User.js';

dotenv.config();

async function fixAllCorruptedProfiles() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // List of corrupted profiles to fix
    const corruptedProfiles = [
      {
        corruptedId: 'pdPKFpuQNRUW8XfhOOHaT5hgivG3',
        correctId: 'pdPKFpuQNRUW8XfhOOHaT',
        userName: 'Meta'
      },
      {
        corruptedId: 'zOebjyddcjh7r3SVVDPKop88HCq1',
        correctId: 'zOebjyddcjh7r3SVVDPKop88',
        userName: 'Senπ'
      }
    ];

    let fixed = 0;
    let notFound = 0;

    for (const profile of corruptedProfiles) {
      console.log(`\n🔧 Processing: ${profile.userName}`);
      console.log(`   Corrupted ID: ${profile.corruptedId}`);
      console.log(`   Correct ID: ${profile.correctId}`);

      // Find the corrupted profile
      const corrupted = await UserXpProfile.findOne({ userId: profile.corruptedId }).lean();
      if (!corrupted) {
        console.log(`   ❌ Corrupted profile not found`);
        notFound++;
        continue;
      }

      console.log(`   Found corrupted profile:`);
      console.log(`     totalXp: ${corrupted.totalXp}`);
      console.log(`     weeklyXp: ${corrupted.weeklyXp}`);

      // Check if correct profile already exists
      const correct = await UserXpProfile.findOne({ userId: profile.correctId }).lean();
      if (correct) {
        console.log(`   ⚠️ Correct profile already exists, merging data...`);
        // Merge: add corrupted XP to correct profile
        await UserXpProfile.updateOne(
          { userId: profile.correctId },
          {
            $inc: {
              totalXp: corrupted.totalXp,
              weeklyXp: corrupted.weeklyXp
            }
          }
        );
        console.log(`   ✅ Merged XP into correct profile`);
      } else {
        console.log(`   📝 Correct profile doesn't exist, updating userId...`);
        // Update the corrupted profile to use correct ID
        await UserXpProfile.updateOne(
          { userId: profile.corruptedId },
          { userId: profile.correctId }
        );
        console.log(`   ✅ Updated userId`);
      }

      // Delete the corrupted profile
      await UserXpProfile.deleteOne({ userId: profile.corruptedId });
      console.log(`   🗑️ Deleted corrupted profile`);

      fixed++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Not Found: ${notFound}`);

    console.log('\n✅ Fix complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAllCorruptedProfiles();
