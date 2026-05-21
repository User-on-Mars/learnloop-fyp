#!/usr/bin/env node
/**
 * Script to remove unverified users from the database
 * These users signed up but never verified their email
 * Run with: node backend/scripts/cleanupUnverifiedUsers.js
 */

import mongoose from 'mongoose'
import User from '../src/models/User.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') })

async function cleanupUnverifiedUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learnloop')
    console.log('✅ Connected to MongoDB')

    // Find all users with emailVerified: false
    const unverifiedUsers = await User.find({
      emailVerified: false,
      firebaseUid: { $ne: null }  // Only Firebase users
    }).select('email createdAt firebaseUid')

    console.log(`\n📊 Found ${unverifiedUsers.length} unverified users`)

    if (unverifiedUsers.length === 0) {
      console.log('✅ No unverified users to clean up')
      await mongoose.connection.close()
      return
    }

    // Display users that will be removed
    console.log('\n📋 Users to be removed:')
    unverifiedUsers.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.email} (created: ${user.createdAt.toISOString()})`)
    })

    // Remove unverified users
    const result = await User.deleteMany({
      emailVerified: false,
      firebaseUid: { $ne: null }
    })

    console.log(`\n✅ Removed ${result.deletedCount} unverified users`)
    console.log('📝 Note: These users can sign up again after verifying their email')

    await mongoose.connection.close()
    console.log('\n✅ Cleanup complete')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

cleanupUnverifiedUsers()
