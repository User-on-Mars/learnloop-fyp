/**
 * Fix league tiers for all users based on their total XP
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '..', '.env') })

function calculateLeagueTier(totalXp) {
  if (totalXp >= 1000) return 'Gold'
  if (totalXp >= 500) return 'Silver'
  if (totalXp >= 100) return 'Bronze'
  return 'Newcomer'
}

async function fixLeagueTiers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    const UserXpProfile = (await import('../src/models/UserXpProfile.js')).default
    
    // Get all user profiles
    const profiles = await UserXpProfile.find({})
    
    console.log(`Found ${profiles.length} user profile(s)\n`)
    
    let updated = 0
    let unchanged = 0
    
    for (const profile of profiles) {
      const correctTier = calculateLeagueTier(profile.totalXp)
      
      if (profile.leagueTier !== correctTier) {
        await UserXpProfile.updateOne(
          { _id: profile._id },
          { leagueTier: correctTier }
        )
        console.log(`✅ Updated userId ${profile.userId}: ${profile.leagueTier} → ${correctTier} (${profile.totalXp} XP)`)
        updated++
      } else {
        console.log(`⏭️  userId ${profile.userId}: ${profile.leagueTier} (${profile.totalXp} XP) - already correct`)
        unchanged++
      }
    }
    
    console.log(`\n─────────────────────────────────`)
    console.log(`✅ Updated: ${updated}`)
    console.log(`⏭️  Unchanged: ${unchanged}`)
    
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

fixLeagueTiers()
