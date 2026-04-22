import SubscriptionService from '../services/SubscriptionService.js';

/**
 * Middleware that attaches the user's subscription info to req.subscription.
 * Use after requireAuth so req.user.id is available.
 */
export async function attachSubscription(req, res, next) {
  try {
    const info = await SubscriptionService.getSubscriptionInfo(req.user.id);
    req.subscription = info;
    next();
  } catch (error) {
    console.error('⚠️ Subscription middleware error:', error.message);
    // Don't block the request — default to free tier
    req.subscription = {
      tier: 'free',
      status: 'active',
      limits: SubscriptionService.getTierLimitsConfig().free,
      usage: { skillMaps: 0, rooms: 0 }
    };
    next();
  }
}

/**
 * Middleware factory: require a specific tier (or higher).
 * Usage: requireTier('pro')
 */
export function requireTier(requiredTier) {
  return async (req, res, next) => {
    try {
      const tier = await SubscriptionService.getTier(req.user.id);
      
      const tierRank = { free: 0, pro: 1 };
      if (tierRank[tier] >= tierRank[requiredTier]) {
        return next();
      }

      return res.status(403).json({
        type: 'SUBSCRIPTION_REQUIRED',
        message: `This feature requires a ${requiredTier} subscription.`,
        currentTier: tier,
        requiredTier
      });
    } catch (error) {
      console.error('⚠️ Tier check error:', error.message);
      return res.status(500).json({ message: 'Failed to verify subscription' });
    }
  };
}

/**
 * Middleware: check skill map creation limit before allowing creation.
 */
export async function checkSkillMapLimit(req, res, next) {
  try {
    const check = await SubscriptionService.canCreateSkillMap(req.user.id);
    console.log(`🔒 Skill map limit check for ${req.user.id}: allowed=${check.allowed}, current=${check.current}, max=${check.max}, tier=${check.tier}`);
    if (!check.allowed) {
      return res.status(403).json({
        type: 'LIMIT_REACHED',
        message: `You've reached the maximum of ${check.max} skill maps on the ${check.tier} plan. Upgrade to Pro for unlimited skill maps.`,
        limit: check.max,
        current: check.current,
        tier: check.tier
      });
    }
    next();
  } catch (error) {
    console.error('⚠️ Skill map limit check error:', error.message);
    return res.status(500).json({
      type: 'SERVER_ERROR',
      message: 'Failed to verify skill map limit. Please try again.'
    });
  }
}

/**
 * Middleware: check node creation limit for a skill map.
 */
export async function checkNodeLimit(req, res, next) {
  try {
    const skillMapId = req.params.skillId || req.params.id || req.body.skillId;
    if (!skillMapId) return next();

    const check = await SubscriptionService.canAddNode(req.user.id, skillMapId);
    if (!check.allowed) {
      return res.status(403).json({
        type: 'LIMIT_REACHED',
        message: `You've reached the maximum of ${check.max} nodes per skill map on the ${check.tier} plan. Upgrade to Pro for up to 15 nodes.`,
        limit: check.max,
        current: check.current,
        tier: check.tier
      });
    }
    next();
  } catch (error) {
    console.error('⚠️ Node limit check error:', error.message);
    return res.status(500).json({
      type: 'SERVER_ERROR',
      message: 'Failed to verify node limit. Please try again.'
    });
  }
}

/**
 * Middleware: check room creation limit.
 */
export async function checkRoomLimit(req, res, next) {
  try {
    const check = await SubscriptionService.canCreateRoom(req.user.id);
    console.log(`🔒 Room limit check for ${req.user.id}: allowed=${check.allowed}, current=${check.current}, max=${check.max}, tier=${check.tier}`);
    if (!check.allowed) {
      return res.status(403).json({
        type: 'LIMIT_REACHED',
        message: `You've reached the maximum of ${check.max} room${check.max === 1 ? '' : 's'} on the ${check.tier} plan. Upgrade to Pro for unlimited rooms.`,
        limit: check.max,
        current: check.current,
        tier: check.tier
      });
    }
    next();
  } catch (error) {
    console.error('⚠️ Room limit check error:', error.message);
    // On error, block the request rather than allowing it through
    return res.status(500).json({
      type: 'SERVER_ERROR',
      message: 'Failed to verify room creation limit. Please try again.'
    });
  }
}

/**
 * Middleware: check PDF export permission.
 */
export async function checkPdfExport(req, res, next) {
  try {
    const allowed = await SubscriptionService.canExportPdf(req.user.id);
    if (!allowed) {
      return res.status(403).json({
        type: 'SUBSCRIPTION_REQUIRED',
        message: 'PDF export is a Pro feature. Upgrade to access it.',
        requiredTier: 'pro'
      });
    }
    next();
  } catch (error) {
    console.error('⚠️ PDF export check error:', error.message);
    next();
  }
}

/**
 * Middleware: check session-per-node limit.
 * Expects nodeId in req.body.nodeId or req.params.nodeId.
 */
export async function checkSessionLimit(req, res, next) {
  try {
    const nodeId = req.body.nodeId || req.params.nodeId;
    if (!nodeId) return next();

    const check = await SubscriptionService.canStartSession(req.user.id, nodeId);
    if (!check.allowed) {
      return res.status(403).json({
        type: 'LIMIT_REACHED',
        message: `You've reached the maximum of ${check.max} sessions per node on the ${check.tier} plan. Upgrade to Pro for unlimited sessions.`,
        limit: check.max,
        current: check.current,
        tier: check.tier
      });
    }
    next();
  } catch (error) {
    console.error('⚠️ Session limit check error:', error.message);
    next();
  }
}
