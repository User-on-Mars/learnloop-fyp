/**
 * Fix quota counters for users who were downgraded from PRO to Free
 * and have counters exceeding their current tier limit
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../src/models/User.js';
import Subscription from '../src/models/Subscription.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function fixDowngradedUserQuotas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all free tier users
    const freeSubscriptions = await Subscription.find({ tier: 'free' }).lean();
    console.log(`📊 Found ${freeSubscriptions.length} free tier users`);

    let fixedCount = 0;

    for (const sub of freeSubscriptions) {
      const user = await User.findOne({ firebaseUid: sub.userId });

      if (!user) continue;

      // If user has more than 1 submission (free tier limit)
      if (user.publishRequestsThisMonth > 1) {
        console.log(`\n🔧 Fixing user ${user.name || user.firebaseUid}:`);
        console.log(`   Old counter: ${user.publishRequestsThisMonth}/1`);

        // Reset their quota
        const now = new Date();
        const quotaReset = new Date(now);
        quotaReset.setDate(quotaReset.getDate() + 30);

        user.publishRequestsThisMonth = 0;
        user.monthlyQuotaReset = quotaReset;
        await user.save();

        console.log(`   ✅ Reset to: 0/1 (can submit again)`);
        console.log(`   Reset date: ${quotaReset.toISOString()}`);
        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} users`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDowngradedUserQuotas();
