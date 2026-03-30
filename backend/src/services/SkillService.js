import Skill from '../models/Skill.js';
import Node from '../models/Node.js';
import LearningSession from '../models/LearningSession.js';
import mongoose from 'mongoose';
import dbMonitor from '../utils/dbMonitor.js';
import {
  ValidationError,
  NotFoundError,
  PermissionError,
  ReferentialIntegrityError,
  DatabaseError,
  ConflictError
} from '../utils/errors.js';
import NodeService from './NodeService.js';
import ErrorLoggingService from './ErrorLoggingService.js';
import cacheService from './CacheService.js';

class SkillService {
  /**
   * Create a new skill with generated nodes
   * @param {string} userId - User ID
   * @param {string} name - Skill name (1-100 chars)
   * @param {number} nodeCount - Number of nodes (2-16)
   * @returns {Promise<{skill: Object, nodes: Array}>}
   */
  async createSkill(userId, name, nodeCount) {
    // Validate inputs - Requirements 1.9, 1.10
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }
    
    if (!name || name.trim().length < 1) {
      throw new ValidationError('name', name, { type: 'minLength', min: 1 });
    }
    
    if (name.trim().length > 100) {
      throw new ValidationError('name', name, { type: 'maxLength', max: 100 });
    }
    
    if (!nodeCount || !Number.isInteger(nodeCount)) {
      throw new ValidationError('nodeCount', nodeCount, { type: 'required', format: 'integer' });
    }
    
    if (nodeCount < 2 || nodeCount > 15) {
      throw new ValidationError('nodeCount', nodeCount, { type: 'range', min: 2, max: 15 });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create skill document
      const skill = new Skill({
        userId,
        name: name.trim(),
        nodeCount
      });
      
      await dbMonitor.monitorWrite(
        () => skill.save({ session }),
        'SkillService.createSkill - save skill'
      );

      // Generate nodes
      const nodes = [];
      for (let i = 1; i <= nodeCount; i++) {
        const node = new Node({
          skillId: skill._id,
          userId,
          order: i,
          title: `Node ${i}`,
          description: '',
          status: i === 1 ? 'Unlocked' : 'Locked',
          isStart: i === 1,
          isGoal: i === nodeCount
        });
        
        nodes.push(node);
      }

      // Save all nodes
      await dbMonitor.monitorWrite(
        () => Node.insertMany(nodes, { session }),
        'SkillService.createSkill - insert nodes'
      );

      await session.commitTransaction();
      
      // Log successful creation
      await ErrorLoggingService.logSystemEvent('skill_created', {
        skillId: skill._id,
        userId,
        nodeCount,
        timestamp: new Date().toISOString()
      });
      
      return {
        skill: skill.toObject(),
        nodes: nodes.map(n => n.toObject())
      };
    } catch (error) {
      await session.abortTransaction();
      
      // Log error with context - Requirement 14.5
      await ErrorLoggingService.logError(error, {
        userId,
        operation: 'createSkill',
        name,
        nodeCount,
        timestamp: new Date().toISOString()
      });
      
      // Wrap database errors
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('createSkill', error, { userId, name, nodeCount });
      }
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all skills for a user with progress calculation
   * Optimized to fetch all nodes in a single query (Fixes N+1 problem)
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getUserSkills(userId) {
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Try to get from cache
      const cacheKey = `user_skills:${userId}`;
      if (cacheService.isAvailable()) {
        const cachedSkills = await cacheService.getUserProgression(userId, 'all_skills');
        if (cachedSkills) {
          console.log('⚡ Cache hit: getUserSkills');
          return cachedSkills;
        }
      }

      // Get all skills for user, sorted by creation date (newest first)
      const skills = await dbMonitor.monitorRead(
        () => Skill.find({ userId }).sort({ createdAt: -1 }).lean(),
        'SkillService.getUserSkills - fetch skills'
      );

      if (skills.length === 0) return [];

      // Fetch all nodes for all user skills in a single query - Fixes N+1 pattern
      const skillIds = skills.map(s => s._id);
      const allNodes = await dbMonitor.monitorRead(
        () => Node.find({ skillId: { $in: skillIds } }).lean(),
        'SkillService.getUserSkills - fetch all nodes'
      );

      // Group nodes by skillId in memory
      const nodesBySkill = allNodes.reduce((acc, node) => {
        const skillId = node.skillId.toString();
        if (!acc[skillId]) acc[skillId] = [];
        acc[skillId].push(node);
        return acc;
      }, {});

      // Calculate progress for each skill using in-memory nodes
      const skillsWithProgress = skills.map(skill => {
        const nodes = nodesBySkill[skill._id.toString()] || [];
        const completedNodes = nodes.filter(n => n.status === 'Completed').length;
        const totalNodes = nodes.length;
        const completionPercentage = totalNodes > 0 
          ? Math.round((completedNodes / totalNodes) * 100) 
          : 0;

        return {
          ...skill,
          completedNodes,
          completionPercentage
        };
      });

      // Cache the result for a short time (30 seconds for skill list)
      if (cacheService.isAvailable()) {
        await cacheService.cacheUserProgression(userId, 'all_skills', skillsWithProgress, 30);
      }

      return skillsWithProgress;
    } catch (error) {
      // Log error with context - Requirement 14.5
      await ErrorLoggingService.logError(error, {
        userId,
        operation: 'getUserSkills',
        timestamp: new Date().toISOString()
      });
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getUserSkills', error, { userId });
      }
      
