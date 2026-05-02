import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../src/models/User.js';
import PublishRequest from '../src/models/PublishRequest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * Reset publish request quota for a specific user
 * Usage: node backend/scripts/resetPublishRequestQuota.js <email>
 */
async function resetPublishRequestQuota() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.error('❌ Please provide user email as argument');
      console.log('Usage: node backend/scripts/resetPublishRequestQuota.js <email>');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const userId = user.firebaseUid;

    console.log(`\n📊 Current quota status for ${user.name} (${email}):`);
    console.log(`   - Requests this month: ${user.publishRequestsThisMonth || 0}`);
    console.log(`   - Quota reset date: ${user.monthlyQuotaReset || 'Not set'}`);
    console.log(`   - Pending requests: ${user.pendingRequestCount || 0}`);

    // Count actual publish requests in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const actualRequests = await PublishRequest.countDocuments({
      userId,
      submittedAt: { $gte: thirtyDaysAgo }
    });
    console.log(`   - Actual requests in last 30 days: ${actualRequests}`);

    // Option 1: Delete old publish requests (recommended for testing)
    const deleteResult = await PublishRequest.deleteMany({
      userId,
      status: { $in: ['approved', 'rejected'] }
    });
    console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} old publish requests (approved/rejected)`);

    // Option 2: Update submittedAt to be older than 30 days (alternative)
    // const updateResult = await PublishRequest.updateMany(
    //   { userId },
    //   { submittedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) }
    // );
    // console.log(`\n📅 Updated ${updateResult.modifiedCount} publish requests to be older than 30 days`);

    // Reset quota in User model
    user.publishRequestsThisMonth = 0;
    user.monthlyQuotaReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    await user.save();

    console.log(`\n✅ Quota reset successfully!`);
    console.log(`   - New requests this month: 0`);
    console.log(`   - New quota reset date: ${user.monthlyQuotaReset}`);
    console.log(`   - User can now submit ${3 - (user.pendingRequestCount || 0)} more requests`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPublishRequestQuota();
