#!/usr/bin/env node
/**
 * Fix script to correct mismatched firebaseUid in XP profiles
 * Run: node scripts/fixLeaderboardData.js
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import UserXpProfile from '../src/models/UserXpProfile.js';
import UserStreak from '../src/models/UserStreak.js';
import Practice from '../src/models/Practice.js';

dotenv.config();

async function fixLeaderboardData() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Find all XP profiles
    const profiles = await UserXpProfile.find().select('userId').lean();
    console.log(`Found ${profiles.length} XP profiles\n`);

    let fixed = 0;
    let notFound = 0;

    for (const profile of profiles) {
      const userId = profile.userId;
      
      // Try to find user by firebaseUid
      let user = await User.findOne({ firebaseUid: userId }).lean();
      
      if (!user) {
        // Try to find by partial match (in case of truncation)
        const partialMatch = await User.findOne({ 
          firebaseUid: { $regex: `^${userId}` } 
        }).lean();
        
        if (partialMatch) {
          console.log(`⚠️ Found partial match for ${userId}`);
          console.log(`   User: ${partialMatch.email} (firebaseUid: ${partialMatch.firebaseUid})`);
          console.log(`   Updating XP profile to use correct firebaseUid...`);
          
          // Update the XP profile with correct firebaseUid
          await UserXpProfile.updateOne(
            { userId },
            { userId: partialMatch.firebaseUid }
          );
          
          // Also update streak if exists
          await UserStreak.updateOne(
            { userId },
            { userId: partialMatch.firebaseUid }
          );
          
          // Also update practices if exists
          await Practice.updateMany(
            { userId },
            { userId: partialMatch.firebaseUid }
          );
          
          console.log(`✅ Fixed!\n`);
          fixed++;
        } else {
          console.log(`❌ No user found for userId: ${userId}`);
          notFound++;
        }
      } else {
        console.log(`✅ User found for ${userId}: ${user.email}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Not Found: ${notFound}`);
    console.log(`   Total: ${profiles.length}`);

    console.log('\n✅ Fix complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixLeaderboardData();
