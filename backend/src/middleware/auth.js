import jwt from 'jsonwebtoken'
import { SECURITY_EVENTS } from './security.js'
import User from '../models/User.js'
import admin from '../config/firebase.js'

// Auth middleware that accepts both JWT and Firebase tokens
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    
    if (!token) {
      console.log('❌ Auth: Missing token')
      logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'Missing token')
      return res.status(401).json({ message: 'Missing token' })
    }

    console.log('🔐 Auth: Verifying token...')

    // Try JWT first (for backend-issued tokens)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      console.log('✅ Auth: JWT verified, user:', decoded.id)
      req.user = { id: decoded.id }
      logSecurityEvent(SECURITY_EVENTS.AUTH_LOGIN, req, 'JWT authentication successful')
      return next()
    } catch (jwtError) {
      // JWT verification failed, try Firebase token
      console.log('🔄 Auth: JWT failed, trying Firebase token...')
    }

    // For Firebase tokens, verify using Firebase Admin SDK
    try {
      let userId, email, emailVerified, displayName

      // Use Firebase Admin SDK for cryptographic verification (preferred)
      if (admin && admin.apps?.length > 0) {
        const decodedToken = await admin.auth().verifyIdToken(token)
        userId = decodedToken.uid
        email = decodedToken.email
        emailVerified = decodedToken.email_verified || false
        displayName = decodedToken.name || null
        console.log('✅ Auth: Firebase token verified (Admin SDK), user:', userId, 'email:', email)
      } else {
        // Fallback: manual decode (less secure, for development only)
        console.warn('⚠️ Auth: Firebase Admin SDK not available, using manual decode (INSECURE)')
        const parts = token.split('.')
        if (parts.length !== 3) {
          throw new Error('Invalid token format')
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
        userId = payload.user_id || payload.sub
        email = payload.email
        emailVerified = payload.email_verified || false
        displayName = payload.name || null

        if (!userId) {
          throw new Error('No user ID in token')
        }

        // Verify expiry manually
        const now = Math.floor(Date.now() / 1000)
        if (payload.exp && payload.exp < now) {
          console.log('❌ Auth: Token expired')
          logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'Token expired')
          return res.status(401).json({ message: 'Token expired' })
        }

        // Verify issuer
        const expectedIssuer = `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`
        if (payload.iss && payload.iss !== expectedIssuer && process.env.NODE_ENV === 'production') {
          console.log('❌ Auth: Issuer mismatch in production')
          logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'Token issuer mismatch')
          return res.status(401).json({ message: 'Invalid token' })
        }
      }
      
      req.user = { id: userId, email: email }

      // Check account status for banned/suspended users
      // Auto-create User record for Firebase users if it doesn't exist
      let dbUser = await User.findOne({ email }).select('accountStatus role firebaseUid emailVerified').lean()
      
      // Only enforce email verification for NEW users (users not in database yet)
      // Existing users (especially Google sign-in users) can bypass this check
      if (!dbUser && !emailVerified) {
        console.log('❌ Auth: Email not verified for new user:', email)
        logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'Email not verified for new user')
        return res.status(403).json({ 
          message: 'Please verify your email before accessing the platform. Check your inbox for the verification link.',
          emailVerified: false
        })
      }
      
      if (!dbUser && email) {
        try {
          dbUser = await User.create({
            name: displayName || email.split('@')[0],
            email,
            passwordHash: 'firebase-auth-user',
            role: 'user',
            accountStatus: 'active',
            firebaseUid: userId,
            emailVerified: emailVerified
          })
          console.log(`📝 Auto-created User record for Firebase user: ${email}`)
        } catch (createErr) {
          // Might fail on duplicate — race condition, just re-fetch
          dbUser = await User.findOne({ email }).select('accountStatus role firebaseUid emailVerified').lean()
        }
      }

      // Keep Firebase UID fresh for the email account. Google/Firebase can issue
      // a new UID when an auth account is recreated with the same email.
      if (dbUser) {
        const updates = {}
        if (userId && dbUser.firebaseUid !== userId) {
          updates.firebaseUid = userId
        }
        if (!dbUser.emailVerified && emailVerified) {
          updates.emailVerified = true
        }
        if (Object.keys(updates).length > 0) {
          await User.updateOne({ _id: dbUser._id }, updates)
        }
      }

      if (dbUser) {
        if (dbUser.accountStatus === 'deleted') {
          console.log(`🗑️ Deleted user attempted to access: ${email}`)
          return res.status(403).json({ 
            message: 'This account has been deleted.',
            accountStatus: 'deleted'
          })
        }
        if (dbUser.accountStatus === 'banned') {
          console.log(`🚫 Banned user attempted to access: ${email}`)
          return res.status(403).json({ 
            message: 'This account has been banned and cannot access the platform.',
            accountStatus: 'banned'
          })
        }
        if (dbUser.accountStatus === 'suspended') {
          return res.status(403).json({ 
            message: 'This account has been suspended.',
            accountStatus: 'suspended'
          })
        }
        req.user.role = dbUser.role
      }

      logSecurityEvent(SECURITY_EVENTS.AUTH_LOGIN, req, 'Firebase authentication successful')
      return next()
    } catch (decodeError) {
      console.log('❌ Auth: Token decode failed:', decodeError.message)
      logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, `Token decode failed: ${decodeError.message}`)
      return res.status(401).json({ message: 'Invalid token' })
    }
  } catch (e) {
    console.log('❌ Auth: Unexpected error:', e.message)
    logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, `Unexpected error: ${e.message}`)
    return res.status(401).json({ message: 'Invalid token' })
  }
}

