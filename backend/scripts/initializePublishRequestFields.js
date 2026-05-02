/**
 * Migration script to initialize publish request fields on existing users and skillmaps
 * Run with: node backend/scripts/initializePublishRequestFields.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Skill from '../src/models/Skill.js';

dotenv.config({ path: './backend/.env' });

async function initializePublishRequestFields() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGO_URI environment variable is not set');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Initialize user fields
    console.log('\n📝 Initializing user publish request fields...');
    const userResult = await User.updateMany(
      {
        $or: [
          { publishRequestsThisMonth: { $exists: false } },
          { pendingRequestCount: { $exists: false } },
          { monthlyQuotaReset: { $exists: false } }
        ]
      },
      {
        $set: {
          publishRequestsThisMonth: 0,
          pendingRequestCount: 0,
          monthlyQuotaReset: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      }
    );
    console.log(`✅ Updated ${userResult.modifiedCount} users`);

    // Initialize skillmap fields
    console.log('\n📝 Initializing skillmap publish status fields...');
    const skillResult = await Skill.updateMany(
      {
        $or: [
          { publishStatus: { $exists: false } },
          { publishedAt: { $exists: false } },
          { authorCredit: { $exists: false } }
        ]
      },
      {
        $set: {
          publishStatus: 'draft',
          publishedAt: null,
          authorCredit: ''
        }
      }
    );
    console.log(`✅ Updated ${skillResult.modifiedCount} skillmaps`);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

initializePublishRequestFields();
