import Subscription from '../models/Subscription.js';
import Skill from '../models/Skill.js';
import Room from '../models/Room.js';
import Node from '../models/Node.js';
import LearningSession from '../models/LearningSession.js';

/**
 * Tier limits configuration.
 * Easy to adjust in one place.
 */
const TIER_LIMITS = {
  free: {
    maxSkillMaps: 3,
    maxNodesPerSkillMap: 5,
    maxSessionsPerNode: 5,
    maxRooms: 1,
    maxRoomMembers: 3,
    canExportPdf: false,
  },
  pro: {
    maxSkillMaps: Infinity,
    maxNodesPerSkillMap: 15,
    maxSessionsPerNode: Infinity,
    maxRooms: Infinity,
    maxRoomMembers: Infinity,
    canExportPdf: true,
  }
};

class SubscriptionService {
  /**
   * Get or create a subscription record for a user.
   * Every user gets a free-tier subscription by default.
   */
  async getSubscription(userId) {
    let sub = await Subscription.findOne({ userId });
    if (!sub) {
      sub = await Subscription.create({ userId, tier: 'free', status: 'active' });
    }
    return sub;
  }

  /**
   * Get the effective tier for a user ('free' or 'pro').
   */
  async getTier(userId) {
    const sub = await this.getSubscription(userId);
    return sub.isPro() ? 'pro' : 'free';
  }

  /**
   * Get the limits object for a user based on their tier.
   */
  async getLimits(userId) {
    const tier = await this.getTier(userId);
    return { tier, limits: TIER_LIMITS[tier] };
  }

  /**
   * Get current usage counts for a user.
   */
  async getUsage(userId) {
    const [skillMapCount, roomCount] = await Promise.all([
      Skill.countDocuments({ userId }),
      Room.countDocuments({ ownerId: userId, deletedAt: null })
    ]);

    return {
      skillMaps: skillMapCount,
      rooms: roomCount
    };
  }

  /**
   * Get full subscription info: tier, limits, and current usage.
   */
  async getSubscriptionInfo(userId) {
    const [sub, usage] = await Promise.all([
      this.getSubscription(userId),
      this.getUsage(userId)
    ]);

    const tier = sub.isPro() ? 'pro' : 'free';
    const rawLimits = TIER_LIMITS[tier];

    // Convert Infinity to -1 for JSON serialization (frontend treats -1 as unlimited)
    const limits = {};
    for (const [key, val] of Object.entries(rawLimits)) {
      limits[key] = val === Infinity ? -1 : val;
    }

    return {
      tier,
      status: sub.status,
      limits,
      usage,
      currentPeriodEnd: sub.currentPeriodEnd,
      canceledAt: sub.canceledAt
    };
  }

  // ─── Limit checks ───────────────────────────────────────────

  /**
   * Check if user can create a new skill map.
   * Returns { allowed, current, max, tier }
   */
  async canCreateSkillMap(userId) {
    const tier = await this.getTier(userId);
    const limits = TIER_LIMITS[tier];
    const current = await Skill.countDocuments({ userId });

    return {
      allowed: current < limits.maxSkillMaps,
      current,
      max: limits.maxSkillMaps,
      tier
    };
  }

  /**
   * Check if user can add a node to a skill map.
   * Returns { allowed, current, max, tier }
   */
  async canAddNode(userId, skillMapId) {
    const tier = await this.getTier(userId);
    const limits = TIER_LIMITS[tier];
    const current = await Node.countDocuments({ skillId: skillMapId });

    return {
      allowed: current < limits.maxNodesPerSkillMap,
      current,
      max: limits.maxNodesPerSkillMap,
      tier
    };
  }

  /**
   * Check if user can create a new room.
   * Returns { allowed, current, max, tier }
   */
  async canCreateRoom(userId) {
    const tier = await this.getTier(userId);
    const limits = TIER_LIMITS[tier];
    const current = await Room.countDocuments({ ownerId: userId, deletedAt: null });

    return {
      allowed: current < limits.maxRooms,
      current,
      max: limits.maxRooms,
      tier
    };
  }

  /**
   * Check if a room can accept more members.
   * Uses the room owner's tier for the limit.
   */
  async canAddRoomMember(roomOwnerId, currentMemberCount) {
    const tier = await this.getTier(roomOwnerId);
    const limits = TIER_LIMITS[tier];

    return {
      allowed: currentMemberCount < limits.maxRoomMembers,
      current: currentMemberCount,
      max: limits.maxRoomMembers,
      tier
    };
  }

  /**
   * Check if user can export PDF.
   */
  async canExportPdf(userId) {
    const tier = await this.getTier(userId);
    return TIER_LIMITS[tier].canExportPdf;
  }

  /**
   * Check if user can start a new session on a node.
   * Free tier: max 5 sessions per node.
   * Returns { allowed, current, max, tier }
   */
  async canStartSession(userId, nodeId) {
    const tier = await this.getTier(userId);
    const limits = TIER_LIMITS[tier];
    if (limits.maxSessionsPerNode === Infinity) {
      return { allowed: true, current: 0, max: Infinity, tier };
    }
    const current = await LearningSession.countDocuments({ userId, nodeId });
    return {
      allowed: current < limits.maxSessionsPerNode,
      current,
      max: limits.maxSessionsPerNode,
      tier
    };
  }

  // ─── Tier management (for admin / webhook use) ──────────────

  /**
   * Upgrade a user to pro tier.
   * Called by admin panel or payment webhook.
   */
  async upgradeToPro(userId, { externalId, periodEnd } = {}) {
    const sub = await this.getSubscription(userId);
    sub.tier = 'pro';
    sub.status = 'active';
    sub.canceledAt = null;
    if (externalId) sub.externalId = externalId;
    if (periodEnd) sub.currentPeriodEnd = periodEnd;
    sub.currentPeriodStart = new Date();
    await sub.save();
    return sub;
  }

  /**
   * Downgrade a user to free tier.
   */
  async downgradeToFree(userId) {
    const sub = await this.getSubscription(userId);
    sub.tier = 'free';
    sub.status = 'active';
    sub.externalId = null;
    sub.currentPeriodStart = null;
    sub.currentPeriodEnd = null;
    sub.canceledAt = null;
    await sub.save();
    return sub;
  }

  /**
   * Cancel a pro subscription (still active until period end).
   */
  async cancelSubscription(userId) {
    const sub = await this.getSubscription(userId);
    if (sub.tier === 'pro') {
      sub.status = 'canceled';
      sub.canceledAt = new Date();
      await sub.save();
    }
    return sub;
  }

  /**
   * Get the static tier limits config (useful for frontend display).
   */
  getTierLimitsConfig() {
    return TIER_LIMITS;
  }
}

export default new SubscriptionService();
