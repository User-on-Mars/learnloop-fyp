/**
 * Create User records for UserXpProfile entries that are missing User documents
 * This fixes the "Unknown" entries on the leaderboard
 * 
 * Since we don't have Firebase service account access, we'll use email prefixes
 * and allow manual updates later if needed
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

function capitalizeWords(str) {
  return str
    .split(/[\s\-_.]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

async function createMissingUserRecords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    const User = (await import('../src/models/User.js')).default
    const UserXpProfile = (await import('../src/models/UserXpProfile.js')).default
    
    // Get all users in UserXpProfile
    const profiles = await UserXpProfile.find().select('userId weeklyXp').lean()
    
    // Check which ones don't have a User record
    const missing = []
    for (const p of profiles) {
      const user = await User.findOne({ firebaseUid: p.userId }).lean()
      if (!user) {
        missing.push(p.userId)
      }
    }
    
    console.log(`Found ${missing.length} missing User records\n`)
    
    if (missing.length === 0) {
      console.log('No missing users to create')
      await mongoose.disconnect()
      return
    }
    
    const results = {
      created: 0,
      failed: 0,
      details: []
    }
    
    for (const firebaseUid of missing) {
      try {
        // Generate a unique email and name from the Firebase UID
        // This is a temporary solution - users should update their profiles
        const emailPrefix = `user_${firebaseUid.substring(0, 8)}`
        const email = `${emailPrefix}@learnloop.local`
        const name = capitalizeWords(emailPrefix)
        
        // Check if email already exists
        const existingUser = await User.findOne({ email }).lean()
        if (existingUser) {
          console.log(`⚠️  Email already exists: ${email}`)
          continue
        }
        
        // Create User record
        const newUser = new User({
          name,
          email,
          firebaseUid,
          passwordHash: 'firebase_user', // Placeholder for Firebase users
          role: 'user',
          accountStatus: 'active'
        })
        
        await newUser.save()
        
        results.created++
        results.details.push({
          firebaseUid,
          email,
          name,
          status: 'created'
        })
        
        console.log(`✅ Created user: ${email} (${name})`)
      } catch (err) {
        results.failed++
        results.details.push({
          firebaseUid,
          error: err.message,
          status: 'failed'
        })
        console.error(`❌ Failed to create user ${firebaseUid}:`, err.message)
      }
    }
    
    console.log('\n--- Summary ---')
    console.log(`Total processed: ${missing.length}`)
    console.log(`Successfully created: ${results.created}`)
    console.log(`Failed: ${results.failed}`)
    
    if (results.created > 0) {
      console.log('\n⚠️  Note: Users were created with temporary names.')
      console.log('They should update their profiles with their actual names.')
    }
    
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

createMissingUserRecords().catch(err => {
  console.error(err)
  process.exit(1)
})
