/**
 * Check for UserXpProfile entries without corresponding User records
 * These are the ones showing as "Unknown" on the leaderboard
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

async function checkMissingUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB\n')
    
    const User = (await import('../src/models/User.js')).default
    const UserXpProfile = (await import('../src/models/UserXpProfile.js')).default
    
    // Get all users in UserXpProfile
    const profiles = await UserXpProfile.find().select('userId weeklyXp').lean()
    console.log(`Total XP profiles: ${profiles.length}\n`)
    
    // Check which ones don't have a User record
    const missing = []
    for (const p of profiles) {
      const user = await User.findOne({ firebaseUid: p.userId }).lean()
      if (!user) {
        missing.push({ userId: p.userId, weeklyXp: p.weeklyXp })
      }
    }
    
    console.log(`Missing User records: ${missing.length}`)
    if (missing.length > 0) {
      console.log('\nMissing users (showing as "Unknown" on leaderboard):')
      missing.forEach((m, i) => {
        console.log(`  ${i + 1}. Firebase UID: ${m.userId}, Weekly XP: ${m.weeklyXp}`)
      })
    }
    
    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
    
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

checkMissingUsers().catch(err => {
  console.error(err)
  process.exit(1)
})
