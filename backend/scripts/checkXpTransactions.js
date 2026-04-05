import mongoose from 'mongoose'
import XpTransaction from '../src/models/XpTransaction.js'
import User from '../src/models/User.js'
import dotenv from 'dotenv'

dotenv.config()

async function checkXpTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Find the user
    const user = await User.findOne({ email: '4m4nd4supp0rts@gmail.com' })
    if (!user) {
      console.log('❌ User not found')
      await mongoose.disconnect()
      return
    }

    console.log(`📌 User: ${user.email} (Firebase UID: ${user.firebaseUid})\n`)

    // Find all XP transactions for this user
    const transactions = await XpTransaction.find({ userId: user.firebaseUid }).sort({ createdAt: -1 })
    
    console.log(`📊 Found ${transactions.length} XP transaction(s)\n`)
    console.log('─'.repeat(100))

    // Group by source
    const bySource = {}
    transactions.forEach(t => {
      if (!bySource[t.source]) bySource[t.source] = []
      bySource[t.source].push(t)
    })

    for (const [source, txns] of Object.entries(bySource)) {
      console.log(`\n📍 Source: ${source}`)
      console.log(`   Count: ${txns.length}`)
      
      let totalXp = 0
      txns.forEach(t => {
        totalXp += t.finalAmount
        console.log(`   - ${new Date(t.createdAt).toLocaleString()}: ${t.baseAmount} XP (×${t.multiplier}) = ${t.finalAmount} XP`)
        if (t.referenceId) {
          console.log(`     Reference: ${t.referenceId}`)
        }
      })
      console.log(`   Total: ${totalXp} XP`)
    }

    console.log('\n' + '─'.repeat(100))
    
    // Calculate total XP
    const totalXp = transactions.reduce((sum, t) => sum + t.finalAmount, 0)
    console.log(`\n✅ Total XP earned: ${totalXp} XP`)

    // Check for skillmap_completion transactions
    const skillmapTxns = transactions.filter(t => t.source === 'skillmap_completion')
    console.log(`\n🎯 Skill Map Completion Transactions: ${skillmapTxns.length}`)
    if (skillmapTxns.length === 0) {
      console.log('   ⚠️  No skill map completion XP found!')
    }

    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkXpTransactions()
