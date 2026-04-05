import mongoose from 'mongoose'
import Skill from '../src/models/Skill.js'
import Node from '../src/models/Node.js'
import User from '../src/models/User.js'
import dotenv from 'dotenv'

dotenv.config()

async function checkSkillMaps() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Get current user from environment or use first user
    let userId = process.env.USER_ID
    
    if (!userId) {
      const firstUser = await User.findOne().sort({ createdAt: 1 })
      if (!firstUser) {
        console.log('❌ No users found in database')
        await mongoose.disconnect()
        return
      }
      userId = firstUser._id.toString()
      console.log(`📌 Using first user: ${firstUser.email} (${userId})\n`)
    }

    // Find all skill maps for the user
    const skillMaps = await Skill.find({ userId }).sort({ createdAt: -1 })
    
    if (skillMaps.length === 0) {
      console.log(`❌ No skill maps found for user ${userId}`)
      await mongoose.disconnect()
      return
    }

    console.log(`📊 Found ${skillMaps.length} skill map(s)\n`)
    console.log('─'.repeat(80))

    for (const skillMap of skillMaps) {
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
      console.log(`   ID: ${skillMap._id}`)
      console.log(`   From Template: ${skillMap.fromTemplate ? '✅ Yes' : '❌ No'}`)
      console.log(`   Completion: ${completionPercentage}% (${completedNodes}/${totalNodes} nodes)`)
      console.log(`   Number of Nodes: ${totalNodes}`)
      console.log(`   All Nodes Completed: ${allNodesCompleted ? '✅ Yes' : '❌ No'}`)
      console.log(`   Status: ${skillMap.status}`)
      console.log(`   Created: ${new Date(skillMap.createdAt).toLocaleDateString()}`)
    }

    console.log('\n' + '─'.repeat(80))
    console.log(`\n✅ Skill maps check completed`)

    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkSkillMaps()