      throw error;
    }
  }

  /**
   * Get a single skill by ID with caching
   * @param {string} skillId - Skill ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getSkillById(skillId, userId) {
    if (!skillId) {
      throw new ValidationError('skillId', skillId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Try to get from cache
      if (cacheService.isAvailable()) {
        const cachedSkill = await cacheService.getSkillMap(skillId, userId);
        if (cachedSkill) {
          console.log(`⚡ Cache hit: getSkillById ${skillId}`);
          return cachedSkill;
        }
      }

      const skill = await dbMonitor.monitorRead(
        () => Skill.findOne({ _id: skillId, userId }).lean(),
        'SkillService.getSkillById - fetch skill'
      );
      
      if (!skill) {
        throw new NotFoundError('Skill', skillId, { userId });
      }

      // Cache the skill for 5 minutes
      if (cacheService.isAvailable()) {
        await cacheService.cacheSkillMap(skillId, userId, skill, 300);
      }

      return skill;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      // Log error with context
      await ErrorLoggingService.logError(error, {
        userId,
        skillId,
        operation: 'getSkillById',
        timestamp: new Date().toISOString()
      });
      
      if (error.name === 'CastError') {
        throw new ValidationError('skillId', skillId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getSkillById', error, { userId, skillId });
      }
      
      throw error;
    }
  }

  /**
   * Delete a skill and cascade to nodes
   * @param {string} skillId - Skill ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async skillTitleExistsForUser(userId, title) {
    if (!userId || !title?.trim()) return false;
    const escaped = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await Skill.findOne({
      userId,
      name: new RegExp(`^${escaped}$`, 'i')
    }).lean();
    return Boolean(existing);
  }

  /**
   * Create skill map from wizard (START completed, optional content nodes, GOAL locked).
   */
  async createSkillMap(userId, { title, description, icon, goal, sketchTitles }) {
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }
    const cleanTitle = title.trim();
    if (await this.skillTitleExistsForUser(userId, cleanTitle)) {
      throw new ConflictError('SkillMap', 'A skill map with this title already exists');
    }

    const titles = (sketchTitles || []).map((t) => String(t).trim()).filter(Boolean);
    if (titles.length !== new Set(titles.map((t) => t.toLowerCase())).size) {
      throw new ValidationError('sketchTitles', titles, { type: 'unique', message: 'Node titles must be unique' });
    }

    const contentCount = titles.length;
    const totalNodes = 1 + contentCount + 1;
    if (totalNodes > 15) {
      throw new ValidationError('sketchTitles', titles, { type: 'maxLength', max: 15 });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const skill = new Skill({
        userId,
        name: cleanTitle,
        nodeCount: totalNodes,
        description: description == null ? '' : String(description).trim(),
        icon: icon || 'Map',
        goal: goal.trim(),
        status: 'active'
      });

      await dbMonitor.monitorWrite(
        () => skill.save({ session }),
        'SkillService.createSkillMap - save skill'
      );

      const nodes = [];
      let order = 1;

      nodes.push(new Node({
        skillId: skill._id,
        userId,
        order: order++,
        title: 'Start',
        description: '',
        status: 'Completed',
        isStart: true,
        isGoal: false
      }));

      for (let i = 0; i < contentCount; i++) {
        nodes.push(new Node({
          skillId: skill._id,
          userId,
          order: order++,
          title: titles[i],
          description: '',
          status: i === 0 ? 'Unlocked' : 'Locked',
          isStart: false,
          isGoal: false
        }));
      }

      nodes.push(new Node({
        skillId: skill._id,
        userId,
        order: order++,
        title: goal.trim(),
        description: '',
        status: 'Locked',
        isStart: false,
        isGoal: true
      }));

      await dbMonitor.monitorWrite(
        () => Node.insertMany(nodes, { session }),
        'SkillService.createSkillMap - insert nodes'
      );

      await session.commitTransaction();

      await ErrorLoggingService.logSystemEvent('skill_map_created', {
        skillId: skill._id,
        userId,
        contentCount,
        timestamp: new Date().toISOString()
      });

      const nodeObjects = nodes.map((n) => n.toObject());
      return {
        skill: skill.toObject(),
        nodes: nodeObjects
      };
    } catch (error) {
      await session.abortTransaction();
      await ErrorLoggingService.logError(error, {
        userId,
        operation: 'createSkillMap',
        timestamp: new Date().toISOString()
      });
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('createSkillMap', error, { userId });
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Single payload for map screen: skill_map, nodes with session stats, progress.
   */
  async getSkillMapFull(skillId, userId) {
    const [skill, nodes] = await Promise.all([
      this.getSkillById(skillId, userId),
      NodeService.getSkillNodes(skillId, userId)
    ]);

    const completed = nodes.filter((n) => n.status === 'Completed').length;
    const total = nodes.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      skill_map: {
        id: skill._id.toString(),
        title: skill.name,
        description: skill.description || null,
        icon: skill.icon || 'Map',
        goal: skill.goal || '',
        status: skill.status || 'active'
      },
      nodes,
      progress: {
        completed,
        total,
        percent
      }
    };
  }

  /**
   * Update skill details
   * @param {string} skillId - Skill ID
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update (name, description, goal, icon)
   * @returns {Promise<Object>}
   */
  async updateSkill(skillId, userId, updates) {
    if (!skillId) {
      throw new ValidationError('skillId', skillId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Verify ownership
      const skill = await Skill.findOne({ _id: skillId, userId });
      
      if (!skill) {
        const skillExists = await Skill.findById(skillId);
        if (skillExists) {
          throw new PermissionError('Skill', 'update', userId, { skillId });
        }
        throw new NotFoundError('Skill', skillId, { userId });
      }

      // Update fields
      if (updates.name !== undefined) skill.name = updates.name.trim();
      if (updates.description !== undefined) skill.description = updates.description.trim();
      if (updates.goal !== undefined) skill.goal = updates.goal.trim();
      if (updates.icon !== undefined) skill.icon = updates.icon;

      await dbMonitor.monitorWrite(
        () => skill.save(),
        'SkillService.updateSkill - save skill'
      );

      // Invalidate cache
      if (cacheService.isAvailable()) {
        await cacheService.invalidateSkillMap(skillId, userId);
        await cacheService.invalidateUserProgression(userId, 'all_skills');
      }

      await ErrorLoggingService.logSystemEvent('skill_updated', {
        skillId,
        userId,
        updatedFields: Object.keys(updates),
        timestamp: new Date().toISOString()
      });

      return skill.toObject();
    } catch (error) {
      if (error instanceof PermissionError || error instanceof NotFoundError) {
        throw error;
      }
      
      await ErrorLoggingService.logError(error, {
        userId,
        skillId,
        operation: 'updateSkill',
        timestamp: new Date().toISOString()
      });
      
      if (error.name === 'CastError') {
        throw new ValidationError('skillId', skillId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('updateSkill', error, { userId, skillId });
      }
      
      throw error;
    }
  }

  async deleteSkill(skillId, userId) {
    if (!skillId) {
      throw new ValidationError('skillId', skillId, { type: 'required' });
    }
    
    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verify ownership - Permission check
      const skill = await Skill.findOne({ _id: skillId, userId }).session(session);
      
      if (!skill) {
        // Check if skill exists but belongs to another user
        const skillExists = await Skill.findById(skillId).session(session);
        if (skillExists) {
          throw new PermissionError('Skill', 'delete', userId, { skillId });
        }
        throw new NotFoundError('Skill', skillId, { userId });
      }

      // Pre-delete hook: Verify relationships - Requirement 14.2, 14.3
      const nodes = await Node.find({ skillId }).session(session);
      const nodeIds = nodes.map(n => n._id);

      // Check for active sessions linked to these nodes - Referential integrity check
      const activeSessions = await LearningSession.countDocuments({
        nodeId: { $in: nodeIds },
        status: 'active'
      }).session(session);

      if (activeSessions > 0) {
        throw new ReferentialIntegrityError(
          'Skill',
          skillId,
          'LearningSession',
          `Cannot delete skill with ${activeSessions} active session(s). Please end all active sessions first.`,
          { activeSessions, nodeIds: nodeIds.map(id => id.toString()) }
        );
      }

      // Unlink sessions (set nodeId and skillId to null) - maintains referential integrity
      const unlinkResult = await dbMonitor.monitorWrite(
        () => LearningSession.updateMany(
          { nodeId: { $in: nodeIds } },
          { $unset: { nodeId: '', skillId: '' } },
          { session }
        ),
        'SkillService.deleteSkill - unlink sessions'
      );

      // Delete all nodes - cascade delete
      await dbMonitor.monitorWrite(
        () => Node.deleteMany({ skillId }, { session }),
        'SkillService.deleteSkill - delete nodes'
      );

      // Delete skill
      await dbMonitor.monitorWrite(
        () => Skill.deleteOne({ _id: skillId }, { session }),
        'SkillService.deleteSkill - delete skill'
      );

      // Orphan cleanup: Check for any orphaned nodes (shouldn't happen, but defensive) - Requirement 14.3
      const orphanedNodes = await Node.find({
        skillId: { $exists: true }
      }).session(session);

      const validSkillIds = new Set();
      for (const n of orphanedNodes) {
        const skillIdStr = n.skillId.toString();
        if (!validSkillIds.has(skillIdStr)) {
          const skillExists = await Skill.exists({ _id: n.skillId }).session(session);
          if (!skillExists) {
            console.warn(`Found orphaned node ${n._id} with invalid skillId ${n.skillId}`);
            await Node.deleteOne({ _id: n._id }, { session });
            
            // Log orphan cleanup
            await ErrorLoggingService.logSystemEvent('orphan_node_cleaned', {
              nodeId: n._id.toString(),
              skillId: skillIdStr,
              operation: 'deleteSkill',
              timestamp: new Date().toISOString()
            });
          } else {
            validSkillIds.add(skillIdStr);
          }
        }
      }

      await session.commitTransaction();
      
      // Log successful deletion
      await ErrorLoggingService.logSystemEvent('skill_deleted', {
        skillId,
        userId,
        nodesDeleted: nodes.length,
        sessionsUnlinked: unlinkResult.modifiedCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      await session.abortTransaction();
      
      // Log error with context - Requirement 14.5
      await ErrorLoggingService.logError(error, {
        userId,
        skillId,
        operation: 'deleteSkill',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof PermissionError || error instanceof NotFoundError || error instanceof ReferentialIntegrityError) {
        throw error;
      }
      
      if (error.name === 'CastError') {
        throw new ValidationError('skillId', skillId, { type: 'format', format: 'ObjectId' });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('deleteSkill', error, { userId, skillId });
      }
      
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new SkillService();
