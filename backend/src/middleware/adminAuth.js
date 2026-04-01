import User from '../models/User.js'

/**
 * Middleware to check if the authenticated user is an admin.
 * Must be used AFTER requireAuth middleware.
 */
export async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    // Look up user by email (Firebase users) or _id (JWT users)
    let user = null
    if (req.user?.email) {
      user = await User.findOne({ email: req.user.email }).select('role accountStatus').lean()
    }
    if (!user) {
      try {
        user = await User.findById(userId).select('role accountStatus').lean()
      } catch (e) {
        // userId might not be a valid ObjectId (Firebase UID)
      }
    }

    if (!user) {
      return res.status(403).json({ message: 'User not found' })
    }

    if (user.role !== 'admin') {
      console.log(`🚫 Admin access denied for user ${userId}`)
      return res.status(403).json({ message: 'Admin access required' })
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({ message: 'Account is not active' })
    }

    req.adminUser = user
    next()
  } catch (error) {
    console.error('Admin auth error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * Middleware to check account status for regular users.
 * Blocks suspended/banned users from accessing the API.
 */
export async function checkAccountStatus(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) return next()

    let user = await User.findById(userId).select('accountStatus').lean()
    if (!user && req.user?.email) {
      user = await User.findOne({ email: req.user.email }).select('accountStatus').lean()
    }

    if (!user) return next() // New Firebase users won't have a DB record yet

    if (user.accountStatus === 'banned') {
      return res.status(403).json({ 
        message: 'Your account has been banned. Contact support for assistance.',
        accountStatus: 'banned'
      })
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ 
        message: 'Your account has been temporarily suspended. Contact support for assistance.',
        accountStatus: 'suspended'
      })
    }

    next()
  } catch (error) {
    console.error('Account status check error:', error)
    next() // Don't block on errors
  }
}
