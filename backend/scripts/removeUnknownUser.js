import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../.env') })

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/learnloop'

async function removeUnknownUser() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB')

    // Import models
    const UserXpProfile = (await import('../src/models/UserXpProfile.js')).default
    const User = (await import('../src/models/User.js')).default

    // Find all XP profiles
    const profiles = await UserXpProfile.find().lean()
    console.log(`Found ${profiles.length} XP profiles`)

    // Find profiles without matching users or with null/empty names
    const userIds = profiles.map(p => p.userId)
    const users = await User.find({ firebaseUid: { $in: userIds } }).select('firebaseUid name email').lean()
    const userMap = new Map(users.map(u => [u.firebaseUid, u]))

    console.log('\nChecking for orphaned profiles...')
    const orphanedProfiles = []
    
    for (const profile of profiles) {
      const user = userMap.get(profile.userId)
      if (!user) {
        console.log(`  ❌ No user found for profile: ${profile.userId} (XP: ${profile.totalXp})`)
        orphanedProfiles.push(profile)
      } else if (!user.name || user.name === 'Unknown') {
        console.log(`  ❌ User has no name: ${profile.userId} (XP: ${profile.totalXp})`)
        orphanedProfiles.push(profile)
      }
    }

    console.log(`\nFound ${orphanedProfiles.length} orphaned/unknown profiles`)

    if (orphanedProfiles.length > 0) {
      const orphanedIds = orphanedProfiles.map(p => p._id)
      const result = await UserXpProfile.deleteMany({ _id: { $in: orphanedIds } })
      console.log(`✅ Deleted ${result.deletedCount} orphaned XP profiles`)
    } else {
      console.log('✅ No orphaned profiles found')
    }

    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

removeUnknownUser()
