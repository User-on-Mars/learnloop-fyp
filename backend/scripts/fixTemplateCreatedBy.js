/**
 * Fix templates with createdBy: 'user-submission' to use the actual author's firebaseUid.
 * Also removes any XP transactions and UserXpProfile for the bogus 'user-submission' userId.
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

async function fixTemplateCreatedBy() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    const SkillMapTemplate = (await import('../src/models/SkillMapTemplate.js')).default
    const Skill = (await import('../src/models/Skill.js')).default
    const XpTransaction = (await import('../src/models/XpTransaction.js')).default
    const UserXpProfile = (await import('../src/models/UserXpProfile.js')).default

    // 1. Fix templates with createdBy: 'user-submission'
    const brokenTemplates = await SkillMapTemplate.find({ createdBy: 'user-submission' })
    console.log(`Found ${brokenTemplates.length} template(s) with createdBy: 'user-submission'\n`)

    let fixed = 0
    for (const template of brokenTemplates) {
      if (template.sourceSkillmapId) {
        const sourceSkill = await Skill.findById(template.sourceSkillmapId).select('userId').lean()
        if (sourceSkill?.userId) {
          template.createdBy = sourceSkill.userId
          await template.save()
          console.log(`✅ Fixed template "${template.title}" → createdBy: ${sourceSkill.userId}`)
          fixed++
        } else {
          console.log(`⚠️  Template "${template.title}" - source skillmap not found or has no userId`)
        }
      } else {
        console.log(`⚠️  Template "${template.title}" - no sourceSkillmapId, cannot determine author`)
      }
    }

    console.log(`\n─────────────────────────────────`)
    console.log(`✅ Fixed: ${fixed} / ${brokenTemplates.length} templates`)

    // 2. Remove bogus XP transactions for 'user-submission' userId
    const bogusTransactions = await XpTransaction.deleteMany({ userId: 'user-submission' })
    console.log(`\n🗑️  Removed ${bogusTransactions.deletedCount} bogus XP transaction(s) for 'user-submission'`)

    // 3. Remove bogus UserXpProfile for 'user-submission'
    const bogusProfile = await UserXpProfile.deleteMany({ userId: 'user-submission' })
    console.log(`🗑️  Removed ${bogusProfile.deletedCount} bogus XP profile(s) for 'user-submission'`)

    await mongoose.disconnect()
    console.log('\n✅ Done! Disconnected from MongoDB')
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

fixTemplateCreatedBy()
