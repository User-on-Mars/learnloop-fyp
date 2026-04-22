/**
 * Remove placeholder @learnloop.local users and their associated data
 * These were created by createMissingUserRecords.js as temporary placeholders
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

async function removeLearnloopLocalUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    const User = (await import('../src/models/User.js')).default
    const Skill = (await import('../src/models/Skill.js')).default
    const Node = (await import('../src/models/Node.js')).default
    const Practice = (await import('../src/models/Practice.js')).default
    const Reflection = (await import('../src/models/Reflection.js')).default
    const LearningSession = (await import('../src/models/LearningSession.js')).default
    const UserXpProfile = (await import('../src/models/UserXpProfile.js')).default
    const UserStreak = (await import('../src/models/UserStreak.js')).default
    const XpTransaction = (await import('../src/models/XpTransaction.js')).default

    // Find all @learnloop.local users
    const localUsers = await User.find({ email: /@learnloop\.local$/i }).lean()
    console.log(`Found ${localUsers.length} @learnloop.local users to remove:\n`)

    for (const user of localUsers) {
      const uid = user.firebaseUid || user._id.toString()
      console.log(`  - ${user.name} (${user.email}) [uid: ${uid}]`)
    }

    if (localUsers.length === 0) {
      console.log('No @learnloop.local users found. Nothing to do.')
      await mongoose.disconnect()
      return
    }

    console.log('\nRemoving associated data...\n')

    const uids = localUsers.map(u => u.firebaseUid || u._id.toString())
    const userIds = localUsers.map(u => u._id)

    // Remove associated data
    const [skills, nodes, practices, reflections, sessions, xpProfiles, streaks, xpTxns] = await Promise.all([
      Skill.deleteMany({ userId: { $in: uids } }),
      // Nodes are linked via skillId, need to find skills first
      Skill.find({ userId: { $in: uids } }).select('_id').lean(),
      Practice.deleteMany({ userId: { $in: uids } }),
      Reflection.deleteMany({ userId: { $in: uids } }),
      LearningSession.deleteMany({ userId: { $in: uids } }),
      UserXpProfile.deleteMany({ userId: { $in: uids } }),
      UserStreak.deleteMany({ userId: { $in: uids } }),
      XpTransaction.deleteMany({ userId: { $in: uids } })
    ])

    // Delete nodes for those skills
    const skillIds = nodes.map(s => s._id)
    const deletedNodes = skillIds.length > 0
      ? await Node.deleteMany({ skillId: { $in: skillIds } })
      : { deletedCount: 0 }

    // Delete the users themselves
    const deletedUsers = await User.deleteMany({ _id: { $in: userIds } })

    console.log('--- Cleanup Summary ---')
    console.log(`Users removed:        ${deletedUsers.deletedCount}`)
    console.log(`Skills removed:       ${skills.deletedCount}`)
    console.log(`Nodes removed:        ${deletedNodes.deletedCount}`)
    console.log(`Practices removed:    ${practices.deletedCount}`)
    console.log(`Reflections removed:  ${reflections.deletedCount}`)
    console.log(`Sessions removed:     ${sessions.deletedCount}`)
    console.log(`XP profiles removed:  ${xpProfiles.deletedCount}`)
    console.log(`Streaks removed:      ${streaks.deletedCount}`)
    console.log(`XP transactions:      ${xpTxns.deletedCount}`)

    await mongoose.disconnect()
    console.log('\n✅ Done. Disconnected from MongoDB.')
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

removeLearnloopLocalUsers()
