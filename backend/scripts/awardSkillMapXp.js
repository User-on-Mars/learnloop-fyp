/**
 * Manually award skill map completion XP for completed template skill maps
 * This fixes the issue where XP wasn't awarded for skill map completions
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

async function awardSkillMapXp() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    const Skill = (await import('../src/models/Skill.js')).default
    const Node = (await import('../src/models/Node.js')).default
    const XpService = (await import('../src/services/XpService.js')).default
    const User = (await import('../src/models/User.js')).default
    
    // Find all template skill maps that are 100% complete
    const skillMaps = await Skill.find({ fromTemplate: true })
    
    console.log(`Found ${skillMaps.length} template skill map(s)\n`)
    
    let awarded = 0
    let skipped = 0
    
    for (const skillMap of skillMaps) {
      // Get all nodes for this skill map
      const nodes = await Node.find({ skillId: skillMap._id })
      const completedNodes = nodes.filter(n => n.status === 'Completed').length
      const totalNodes = nodes.length
      
      if (totalNodes === 0) {
        console.log(`⏭️  Skipping "${skillMap.name}" - no nodes`)
        skipped++
        continue
      }
      
      const isComplete = completedNodes === totalNodes
      
      if (!isComplete) {
        console.log(`⏭️  Skipping "${skillMap.name}" - ${completedNodes}/${totalNodes} nodes complete`)
        skipped++
        continue
      }
      
      // Check if XP was already awarded
      const XpTransaction = (await import('../src/models/XpTransaction.js')).default
      const existing = await XpTransaction.findOne({
        userId: skillMap.userId,
        source: 'skillmap_completion',
        referenceId: skillMap._id.toString()
      })
      
      if (existing) {
        console.log(`✅ "${skillMap.name}" - XP already awarded (${existing.finalAmount} XP)`)
        skipped++
        continue
      }
      
      // Award XP
      try {
        const result = await XpService.awardXp(
          skillMap.userId,
          'skillmap_completion',
          50,
          { skillMapId: skillMap._id.toString() }
        )
        
        if (result) {
          console.log(`✅ "${skillMap.name}" - Awarded 50 XP`)
          awarded++
        } else {
          console.log(`⚠️  "${skillMap.name}" - XP award returned null (may have already been awarded)`)
          skipped++
        }
      } catch (err) {
        console.error(`❌ "${skillMap.name}" - Error awarding XP:`, err.message)
        skipped++
      }
    }
    
    console.log(`\n─────────────────────────────────`)
    console.log(`✅ Awarded: ${awarded}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

awardSkillMapXp()
