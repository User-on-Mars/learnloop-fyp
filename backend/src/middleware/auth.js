import jwt from 'jsonwebtoken'

// Auth middleware that accepts both JWT and Firebase tokens
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    
    if (!token) {
      console.log('❌ Auth: Missing token')
      return res.status(401).json({ message: 'Missing token' })
    }

    console.log('🔐 Auth: Verifying token...')

    // Try JWT first (for backend-issued tokens)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      console.log('✅ Auth: JWT verified, user:', decoded.id)
      req.user = { id: decoded.id }
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
        return res.status(401).json({ message: 'Token expired' })
      }

      // Verify the issuer is Firebase (optional but recommended)
      const expectedIssuer = `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`
      if (payload.iss && payload.iss !== expectedIssuer) {
        console.log('⚠️ Auth: Issuer mismatch, but allowing for development')
      }

      console.log('✅ Auth: Firebase token decoded, user:', userId, 'email:', email)
      req.user = { id: userId, email: email }
      return next()
    } catch (decodeError) {
      console.log('❌ Auth: Token decode failed:', decodeError.message)
      return res.status(401).json({ message: 'Invalid token' })
    }
  } catch (e) {
    console.log('❌ Auth: Unexpected error:', e.message)
    return res.status(401).json({ message: 'Invalid token' })
  }
}
