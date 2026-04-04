/**
 * Promote a user to admin by email.
 * Usage: node scripts/makeAdmin.js user@example.com
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import User from '../src/models/User.js'

dotenv.config()

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/makeAdmin.js <email>')
  process.exit(1)
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI)
  const user = await User.findOne({ email })
  if (!user) {
    console.error(`User not found: ${email}`)
    process.exit(1)
  }
  user.role = 'admin'
  await user.save()
  console.log(`${email} is now an admin`)
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
