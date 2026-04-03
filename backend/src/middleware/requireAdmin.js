import User from '../models/User.js'

/**
 * Middleware to check if authenticated user is an admin.
 * Must be used AFTER requireAuth middleware.
 */
export async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Look up user by firebaseUid or email
    let user = await User.findOne({ firebaseUid: req.user.id }).select('role accountStatus').lean()
    if (!user && req.user?.email) {
      user = await User.findOne({ email: req.user.email }).select('role accountStatus').lean()
    }

    if (!user) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    if (user.role !== 'admin') {
      console.log(`🚫 Admin access denied for user ${req.user.id}`)
      return res.status(403).json({ error: 'Admin access required' })
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({ error: 'Account is not active' })
    }

    req.adminUser = user
    next()
  } catch (error) {
    console.error('Admin auth error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
