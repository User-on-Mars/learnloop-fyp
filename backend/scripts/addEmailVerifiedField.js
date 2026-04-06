/**
 * Migration script to add emailVerified field to existing users
 * Run with: node backend/scripts/addEmailVerifiedField.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from backend/.env
dotenv.config({ path: join(__dirname, '../.env') })

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/learnloop'

async function migrate() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB')

    const db = mongoose.connection.db
    const usersCollection = db.collection('users')

    // Count users without emailVerified field
    const usersWithoutField = await usersCollection.countDocuments({
      emailVerified: { $exists: false }
    })

    console.log(`📊 Found ${usersWithoutField} users without emailVerified field`)

    if (usersWithoutField === 0) {
      console.log('✅ All users already have emailVerified field')
      await mongoose.connection.close()
      return
    }

    // Update all users without emailVerified field
    // Set to true for existing users (assume they're already verified)
    // Set to true for Firebase users (they verify through Firebase)
    const result = await usersCollection.updateMany(
      { emailVerified: { $exists: false } },
      { 
        $set: { 
          emailVerified: true  // Existing users are grandfathered in as verified
        } 
      }
    )

    console.log(`✅ Updated ${result.modifiedCount} users with emailVerified: true`)
    console.log('📝 Note: Existing users are set as verified. New signups will require verification.')

    await mongoose.connection.close()
    console.log('✅ Migration complete')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()
