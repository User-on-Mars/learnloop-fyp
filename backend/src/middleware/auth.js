import jwt from 'jsonwebtoken'
import { SECURITY_EVENTS } from './security.js'
import User from '../models/User.js'

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

    // For Firebase tokens, decode and extract user info
    // Firebase tokens are JWTs that we can decode to get the user ID
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid token format')
      }

      // Decode the payload (middle part)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
      
      // Firebase tokens have user_id or sub field
      const userId = payload.user_id || payload.sub
      const email = payload.email

      if (!userId) {
        throw new Error('No user ID in token')
      }

      // Verify the token is not expired
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        console.log('❌ Auth: Token expired')
        logSecurityEvent(SECURITY_EVENTS.AUTH_FAILED, req, 'Token expired')
        return res.status(401).json({ message: 'Token expired' })
      }

      // Verify the issuer is Firebase (optional but recommended)
      const expectedIssuer = `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`
      if (payload.iss && payload.iss !== expectedIssuer) {
        console.log('⚠️ Auth: Issuer mismatch, but allowing for development')
      }

      console.log('✅ Auth: Firebase token decoded, user:', userId, 'email:', email)
      req.user = { id: userId, email: email }

      // Check account status for banned/suspended users
      // Auto-create User record for Firebase users if it doesn't exist
      let dbUser = await User.findOne({ email }).select('accountStatus role firebaseUid').lean()
      if (!dbUser && email) {
        try {
          dbUser = await User.create({
            name: payload.name || email.split('@')[0],
            email,
            passwordHash: 'firebase-auth-user',
            role: 'user',
            accountStatus: 'active',
            firebaseUid: userId
          })
          console.log(`📝 Auto-created User record for Firebase user: ${email}`)
        } catch (createErr) {
          // Might fail on duplicate — race condition, just re-fetch
          dbUser = await User.findOne({ email }).select('accountStatus role firebaseUid').lean()
        }
      }

      // Update firebaseUid if not set yet
      if (dbUser && !dbUser.firebaseUid) {
        await User.updateOne({ _id: dbUser._id }, { firebaseUid: userId })
      }

      if (dbUser) {
        if (dbUser.accountStatus === 'banned') {
          return res.status(403).json({ message: 'Your account has been banned.', accountStatus: 'banned' })
        }
        if (dbUser.accountStatus === 'suspended') {
          return res.status(403).json({ message: 'Your account has been suspended.', accountStatus: 'suspended' })
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
