/**
 * Fix unknown or empty user names
 * 
 * This script finds all users where the name field is "Unknown" or empty,
 * and attempts to populate it with:
 * 1. Firebase displayName (if available via firebaseUid)
 * 2. Email prefix (as fallback)
 * 
 * Usage: node scripts/fixUnknownNames.js
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

dotenv.config()

// Initialize Firebase Admin SDK
let firebaseApp = null
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
    path.join(process.cwd(), 'firebase-service-account.json')
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
    console.log('Firebase Admin SDK initialized')
  } else {
    console.warn('Firebase service account file not found, will use email prefix only')
  }
} catch (err) {
  console.warn('Firebase initialization failed:', err.message)
  console.warn('Will use email prefix only')
}

async function getFirebaseDisplayName(firebaseUid) {
  if (!firebaseApp || !firebaseUid) return null
  
  try {
    const userRecord = await admin.auth().getUser(firebaseUid)
    return userRecord.displayName || null
  } catch (err) {
    console.warn(`Could not fetch Firebase user ${firebaseUid}:`, err.message)
    return null
  }
}

function getEmailPrefix(email) {
  return email.split('@')[0]
}

function capitalizeWords(str) {
  return str
    .split(/[\s\-_.]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

async function fixUnknownNames() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')
    
    const User = (await import('../src/models/User.js')).default
    
    // Find users with unknown or empty names
    const unknownUsers = await User.find({
      $or: [
        { name: 'Unknown' },
        { name: '' },
        { name: null },
        { name: undefined }
      ]
    })
    
    console.log(`Found ${unknownUsers.length} users with unknown/empty names\n`)
    
    if (unknownUsers.length === 0) {
      console.log('No users to fix')
      await mongoose.disconnect()
      return
    }
    
    const results = {
      updated: 0,
      failed: 0,
      details: []
    }
    
    for (const user of unknownUsers) {
      let newName = null
      let source = null
      
      // Try Firebase displayName first
      if (user.firebaseUid) {
        newName = await getFirebaseDisplayName(user.firebaseUid)
        if (newName) {
          source = 'Firebase displayName'
        }
      }
      
      // Fallback to email prefix
      if (!newName) {
        newName = capitalizeWords(getEmailPrefix(user.email))
        source = 'email prefix'
      }
      
      try {
        user.name = newName
        await user.save()
        results.updated++
        results.details.push({
          email: user.email,
          newName,
          source,
          status: 'success'
        })
        console.log(`✓ Updated ${user.email}: "${newName}" (from ${source})`)
      } catch (err) {
        results.failed++
        results.details.push({
          email: user.email,
          error: err.message,
          status: 'failed'
        })
        console.error(`✗ Failed to update ${user.email}:`, err.message)
      }
    }
    
    console.log('\n--- Summary ---')
    console.log(`Total processed: ${unknownUsers.length}`)
    console.log(`Successfully updated: ${results.updated}`)
    console.log(`Failed: ${results.failed}`)
    
    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
    
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

fixUnknownNames().catch(err => {
  console.error(err)
  process.exit(1)
})
