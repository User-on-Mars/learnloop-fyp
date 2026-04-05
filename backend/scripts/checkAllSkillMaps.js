import mongoose from 'mongoose'
import Skill from '../src/models/Skill.js'
import Node from '../src/models/Node.js'
import User from '../src/models/User.js'
import dotenv from 'dotenv'

dotenv.config()

async function checkAllSkillMaps() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Find all skill maps
    const skillMaps = await Skill.find().sort({ createdAt: -1 })
    
    if (skillMaps.length === 0) {
      console.log('❌ No skill maps found in database')
      await mongoose.disconnect()
      return
    }

    console.log(`📊 Found ${skillMaps.length} total skill map(s)\n`)
    console.log('─'.repeat(100))

    for (const skillMap of skillMaps) {
      // Get user info by firebaseUid
      const user = await User.findOne({ firebaseUid: skillMap.userId })
      
      // Get all nodes for this skill map
      const nodes = await Node.find({ skillId: skillMap._id })
      
      // Calculate completion stats
      const completedNodes = nodes.filter(n => n.status === 'Completed').length
      const totalNodes = nodes.length
      const completionPercentage = totalNodes > 0 
        ? Math.round((completedNodes / totalNodes) * 100) 
        : 0
      const allNodesCompleted = totalNodes > 0 && completedNodes === totalNodes

      // Display skill map info
      console.log(`\n📍 Skill Map: ${skillMap.name}`)
      console.log(`   Owner: ${user?.email || 'Unknown'} (${skillMap.userId})`)
      console.log(`   ID: ${skillMap._id}`)
      console.log(`   From Template: ${skillMap.fromTemplate ? '✅ Yes' : '❌ No'}`)
      console.log(`   Completion: ${completionPercentage}% (${completedNodes}/${totalNodes} nodes)`)
      console.log(`   All Nodes Completed: ${allNodesCompleted ? '✅ Yes' : '❌ No'}`)
      console.log(`   Created: ${new Date(skillMap.createdAt).toLocaleDateString()}`)
    }

    console.log('\n' + '─'.repeat(100))
    console.log(`\n✅ Skill maps check completed`)

    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkAllSkillMaps()