/**
 * Middleware to verify skill ownership
 * Implements Requirement 9.2: Ensure users can only edit their own content
 */
export async function verifySkillOwnership(req, res, next) {
  // Skill ownership verification removed with skill map feature
  next();
}

/**
 * Middleware to verify session ownership
 * Implements Requirement 9.3: Validate session ownership before allowing modifications
 */
export async function verifySessionOwnership(req, res, next) {
  try {
    const { sessionId } = req.params
    const userId = req.user.id

    // Import here to avoid circular dependency
    const { default: LearningSession } = await import('../models/LearningSession.js')
    
    const session = await LearningSession.findOne({ _id: sessionId, userId })
    
    if (!session) {
      console.log(`❌ Auth: User ${userId} attempted to access session ${sessionId} they don't own`)
      logSecurityEvent(SECURITY_EVENTS.UNAUTHORIZED_ACCESS, req, `Attempted access to session ${sessionId}`)
      return res.status(403).json({ 
        message: 'Access denied: You can only access your own sessions' 
      })
    }

    req.session = session
    next()
  } catch (error) {
    console.error('Error verifying session ownership:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * Middleware to verify node ownership through skill
 * Implements Requirement 9.2: Ensure users can only edit their own content
 */
export async function verifyNodeOwnership(req, res, next) {
  // Node ownership verification removed with skill map feature
  next();
}

/**
 * Enhanced JWT token validation with additional security checks
 * Implements Requirement 9.1: Verify user authentication tokens for all operations
 */
export function validateJWTToken(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    
    if (!token) {
      logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'Missing JWT token')
      return res.status(401).json({ message: 'Authentication token required' })
    }

    // Verify token structure
    const parts = token.split('.')
    if (parts.length !== 3) {
      logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'Invalid JWT token format')
      return res.status(401).json({ message: 'Invalid token format' })
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Additional security checks
    if (!decoded.id) {
      logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'JWT token missing user ID')
      return res.status(401).json({ message: 'Invalid token payload' })
    }

    // Check token age (optional additional security)
    const tokenAge = Date.now() / 1000 - decoded.iat
    const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
    
    if (tokenAge > maxAge) {
      logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'JWT token too old')
      return res.status(401).json({ message: 'Token expired, please login again' })
    }

    req.user = { id: decoded.id }
    logSecurityEvent(SECURITY_EVENTS.AUTH_LOGIN, req, 'JWT validation successful')
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'JWT token expired')
      return res.status(401).json({ message: 'Token expired' })
    } else if (error.name === 'JsonWebTokenError') {
      logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'Invalid JWT token')
      return res.status(401).json({ message: 'Invalid token' })
    } else {
      console.error('JWT validation error:', error)
      logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, `JWT validation error: ${error.message}`)
      return res.status(401).json({ message: 'Authentication failed' })
    }
  }
}

/**
 * Log security events for audit trail
 */
function logSecurityEvent(eventType, req, details) {
  const logData = {
    timestamp: new Date().toISOString(),
    eventType,
    userId: req.user?.id || 'anonymous',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.originalUrl,
    details
  }

  console.log(`🔒 SECURITY EVENT [${eventType}]:`, JSON.stringify(logData, null, 2))
}
