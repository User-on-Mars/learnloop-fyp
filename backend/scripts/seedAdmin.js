/**
 * Create an admin user record in MongoDB for a Firebase user.
 * Usage: node scripts/seedAdmin.js <email> <name>
 * 
 * This creates a User document with role=admin so the Firebase user
 * can access the admin panel. No password needed since auth is via Firebase.
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

const email = process.argv[2]
const name = process.argv[3] || 'Admin'

if (!email) {
  console.error('Usage: node scripts/seedAdmin.js <email> [name]')
  process.exit(1)
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  
  const User = (await import('../src/models/User.js')).default
  
  let user = await User.findOne({ email })
  if (user) {
    user.role = 'admin'
    await user.save()
    console.log(`Existing user ${email} promoted to admin`)
  } else {
    user = await User.create({
      name,
      email,
      passwordHash: 'firebase-auth-user',
      role: 'admin',
      accountStatus: 'active'
    })
    console.log(`Created admin user: ${email}`)
  }
  
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
