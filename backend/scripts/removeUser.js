import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'
import User from '../src/models/User.js'
import Skill from '../src/models/Skill.js'
import Node from '../src/models/Node.js'
import Practice from '../src/models/Practice.js'
import Reflection from '../src/models/Reflection.js'
import LearningSession from '../src/models/LearningSession.js'
import UserXpProfile from '../src/models/UserXpProfile.js'
import UserStreak from '../src/models/UserStreak.js'
import XpTransaction from '../src/models/XpTransaction.js'

const email = process.argv[2]
if (!email) { console.error('Usage: node scripts/removeUser.js <email>'); process.exit(1) }

await mongoose.connect(process.env.MONGODB_URI)
const user = await User.findOne({ email }).lean()
if (!user) { console.log('User not found:', email); await mongoose.disconnect(); process.exit(0) }

const uid = user.firebaseUid || user._id.toString()
console.log(`Removing user: ${user.name} (${user.email}) uid: ${uid}`)

const skills = await Skill.find({ userId: uid }).select('_id').lean()
const skillIds = skills.map(s => s._id)

const [s, n, p, r, ls, xp, st, tx] = await Promise.all([
  Skill.deleteMany({ userId: uid }),
  skillIds.length ? Node.deleteMany({ skillId: { $in: skillIds } }) : { deletedCount: 0 },
  Practice.deleteMany({ userId: uid }),
  Reflection.deleteMany({ userId: uid }),
  LearningSession.deleteMany({ userId: uid }),
  UserXpProfile.deleteMany({ userId: uid }),
  UserStreak.deleteMany({ userId: uid }),
  XpTransaction.deleteMany({ userId: uid })
])
const del = await User.deleteOne({ _id: user._id })

console.log(`User deleted: ${del.deletedCount}`)
console.log(`Skills: ${s.deletedCount}, Nodes: ${n.deletedCount}, Practices: ${p.deletedCount}`)
console.log(`Reflections: ${r.deletedCount}, Sessions: ${ls.deletedCount}`)
console.log(`XP profiles: ${xp.deletedCount}, Streaks: ${st.deletedCount}, XP txns: ${tx.deletedCount}`)
await mongoose.disconnect()
console.log('Done')
