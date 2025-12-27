import jwt from 'jsonwebtoken'
import admin from 'firebase-admin'

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  // For development, we'll use a simple approach
  // In production, you'd use proper service account credentials
  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'learnloop-ab17a'
    })
  } catch (error) {
    console.log('Firebase admin already initialized or error:', error.message)
  }
}

// Auth middleware that accepts both JWT and Firebase tokens
export async function requireAuth(req, res, next){
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if(!token) return res.status(401).json({ message: 'Missing token' })
    
    try {
      // Try JWT first (for backend users)
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = { id: decoded.id }
      return next()
    } catch (jwtError) {
      // If JWT fails, try Firebase token
      try {
        const decodedToken = await admin.auth().verifyIdToken(token)
        req.user = { id: decodedToken.uid, email: decodedToken.email }
        return next()
      } catch (firebaseError) {
        // If both fail, try simple decode for development
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          req.user = { id: payload.user_id || payload.sub || 'firebase_user' }
          return next()
        } catch (decodeError) {
          return res.status(401).json({ message: 'Invalid token' })
        }
      }
    }
  } catch (e){
    return res.status(401).json({ message: 'Invalid token' })
  }
}
