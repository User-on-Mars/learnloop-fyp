/**
 * Comprehensive Error Handling Tests for Skill Map Services
 * 
 * Tests Requirements: 1.9, 1.10, 9.6, 9.7, 11.5, 14.4, 14.5
 * 
 * This test suite verifies:
 * - Validation error responses
 * - State transition error responses
 * - Referential integrity checks
 * - Permission checks
 * - Error logging with context
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import SkillService from '../SkillService.js';
import NodeService from '../NodeService.js';
import SessionLinkingService from '../SessionLinkingService.js';
import Skill from '../../models/Skill.js';
import Node from '../../models/Node.js';
import LearningSession from '../../models/LearningSession.js';
import {
  ValidationError,
  StateTransitionError,
  NotFoundError,
  PermissionError,
  ReferentialIntegrityError,
  DatabaseError,
  ConflictError
} from '../../utils/errors.js';
import ErrorLoggingService from '../ErrorLoggingService.js';

describe('Skill Map Error Handling', () => {
  const testUserId = 'test-user-123';
  const otherUserId = 'other-user-456';
  let testSkillId;
  let testNodeId;

  beforeEach(async () => {
    // Clear test data
    await Skill.deleteMany({});
    await Node.deleteMany({});
    await LearningSession.deleteMany({});
    
    // Create test skill and nodes
    const result = await SkillService.createSkill(testUserId, 'Test Skill', 3);
    testSkillId = result.skill._id.toString();
    testNodeId = result.nodes[0]._id.toString();
  });

  afterEach(async () => {
    // Clean up
    await Skill.deleteMany({});
    await Node.deleteMany({});
    await LearningSession.deleteMany({});
  });

  describe('Validation Error Responses - Requirements 1.9, 1.10, 9.6, 9.7', () => {
    
    it('should throw ValidationError for skill name too short', async () => {
      await expect(
        SkillService.createSkill(testUserId, '', 5)
      ).rejects.toThrow(ValidationError);
      
      try {
        await SkillService.createSkill(testUserId, '', 5);
      } catch (error) {
        expect(error.field).toBe('name');
        expect(error.constraint.type).toBe('minLength');
        expect(error.statusCode).toBe(400);
      }
    });

    it('should throw ValidationError for skill name too long', async () => {
      const longName = 'a'.repeat(101);
      
      await expect(
        SkillService.createSkill(testUserId, longName, 5)
      ).rejects.toThrow(ValidationError);
      
      try {
        await SkillService.createSkill(testUserId, longName, 5);
      } catch (error) {
        expect(error.field).toBe('name');
        expect(error.constraint.type).toBe('maxLength');
        expect(error.constraint.max).toBe(100);
      }
    });

    it('should throw ValidationError for node count too low', async () => {
      await expect(
        SkillService.createSkill(testUserId, 'Valid Name', 1)
      ).rejects.toThrow(ValidationError);
      
      try {
        await SkillService.createSkill(testUserId, 'Valid Name', 1);
      } catch (error) {
        expect(error.field).toBe('nodeCount');
        expect(error.constraint.type).toBe('range');
        expect(error.constraint.min).toBe(2);
      }
    });

    it('should throw ValidationError for node count too high', async () => {
      await expect(
        SkillService.createSkill(testUserId, 'Valid Name', 17)
      ).rejects.toThrow(ValidationError);
      
      try {
        await SkillService.createSkill(testUserId, 'Valid Name', 17);
      } catch (error) {
        expect(error.field).toBe('nodeCount');
        expect(error.constraint.max).toBe(16);
      }
    });

    it('should throw ValidationError for node title too long', async () => {
      const longTitle = 'a'.repeat(201);
      
      await expect(
        NodeService.updateNodeContent(testNodeId, { title: longTitle }, testUserId)
      ).rejects.toThrow(ValidationError);
      
      try {
        await NodeService.updateNodeContent(testNodeId, { title: longTitle }, testUserId);
      } catch (error) {
        expect(error.field).toBe('title');
        expect(error.constraint.type).toBe('maxLength');
        expect(error.constraint.max).toBe(200);
      }
    });

    it('should throw ValidationError for node description too long', async () => {
      const longDescription = 'a'.repeat(2001);
      
      await expect(
        NodeService.updateNodeContent(testNodeId, { description: longDescription }, testUserId)
      ).rejects.toThrow(ValidationError);
      
      try {
        await NodeService.updateNodeContent(testNodeId, { description: longDescription }, testUserId);
      } catch (error) {
        expect(error.field).toBe('description');
        expect(error.constraint.max).toBe(2000);
      }
    });

    it('should throw ValidationError for invalid status value', async () => {
      await expect(
        NodeService.updateNodeStatus(testNodeId, 'InvalidStatus', testUserId)
      ).rejects.toThrow(ValidationError);
      
      try {
        await NodeService.updateNodeStatus(testNodeId, 'InvalidStatus', testUserId);
      } catch (error) {
        expect(error.field).toBe('newStatus');
        expect(error.constraint.type).toBe('enum');
      }
    });
  });

  describe('State Transition Error Responses - Requirements 5.5, 5.6, 5.7, 5.8', () => {
    
    it('should throw StateTransitionError for invalid status transition', async () => {
      // Try to transition from Unlocked directly to Locked (invalid)
      await expect(
        NodeService.updateNodeStatus(testNodeId, 'Locked', testUserId)
      ).rejects.toThrow(StateTransitionError);
      
      try {
        await NodeService.updateNodeStatus(testNodeId, 'Locked', testUserId);
      } catch (error) {
        expect(error.currentState).toBe('Unlocked');
        expect(error.newState).toBe('Locked');
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Cannot transition');
      }
    });

    it('should throw StateTransitionError when trying to edit locked node', async () => {
      // Get a locked node (second node)
      const nodes = await Node.find({ skillId: testSkillId }).sort({ order: 1 });
      const lockedNodeId = nodes[1]._id.toString();
      
      await expect(
        NodeService.updateNodeContent(lockedNodeId, { title: 'New Title' }, testUserId)
      ).rejects.toThrow(StateTransitionError);
      
      try {
        await NodeService.updateNodeContent(lockedNodeId, { title: 'New Title' }, testUserId);
      } catch (error) {
        expect(error.currentState).toBe('Locked');
        expect(error.message).toContain('Cannot edit locked nodes');
      }
    });

    it('should throw StateTransitionError when starting session on locked node', async () => {
      // Get a locked node
      const nodes = await Node.find({ skillId: testSkillId }).sort({ order: 1 });
      const lockedNodeId = nodes[1]._id.toString();
      
      await expect(
        SessionLinkingService.createSessionForNode(lockedNodeId, testUserId)
      ).rejects.toThrow(StateTransitionError);
      
      try {
        await SessionLinkingService.createSessionForNode(lockedNodeId, testUserId);
      } catch (error) {
        expect(error.currentState).toBe('Locked');
        expect(error.newState).toBe('session_active');
        expect(error.message).toContain('Cannot start session for locked node');
      }
    });
  });

  describe('Referential Integrity Checks - Requirements 14.2, 14.3', () => {
    
    it('should throw ReferentialIntegrityError when deleting node with sessions', async () => {
      // Create a session linked to the node
      await SessionLinkingService.createSessionForNode(testNodeId, testUserId);
      
      await expect(
        NodeService.deleteNode(testNodeId, testUserId)
      ).rejects.toThrow(ReferentialIntegrityError);
      
      try {
        await NodeService.deleteNode(testNodeId, testUserId);
      } catch (error) {
        expect(error.entity).toBe('Node');
        expect(error.relatedEntity).toBe('LearningSession');
        expect(error.statusCode).toBe(409);
        expect(error.message).toContain('linked session');
      }
    });

    it('should throw ReferentialIntegrityError when deleting skill with active sessions', async () => {
      // Create an active session
      await SessionLinkingService.createSessionForNode(testNodeId, testUserId);
      
      await expect(
        SkillService.deleteSkill(testSkillId, testUserId)
      ).rejects.toThrow(ReferentialIntegrityError);
      
      try {
        await SkillService.deleteSkill(testSkillId, testUserId);
      } catch (error) {
        expect(error.entity).toBe('Skill');
        expect(error.relatedEntity).toBe('LearningSession');
        expect(error.message).toContain('active session');
      }
    });

    it('should maintain referential integrity when deleting skill', async () => {
      // Create and end a session
      const session = await SessionLinkingService.createSessionForNode(testNodeId, testUserId);
      await LearningSession.updateOne(
        { _id: session.session._id },
        { status: 'completed', endTime: new Date() }
      );
      
      // Delete skill
      await SkillService.deleteSkill(testSkillId, testUserId);
      
      // Verify session still exists but nodeId is unlinked
      const updatedSession = await LearningSession.findById(session.session._id);
      expect(updatedSession).toBeTruthy();
      expect(updatedSession.nodeId).toBeUndefined();
      expect(updatedSession.skillId).toBeUndefined();
    });

    it('should verify skill exists when getting nodes', async () => {
      const fakeSkillId = new mongoose.Types.ObjectId().toString();
      
      await expect(
        NodeService.getSkillNodes(fakeSkillId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Permission Checks', () => {
    
    it('should throw PermissionError when accessing another user\'s skill', async () => {
      await expect(
        SkillService.getSkillById(testSkillId, otherUserId)
      ).rejects.toThrow(PermissionError);
      
      try {
        await SkillService.getSkillById(testSkillId, otherUserId);
      } catch (error) {
        expect(error.resource).toBe('Skill');
        expect(error.action).toBe('delete');
        expect(error.userId).toBe(otherUserId);
        expect(error.statusCode).toBe(403);
      }
    });

    it('should throw PermissionError when deleting another user\'s skill', async () => {
      await expect(
        SkillService.deleteSkill(testSkillId, otherUserId)
      ).rejects.toThrow(PermissionError);
    });

    it('should throw PermissionError when updating another user\'s node', async () => {
      await expect(
        NodeService.updateNodeStatus(testNodeId, 'In_Progress', otherUserId)
      ).rejects.toThrow(PermissionError);
    });

    it('should throw PermissionError when viewing another user\'s node details', async () => {
      await expect(
        NodeService.getNodeDetails(testNodeId, otherUserId)
      ).rejects.toThrow(PermissionError);
    });

    it('should throw PermissionError when creating session for another user\'s node', async () => {
      await expect(
        SessionLinkingService.createSessionForNode(testNodeId, otherUserId)
      ).rejects.toThrow(PermissionError);
    });
  });

  describe('Error Logging with Context - Requirements 14.4, 14.5', () => {
    
    beforeEach(() => {
      // Spy on error logging
      jest.spyOn(ErrorLoggingService, 'logError');
      jest.spyOn(ErrorLoggingService, 'logSystemEvent');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log errors with context when skill creation fails', async () => {
      try {
        await SkillService.createSkill(testUserId, '', 5);
      } catch (error) {
        // Error should be logged
        expect(ErrorLoggingService.logError).toHaveBeenCalledWith(
          expect.any(ValidationError),
          expect.objectContaining({
            userId: testUserId,
            operation: 'createSkill',
            name: '',
            nodeCount: 5
          })
        );
      }
    });

    it('should log errors with context when node update fails', async () => {
      try {
        await NodeService.updateNodeStatus(testNodeId, 'InvalidStatus', testUserId);
      } catch (error) {
        expect(ErrorLoggingService.logError).toHaveBeenCalledWith(
          expect.any(ValidationError),
          expect.objectContaining({
            userId: testUserId,
            nodeId: testNodeId,
            operation: 'updateNodeStatus'
          })
        );
      }
    });

    it('should log system events on successful operations', async () => {
      await SkillService.createSkill(testUserId, 'New Skill', 4);
      
      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'skill_created',
        expect.objectContaining({
          userId: testUserId,
          nodeCount: 4
        })
      );
    });

    it('should log system events when node status changes', async () => {
      await NodeService.updateNodeStatus(testNodeId, 'In_Progress', testUserId);
      
      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'node_status_updated',
        expect.objectContaining({
          nodeId: testNodeId,
          userId: testUserId,
          newStatus: 'In_Progress'
        })
      );
    });

    it('should include timestamp in error context', async () => {
      try {
        await SkillService.createSkill(testUserId, '', 5);
      } catch (error) {
        const logCall = ErrorLoggingService.logError.mock.calls[0];
        expect(logCall[1]).toHaveProperty('timestamp');
        expect(logCall[1].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });
  });

  describe('Conflict Error Responses', () => {
    
    it('should throw ConflictError when deleting START node', async () => {
      await expect(
        NodeService.deleteNode(testNodeId, testUserId)
      ).rejects.toThrow(ConflictError);
      
      try {
        await NodeService.deleteNode(testNodeId, testUserId);
      } catch (error) {
        expect(error.resource).toBe('Node');
        expect(error.message).toContain('Cannot delete START node');
        expect(error.statusCode).toBe(409);
      }
    });

    it('should throw ConflictError when deleting GOAL node', async () => {
      const nodes = await Node.find({ skillId: testSkillId }).sort({ order: 1 });
      const goalNode = nodes[nodes.length - 1];
      
      await expect(
        NodeService.deleteNode(goalNode._id.toString(), testUserId)
      ).rejects.toThrow(ConflictError);
      
      try {
        await NodeService.deleteNode(goalNode._id.toString(), testUserId);
      } catch (error) {
        expect(error.message).toContain('Cannot delete GOAL node');
      }
    });

    it('should throw ConflictError when creating duplicate active session', async () => {
      // Create first session
      await SessionLinkingService.createSessionForNode(testNodeId, testUserId);
      
      // Try to create another active session for same node
      await expect(
        SessionLinkingService.createSessionForNode(testNodeId, testUserId)
      ).rejects.toThrow(ConflictError);
      
      try {
        await SessionLinkingService.createSessionForNode(testNodeId, testUserId);
      } catch (error) {
        expect(error.resource).toBe('Session');
        expect(error.message).toContain('already has an active session');
      }
    });
  });

  describe('Error Response Format', () => {
    
    it('should return structured error with all required fields', async () => {
      try {
        await SkillService.createSkill(testUserId, '', 5);
      } catch (error) {
        expect(error).toHaveProperty('name');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('statusCode');
        expect(error).toHaveProperty('context');
        expect(error).toHaveProperty('timestamp');
      }
    });

    it('should include field information in validation errors', async () => {
      try {
        await SkillService.createSkill(testUserId, '', 5);
      } catch (error) {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('constraint');
        expect(error.field).toBe('name');
      }
    });

    it('should include state information in transition errors', async () => {
      try {
        await NodeService.updateNodeStatus(testNodeId, 'Locked', testUserId);
      } catch (error) {
        expect(error).toHaveProperty('currentState');
        expect(error).toHaveProperty('newState');
        expect(error).toHaveProperty('reason');
      }
    });
  });

  describe('Database Error Handling', () => {
    
    it('should wrap MongoDB errors in DatabaseError', async () => {
      // Mock a database error
      const originalSave = Skill.prototype.save;
      Skill.prototype.save = jest.fn().mockRejectedValue(
        new Error('MongoNetworkError: Connection failed')
      );
      
      try {
        await SkillService.createSkill(testUserId, 'Test', 5);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.operation).toBe('createSkill');
        expect(error.statusCode).toBe(503);
      } finally {
        Skill.prototype.save = originalSave;
      }
    });
  });
});
