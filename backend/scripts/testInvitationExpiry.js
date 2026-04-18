#!/usr/bin/env node

/**
 * Manual test script for invitation expiry functionality
 * This script creates test invitations and runs the expiry job to verify it works correctly
 */

import { connectDB } from '../src/config/db.js';
import RoomInvitation from '../src/models/RoomInvitation.js';
import InvitationService from '../src/services/InvitationService.js';
import mongoose from 'mongoose';

async function testInvitationExpiry() {
  try {
    console.log('🔗 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database');

    // Clean up any existing test invitations
    await RoomInvitation.deleteMany({ invitedEmail: { $regex: /test.*@example\.com/ } });
    console.log('🧹 Cleaned up existing test data');

    // Create test invitations - some expired, some not
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const testInvitations = [
      {
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'test-user-1',
        invitedEmail: 'test1@example.com',
        invitedUserId: 'test-user-invited-1',
        status: 'pending',
        expiresAt: oneHourAgo, // Expired
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'test-user-2',
        invitedEmail: 'test2@example.com',
        invitedUserId: 'test-user-invited-2',
        status: 'pending',
        expiresAt: oneHourAgo, // Expired
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'test-user-3',
        invitedEmail: 'test3@example.com',
        invitedUserId: 'test-user-invited-3',
        status: 'pending',
        expiresAt: oneDayFromNow, // Not expired
        createdAt: now
      }
    ];

    console.log('📝 Creating test invitations...');
    await RoomInvitation.insertMany(testInvitations);
    console.log(`✅ Created ${testInvitations.length} test invitations`);

    // Check initial state
    const pendingBefore = await RoomInvitation.countDocuments({ 
      invitedEmail: { $regex: /test.*@example\.com/ },
      status: 'pending' 
    });
    console.log(`📊 Pending invitations before expiry: ${pendingBefore}`);

    // Run the expiry job
    console.log('⏰ Running invitation expiry job...');
    const result = await InvitationService.expireInvitations();
    console.log(`✅ Expiry job completed: ${result.expiredCount} invitations expired`);

    // Check final state
    const pendingAfter = await RoomInvitation.countDocuments({ 
      invitedEmail: { $regex: /test.*@example\.com/ },
      status: 'pending' 
    });
    const expiredAfter = await RoomInvitation.countDocuments({ 
      invitedEmail: { $regex: /test.*@example\.com/ },
      status: 'expired' 
    });

    console.log(`📊 Pending invitations after expiry: ${pendingAfter}`);
    console.log(`📊 Expired invitations after expiry: ${expiredAfter}`);

    // Verify results
    if (result.expiredCount === 2 && pendingAfter === 1 && expiredAfter === 2) {
      console.log('🎉 Test PASSED: Invitation expiry job works correctly!');
    } else {
      console.log('❌ Test FAILED: Unexpected results');
      console.log(`Expected: 2 expired, 1 pending, 2 total expired`);
      console.log(`Actual: ${result.expiredCount} expired, ${pendingAfter} pending, ${expiredAfter} total expired`);
    }

    // Clean up test data
    await RoomInvitation.deleteMany({ invitedEmail: { $regex: /test.*@example\.com/ } });
    console.log('🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the test
testInvitationExpiry();