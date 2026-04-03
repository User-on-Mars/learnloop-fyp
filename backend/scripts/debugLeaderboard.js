#!/usr/bin/env node
/**
 * Debug script to check leaderboard data in MongoDB
 * Run: node scripts/debugLeaderboard.js
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import UserXpProfile from '../src/models/UserXpProfile.js';

dotenv.config();

async function debugLeaderboard() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Check all users
    console.log('📋 All Users in Database:');
    const users = await User.find().select('email name firebaseUid').lean();
    console.log(`Found ${users.length} users:\n`);
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.name || '(empty)'}`);
      console.log(`   FirebaseUid: ${user.firebaseUid || '(not set)'}`);
      console.log('');
    });

    // Check XP profiles
    console.log('\n📊 XP Profiles with Weekly XP > 0:');
    const profiles = await UserXpProfile.find({ weeklyXp: { $gt: 0 } }).select('userId weeklyXp').lean();
    console.log(`Found ${profiles.length} profiles:\n`);
    
    for (const profile of profiles) {
      console.log(`UserId: ${profile.userId}`);
      console.log(`Weekly XP: ${profile.weeklyXp}`);
      
      // Try to find user by firebaseUid
      const user = await User.findOne({ firebaseUid: profile.userId }).select('email name').lean();
      if (user) {
        console.log(`✅ Found User: ${user.email} (name: ${user.name || '(empty)'})`);
      } else {
        console.log(`❌ User NOT found by firebaseUid`);
        // Try to find by email
        const userByEmail = await User.findOne({ email: profile.userId }).select('email name').lean();
        if (userByEmail) {
          console.log(`   But found by email: ${userByEmail.email}`);
        }
      }
      console.log('');
    }

    console.log('\n✅ Debug complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugLeaderboard();
