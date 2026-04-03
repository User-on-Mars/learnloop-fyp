import mongoose from 'mongoose'
import User from '../src/models/User.js'
import dotenv from 'dotenv'

dotenv.config()

async function backfillLastLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Find all users with null lastLoginAt
    const usersToUpdate = await User.find({ lastLoginAt: null })
    console.log(`📊 Found ${usersToUpdate.length} users with null lastLoginAt`)

    if (usersToUpdate.length === 0) {
      console.log('✅ No users to update')
      await mongoose.disconnect()
      return
    }

    // Update each user's lastLoginAt to their createdAt
    const result = await User.updateMany(
      { lastLoginAt: null },
      [{ $set: { lastLoginAt: '$createdAt' } }]
    )

    console.log(`✅ Updated ${result.modifiedCount} users`)
    console.log(`⏭️  Matched ${result.matchedCount} users`)

    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

backfillLastLogin()
