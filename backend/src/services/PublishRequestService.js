import PublishRequest from '../models/PublishRequest.js';
import User from '../models/User.js';
import Skill from '../models/Skill.js';
import Node from '../models/Node.js';
import SkillMapTemplate from '../models/SkillMapTemplate.js';
import NotificationService from './NotificationService.js';
import ErrorLoggingService from './ErrorLoggingService.js';
import SubscriptionService from './SubscriptionService.js';

/**
 * PublishRequestService - Manages skillmap publish requests
 */
class PublishRequestService {
  /**
   * Check if user can submit a publish request
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { canSubmit: boolean, reason?: string, resetDate?: Date }
   */
  async checkSubmissionEligibility(userId) {
    try {
      const user = await User.findOne({ firebaseUid: userId }).lean();
      if (!user) {
        return { canSubmit: false, reason: 'User not found' };
      }

      // Check pending request count
      const pendingCount = await PublishRequest.getUserPendingCount(userId);
      if (pendingCount >= 1) {
        return { 
          canSubmit: false, 
          reason: 'You already have a pending publish request. Please wait for it to be reviewed.' 
        };
      }

      // Get tier-based limit
      const { limits } = await SubscriptionService.getLimits(userId);
      const maxPerMonth = limits.maxPublishRequestsPerMonth || 1;

      // Check monthly quota
      const now = new Date();
      let quotaReset = user.monthlyQuotaReset;
      
      // Initialize or reset quota if needed
      if (!quotaReset || quotaReset < now) {
        quotaReset = new Date(now);
        quotaReset.setDate(quotaReset.getDate() + 30);
        await User.updateOne(
          { firebaseUid: userId },
          { 
            publishRequestsThisMonth: 0,
            monthlyQuotaReset: quotaReset
          }
        );
      }

      const monthlySubmissions = await PublishRequest.getUserMonthlySubmissions(userId);
      if (monthlySubmissions >= maxPerMonth) {
        return {
          canSubmit: false,
          reason: `You have reached your monthly submission limit (${maxPerMonth} request${maxPerMonth > 1 ? 's' : ''} per 30 days).`,
          resetDate: quotaReset
        };
      }

      return { canSubmit: true };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        userId,
        operation: 'checkSubmissionEligibility'
      });
      throw error;
    }
  }

  /**
   * Validate skillmap completeness
   * @param {string} skillmapId - Skillmap ID
   * @returns {Promise<Object>} { isComplete: boolean, reason?: string, nodeCount: number }
   */
  async validateSkillmapCompleteness(skillmapId) {
    try {
      const skillmap = await Skill.findById(skillmapId).lean();
      if (!skillmap) {
        return { isComplete: false, reason: 'Skillmap not found' };
      }

      // Check if skillmap was created from a template
      if (skillmap.fromTemplate === true) {
        return {
          isComplete: false,
          reason: 'Template-based skill maps cannot be published. Only original skill maps can be submitted.',
          nodeCount: 0
        };
      }

      const nodes = await Node.find({ skillId: skillmapId }).lean();
      const nodeCount = nodes.length;

      if (nodeCount < 5) {
        return {
          isComplete: false,
          reason: `Skillmap must have at least 5 skills. Currently has ${nodeCount}.`,
          nodeCount
        };
      }

      // Check if skillmap has basic required fields
      if (!skillmap.name || skillmap.name.trim().length === 0) {
        return {
          isComplete: false,
          reason: 'Skillmap must have a name.',
          nodeCount
        };
      }

      return { isComplete: true, nodeCount };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        skillmapId,
        operation: 'validateSkillmapCompleteness'
      });
      throw error;
    }
  }

  /**
   * Submit a publish request
   * @param {string} userId - User ID
   * @param {string} skillmapId - Skillmap ID
   * @returns {Promise<Object>} Created publish request
   */
  async submitPublishRequest(userId, skillmapId) {
    try {
      // Check if skillmap is already published or pending
      const existingSkillmap = await Skill.findById(skillmapId).select('publishStatus').lean();
      if (!existingSkillmap) {
        throw new Error('Skill map not found.');
      }
      if (existingSkillmap.publishStatus === 'published') {
        throw new Error('This skill map has already been published.');
      }
      if (existingSkillmap.publishStatus === 'pending') {
        throw new Error('This skill map already has a pending publish request.');
      }

      // Check eligibility
      const eligibility = await this.checkSubmissionEligibility(userId);
      if (!eligibility.canSubmit) {
        throw new Error(eligibility.reason);
      }

      // Validate skillmap completeness
      const validation = await this.validateSkillmapCompleteness(skillmapId);
      if (!validation.isComplete) {
        throw new Error(validation.reason);
      }

      // Get skillmap details for snapshot
      const skillmap = await Skill.findById(skillmapId).lean();
      const nodes = await Node.find({ skillId: skillmapId }).lean();
      const completedNodes = nodes.filter(n => n.status === 'Completed').length;
      const completionPercentage = nodes.length > 0 
        ? Math.round((completedNodes / nodes.length) * 100) 
        : 0;

      // Create publish request
      const publishRequest = await PublishRequest.create({
        userId,
        skillmapId,
        status: 'pending',
        submittedAt: new Date(),
        skillmapSnapshot: {
          name: skillmap.name,
          description: skillmap.description || '',
          icon: skillmap.icon || 'Map',
          color: skillmap.color || '#2e5023',
          goal: skillmap.goal || '',
          nodeCount: nodes.length,
          completionPercentage
        }
      });

      // Update skillmap publish status
      await Skill.updateOne(
        { _id: skillmapId },
        { publishStatus: 'pending' }
      );

      // Update user pending count
      await User.updateOne(
        { firebaseUid: userId },
        { 
          $inc: { pendingRequestCount: 1, publishRequestsThisMonth: 1 }
        }
      );

      await ErrorLoggingService.logSystemEvent('publish_request_submitted', {
        userId,
        skillmapId,
        requestId: publishRequest._id
      });

      // Notify all admins about the new publish request
      const submitter = await User.findOne({ firebaseUid: userId }).select('name').lean();
      await NotificationService.sendNewPublishRequestNotification(
        submitter?.name || 'A user',
        skillmap.name,
        publishRequest._id.toString()
      );

      return publishRequest;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        userId,
        skillmapId,
        operation: 'submitPublishRequest'
      });
      throw error;
    }
  }

  /**
   * Get all publish requests (admin) - for history view
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} All requests with user and skillmap details
   */
  async getAllRequests(options = {}) {
    try {
      const filter = {};
      if (options.status && options.status !== 'all') {
        filter.status = options.status;
      }

      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        PublishRequest.find(filter)
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PublishRequest.countDocuments(filter)
      ]);

      // Enrich with user, skillmap, and node details
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const user = await User.findOne({ firebaseUid: request.userId })
            .select('name email avatar')
            .lean();
          
          const skillmap = await Skill.findById(request.skillmapId)
            .select('name description icon color goal nodeCount publishStatus')
            .lean();

          const nodes = await Node.find({ skillId: request.skillmapId })
            .sort({ order: 1 })
            .select('title description status')
            .lean();

          return {
            ...request,
            user: user || { name: 'Unknown User', email: '' },
            skillmap: skillmap || request.skillmapSnapshot,
            nodes: nodes || []
          };
        })
      );

      return {
        requests: enrichedRequests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        operation: 'getAllRequests'
      });
      throw error;
    }
  }

  /**
   * Get all pending publish requests (admin)
   * @returns {Promise<Array>} Pending requests with user and skillmap details
   */
  async getPendingRequests() {
    try {
      const requests = await PublishRequest.find({ status: 'pending' })
        .sort({ submittedAt: 1 })
        .lean();

      // Enrich with user, skillmap, and node details
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const user = await User.findOne({ firebaseUid: request.userId })
            .select('name email avatar')
            .lean();
          
          const skillmap = await Skill.findById(request.skillmapId)
            .select('name description icon color goal nodeCount')
            .lean();

          const nodes = await Node.find({ skillId: request.skillmapId })
            .sort({ order: 1 })
            .select('title description status')
            .lean();

          return {
            ...request,
            user: user || { name: 'Unknown User', email: '' },
            skillmap: skillmap || request.skillmapSnapshot,
            nodes: nodes || []
          };
        })
      );

      return enrichedRequests;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        operation: 'getPendingRequests'
      });
      throw error;
    }
  }

  /**
   * Get user's publish requests
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User's publish requests
   */
  async getUserRequests(userId) {
    try {
      const requests = await PublishRequest.find({ userId })
        .sort({ submittedAt: -1 })
        .lean();

      // Enrich with skillmap details
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const skillmap = await Skill.findById(request.skillmapId)
            .select('name description icon color goal nodeCount publishStatus')
            .lean();

          return {
            ...request,
            skillmap: skillmap || request.skillmapSnapshot
          };
        })
      );

      return enrichedRequests;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        userId,
        operation: 'getUserRequests'
      });
      throw error;
    }
  }

  /**
   * Approve a publish request (admin)
   * @param {string} requestId - Request ID
   * @param {string} adminId - Admin user ID
   * @param {string} adminNote - Optional approval note
   * @returns {Promise<Object>} Updated request and created template
   */
  async approveRequest(requestId, adminId, adminNote = '') {
    try {
      const request = await PublishRequest.findById(requestId);
      if (!request) {
        throw new Error('Publish request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Request has already been reviewed');
      }

      // Get skillmap and nodes
      const skillmap = await Skill.findById(request.skillmapId).lean();
      if (!skillmap) {
        throw new Error('Skillmap not found');
      }

      const nodes = await Node.find({ skillId: request.skillmapId })
        .sort({ order: 1 })
        .lean();

      // Get user for author credit
      const user = await User.findOne({ firebaseUid: request.userId })
        .select('name')
        .lean();
      const authorCredit = user?.name || 'Anonymous';

      // Create template from skillmap
      const template = await SkillMapTemplate.create({
        title: skillmap.name,
        description: skillmap.description || '',
        icon: skillmap.icon || 'Map',
        goal: skillmap.goal || '',
        nodes: nodes.map(node => ({
          title: node.title,
          description: node.description || '',
          sessions: node.sessions || [{ title: 'Session 1', description: '' }]
        })),
        isPublished: true,
        isBuiltIn: false,
        createdBy: 'user-submission',
        sourceSkillmapId: request.skillmapId,
        authorCredit
      });

      // Update request
      request.status = 'approved';
      request.reviewedAt = new Date();
      request.reviewedBy = adminId;
      request.adminNote = adminNote;
      await request.save();

      // Update skillmap
      await Skill.updateOne(
        { _id: request.skillmapId },
        { 
          publishStatus: 'published',
          publishedAt: new Date(),
          authorCredit
        }
      );

      // Update user pending count
      await User.updateOne(
        { firebaseUid: request.userId },
        { $inc: { pendingRequestCount: -1 } }
      );

      // Send notification
      await NotificationService.sendPublishRequestApprovedNotification(
        request.userId,
        skillmap.name,
        template._id
      );

      await ErrorLoggingService.logSystemEvent('publish_request_approved', {
        requestId,
        adminId,
        userId: request.userId,
        skillmapId: request.skillmapId,
        templateId: template._id
      });

      return { request, template };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        requestId,
        adminId,
        operation: 'approveRequest'
      });
      throw error;
    }
  }

  /**
   * Reject a publish request (admin)
   * @param {string} requestId - Request ID
   * @param {string} adminId - Admin user ID
   * @param {string} adminNote - Rejection reason
   * @returns {Promise<Object>} Updated request
   */
  async rejectRequest(requestId, adminId, adminNote = '') {
    try {
      const request = await PublishRequest.findById(requestId);
      if (!request) {
        throw new Error('Publish request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Request has already been reviewed');
      }

      // Update request
      request.status = 'rejected';
      request.reviewedAt = new Date();
      request.reviewedBy = adminId;
      request.adminNote = adminNote;
      await request.save();

      // Update skillmap
      await Skill.updateOne(
        { _id: request.skillmapId },
        { publishStatus: 'rejected' }
      );

      // Update user pending count (quota slot is NOT refunded)
      await User.updateOne(
        { firebaseUid: request.userId },
        { $inc: { pendingRequestCount: -1 } }
      );

      // Get skillmap name for notification
      const skillmap = await Skill.findById(request.skillmapId)
        .select('name')
        .lean();

      // Send notification
      await NotificationService.sendPublishRequestRejectedNotification(
        request.userId,
        skillmap?.name || 'Your skillmap',
        adminNote
      );

      await ErrorLoggingService.logSystemEvent('publish_request_rejected', {
        requestId,
        adminId,
        userId: request.userId,
        skillmapId: request.skillmapId,
        reason: adminNote
      });

      return request;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        requestId,
        adminId,
        operation: 'rejectRequest'
      });
      throw error;
    }
  }

  /**
   * Cancel a pending request (user or system)
   * @param {string} requestId - Request ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Updated request
   */
  async cancelRequest(requestId, reason = 'Cancelled by user') {
    try {
      const request = await PublishRequest.findById(requestId);
      if (!request) {
        throw new Error('Publish request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Only pending requests can be cancelled');
      }

      // Update request
      request.status = 'rejected';
      request.reviewedAt = new Date();
      request.adminNote = reason;
      await request.save();

      // Update skillmap
      await Skill.updateOne(
        { _id: request.skillmapId },
        { publishStatus: 'draft' }
      );

      // Update user pending count
      await User.updateOne(
        { firebaseUid: request.userId },
        { $inc: { pendingRequestCount: -1 } }
      );

      await ErrorLoggingService.logSystemEvent('publish_request_cancelled', {
        requestId,
        userId: request.userId,
        reason
      });

      return request;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        requestId,
        operation: 'cancelRequest'
      });
      throw error;
    }
  }

  /**
   * Handle skillmap deletion - auto-cancel pending requests
   * @param {string} skillmapId - Skillmap ID
   * @returns {Promise<void>}
   */
  async handleSkillmapDeletion(skillmapId) {
    try {
      const pendingRequests = await PublishRequest.find({
        skillmapId,
        status: 'pending'
      });

      for (const request of pendingRequests) {
        await this.cancelRequest(
          request._id.toString(),
          'Skillmap was deleted by user'
        );
      }

      await ErrorLoggingService.logSystemEvent('publish_requests_auto_cancelled', {
        skillmapId,
        count: pendingRequests.length
      });
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        skillmapId,
        operation: 'handleSkillmapDeletion'
      });
      // Don't throw - this is a cleanup operation
    }
  }
}

export default new PublishRequestService();
