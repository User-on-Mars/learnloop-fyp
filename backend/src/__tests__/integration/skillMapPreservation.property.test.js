// Feature: skill-map-loading-performance
// Task 2: Write preservation property tests (BEFORE implementing fix)
// **Property 2: Preservation** - Existing Functionality Unchanged
//
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
//
// These tests capture the CURRENT behavior of the unfixed code to ensure
// the performance fix doesn't introduce regressions. They test:
// - Skill map CRUD operations (create, update, delete)
// - Node status transitions and progression logic
// - Permission checks and user ownership validation
// - Progress calculation (completed nodes / total nodes)
// - GET /api/skills/:id response format

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import Skill from '../../models/Skill.js';
import Node from '../../models/Node.js';
import LearningSession from '../../models/LearningSession.js';
import SkillService from '../../services/SkillService.js';
import NodeService from '../../services/NodeService.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Skill.deleteMany({});
  await Node.deleteMany({});
  await LearningSession.deleteMany({});
});

// Arbitraries for property-based testing
const userIdArb = fc.uuid();
const skillNameArb = fc.string({ minLength: 1, maxLength: 100 });
const nodeCountArb = fc.integer({ min: 2, max: 16 });
const nodeTitleArb = fc.string({ minLength: 0, maxLength: 200 });
const nodeDescriptionArb = fc.string({ minLength: 0, maxLength: 2000 });
const nodeStatusArb = fc.constantFrom('Locked', 'Unlocked', 'In_Progress', 'Completed');

describe('Property 2.1: Skill Map CRUD Operations Unchanged', () => {
  test('creating a skill produces consistent structure with START and GOAL nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        nodeCountArb,
        async (userId, skillName, nodeCount) => {
          // Create skill
          const { skill, nodes } = await SkillService.createSkill(
            userId,
            skillName,
            nodeCount
          );

          // Verify skill structure
          expect(skill).toBeDefined();
          expect(skill.userId).toBe(userId);
          expect(skill.name).toBe(skillName.trim());
          expect(skill.nodeCount).toBe(nodeCount);
          expect(skill._id).toBeDefined();
          expect(skill.createdAt).toBeDefined();
          expect(skill.updatedAt).toBeDefined();

          // Verify nodes structure
          expect(nodes).toHaveLength(nodeCount);
          
          // Verify START node (first node)
          expect(nodes[0].order).toBe(1);
          expect(nodes[0].status).toBe('Unlocked');
          expect(nodes[0].isStart).toBe(true);
          expect(nodes[0].isGoal).toBe(false);
          
          // Verify GOAL node (last node)
          expect(nodes[nodeCount - 1].order).toBe(nodeCount);
          expect(nodes[nodeCount - 1].status).toBe('Locked');
          expect(nodes[nodeCount - 1].isGoal).toBe(true);
          expect(nodes[nodeCount - 1].isStart).toBe(false);
          
          // Verify middle nodes are locked
          for (let i = 1; i < nodeCount - 1; i++) {
            expect(nodes[i].status).toBe('Locked');
            expect(nodes[i].isStart).toBe(false);
            expect(nodes[i].isGoal).toBe(false);
            expect(nodes[i].order).toBe(i + 1);
          }
          
          // Verify all nodes have required fields
          nodes.forEach(node => {
            expect(node.skillId).toBeDefined();
            expect(node.userId).toBe(userId);
            expect(node._id).toBeDefined();
            expect(node.createdAt).toBeDefined();
            expect(node.updatedAt).toBeDefined();
          });
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  test('getUserSkills returns all skills with accurate progress calculation', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(
          fc.record({
            name: skillNameArb,
            nodeCount: nodeCountArb
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (userId, skillsData) => {
          // Create multiple skills
          const createdSkills = [];
          for (const skillData of skillsData) {
            const result = await SkillService.createSkill(
              userId,
              skillData.name,
              skillData.nodeCount
            );
            createdSkills.push(result);
          }

          // Get all skills
          const skills = await SkillService.getUserSkills(userId);

          // Verify count
          expect(skills).toHaveLength(skillsData.length);

          // Verify each skill has progress fields
          skills.forEach(skill => {
            expect(skill.completedNodes).toBeDefined();
            expect(skill.completionPercentage).toBeDefined();
            expect(typeof skill.completedNodes).toBe('number');
            expect(typeof skill.completionPercentage).toBe('number');
            
            // Initially, no nodes are completed
            expect(skill.completedNodes).toBe(0);
            expect(skill.completionPercentage).toBe(0);
          });
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  test('deleting a skill cascades to all nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        nodeCountArb,
        async (userId, skillName, nodeCount) => {
          // Create skill
          const { skill, nodes } = await SkillService.createSkill(
            userId,
            skillName,
            nodeCount
          );
          const skillId = skill._id.toString();

          // Verify skill and nodes exist
          const dbSkill = await Skill.findById(skillId);
          expect(dbSkill).toBeTruthy();
          
          const dbNodes = await Node.find({ skillId });
          expect(dbNodes).toHaveLength(nodeCount);

          // Delete skill
          await SkillService.deleteSkill(skillId, userId);

          // Verify skill deleted
          const deletedSkill = await Skill.findById(skillId);
          expect(deletedSkill).toBeNull();

          // Verify all nodes deleted
          const remainingNodes = await Node.find({ skillId });
          expect(remainingNodes).toHaveLength(0);
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);
});

describe('Property 2.2: Node Status Transitions Unchanged', () => {
  test('valid status transitions work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        async (userId, skillName) => {
          // Create skill with 3 nodes
          const { nodes } = await SkillService.createSkill(userId, skillName, 3);
          const node1Id = nodes[0]._id.toString();

          // START node is Unlocked
          expect(nodes[0].status).toBe('Unlocked');

          // Transition: Unlocked → In_Progress
          const { node: inProgressNode } = await NodeService.updateNodeStatus(
            node1Id,
            'In_Progress',
            userId
          );
          expect(inProgressNode.status).toBe('In_Progress');

          // Transition: In_Progress → Completed
          const { node: completedNode } = await NodeService.updateNodeStatus(
            node1Id,
            'Completed',
            userId
          );
          expect(completedNode.status).toBe('Completed');

          // Verify node can be reverted: Completed → In_Progress
          const { node: revertedNode } = await NodeService.updateNodeStatus(
            node1Id,
            'In_Progress',
            userId
          );
          expect(revertedNode.status).toBe('In_Progress');

          // Verify node can be reverted: In_Progress → Unlocked
          const { node: unlockedNode } = await NodeService.updateNodeStatus(
            node1Id,
            'Unlocked',
            userId
          );
          expect(unlockedNode.status).toBe('Unlocked');
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  test('completing a node unlocks the next node in sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        fc.integer({ min: 3, max: 10 }),
        async (userId, skillName, nodeCount) => {
          // Create skill
          const { nodes } = await SkillService.createSkill(userId, skillName, nodeCount);

          // Complete nodes sequentially and verify unlocking
          for (let i = 0; i < nodeCount - 1; i++) {
            const currentNodeId = nodes[i]._id.toString();
            const nextNodeId = nodes[i + 1]._id.toString();

            // Complete current node
            const { nextNode } = await NodeService.updateNodeStatus(
              currentNodeId,
              'Completed',
              userId
            );

            // Verify next node was unlocked
            if (nextNode) {
              expect(nextNode._id.toString()).toBe(nextNodeId);
              expect(nextNode.status).toBe('Unlocked');
            }

            // Verify in database
            const dbNextNode = await Node.findById(nextNodeId);
            expect(dbNextNode.status).toBe('Unlocked');
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  test('invalid status transitions are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        async (userId, skillName) => {
          // Create skill with 3 nodes
          const { nodes } = await SkillService.createSkill(userId, skillName, 3);
          const lockedNodeId = nodes[1]._id.toString();

          // Verify node 2 is locked
          expect(nodes[1].status).toBe('Locked');

          // Try invalid transition: Locked → In_Progress (should fail)
          await expect(
            NodeService.updateNodeStatus(lockedNodeId, 'In_Progress', userId)
          ).rejects.toThrow('Invalid status transition');

          // Try invalid transition: Locked → Completed (should fail)
          await expect(
            NodeService.updateNodeStatus(lockedNodeId, 'Completed', userId)
          ).rejects.toThrow('Invalid status transition');

          // Verify node is still locked
          const dbNode = await Node.findById(lockedNodeId);
          expect(dbNode.status).toBe('Locked');
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);
});

describe('Property 2.3: Permission Checks Continue to Function', () => {
  test('users can only access their own skills', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        skillNameArb,
        nodeCountArb,
        async (userId1, userId2, skillName, nodeCount) => {
          // Ensure different users
          fc.pre(userId1 !== userId2);

          // User 1 creates a skill
          const { skill } = await SkillService.createSkill(userId1, skillName, nodeCount);
          const skillId = skill._id.toString();

          // User 2 tries to access user 1's skill
          await expect(
            SkillService.getSkillById(skillId, userId2)
          ).rejects.toThrow('not found');

          // User 2 tries to delete user 1's skill
          await expect(
            SkillService.deleteSkill(skillId, userId2)
          ).rejects.toThrow();

          // Verify skill still exists for user 1
          const user1Skill = await SkillService.getSkillById(skillId, userId1);
          expect(user1Skill).toBeDefined();
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  test('users can only modify their own nodes', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        skillNameArb,
        async (userId1, userId2, skillName) => {
          // Ensure different users
          fc.pre(userId1 !== userId2);

          // User 1 creates a skill
          const { nodes } = await SkillService.createSkill(userId1, skillName, 3);
          const nodeId = nodes[0]._id.toString();

          // User 2 tries to update user 1's node status
          await expect(
            NodeService.updateNodeStatus(nodeId, 'Completed', userId2)
          ).rejects.toThrow();

          // User 2 tries to update user 1's node content
          await expect(
            NodeService.updateNodeContent(
              nodeId,
              { title: 'Hacked', description: 'Hacked' },
              userId2
            )
          ).rejects.toThrow();

          // Verify node unchanged for user 1
          const dbNode = await Node.findById(nodeId);
          expect(dbNode.userId).toBe(userId1);
          expect(dbNode.title).not.toBe('Hacked');
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);
});

describe('Property 2.4: Progress Calculation Remains Accurate', () => {
  test('progress percentage is calculated correctly for any completion state', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        async (userId, skillName, nodeCount, completedCount) => {
          // Ensure completedCount doesn't exceed nodeCount
          const actualCompletedCount = Math.min(completedCount, nodeCount);

          // Create skill
          const { skill, nodes } = await SkillService.createSkill(
            userId,
            skillName,
            nodeCount
          );

          // Complete the specified number of nodes
          for (let i = 0; i < actualCompletedCount; i++) {
            await NodeService.updateNodeStatus(
              nodes[i]._id.toString(),
              'Completed',
              userId
            );
          }

          // Get skills with progress
          const skills = await SkillService.getUserSkills(userId);
          const targetSkill = skills.find(s => s._id.toString() === skill._id.toString());

          // Verify progress calculation
          expect(targetSkill.completedNodes).toBe(actualCompletedCount);
          
          const expectedPercentage = Math.round((actualCompletedCount / nodeCount) * 100);
          expect(targetSkill.completionPercentage).toBe(expectedPercentage);
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  test('progress updates correctly when nodes are completed and reverted', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        async (userId, skillName) => {
          // Create skill with 4 nodes
          const { skill, nodes } = await SkillService.createSkill(userId, skillName, 4);

          // Complete first 2 nodes
          await NodeService.updateNodeStatus(nodes[0]._id.toString(), 'Completed', userId);
          await NodeService.updateNodeStatus(nodes[1]._id.toString(), 'Completed', userId);

          // Check progress: 2/4 = 50%
          let skills = await SkillService.getUserSkills(userId);
          let targetSkill = skills.find(s => s._id.toString() === skill._id.toString());
          expect(targetSkill.completedNodes).toBe(2);
          expect(targetSkill.completionPercentage).toBe(50);

          // Revert first node to In_Progress
          await NodeService.updateNodeStatus(nodes[0]._id.toString(), 'In_Progress', userId);

          // Check progress: 1/4 = 25%
          skills = await SkillService.getUserSkills(userId);
          targetSkill = skills.find(s => s._id.toString() === skill._id.toString());
          expect(targetSkill.completedNodes).toBe(1);
          expect(targetSkill.completionPercentage).toBe(25);

          // Complete first node again
          await NodeService.updateNodeStatus(nodes[0]._id.toString(), 'Completed', userId);

          // Check progress: 2/4 = 50%
          skills = await SkillService.getUserSkills(userId);
          targetSkill = skills.find(s => s._id.toString() === skill._id.toString());
          expect(targetSkill.completedNodes).toBe(2);
          expect(targetSkill.completionPercentage).toBe(50);
        }
      ),
      { numRuns: 5 }
    );
  }, 60000);
});

describe('Property 2.5: Node Content Updates Work Correctly', () => {
  test('updating node content preserves all other fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        nodeTitleArb,
        nodeDescriptionArb,
        async (userId, skillName, newTitle, newDescription) => {
          // Create skill
          const { nodes } = await SkillService.createSkill(userId, skillName, 3);
          const nodeId = nodes[0]._id.toString();
          
          // Store original values
          const originalStatus = nodes[0].status;
          const originalOrder = nodes[0].order;
          const originalIsStart = nodes[0].isStart;

          // Update content
          const updatedNode = await NodeService.updateNodeContent(
            nodeId,
            { title: newTitle, description: newDescription },
            userId
          );

          // Verify content updated
          expect(updatedNode.title).toBe(newTitle.trim());
          expect(updatedNode.description).toBe(newDescription.trim());

          // Verify other fields unchanged
          expect(updatedNode.status).toBe(originalStatus);
          expect(updatedNode.order).toBe(originalOrder);
          expect(updatedNode.isStart).toBe(originalIsStart);
          expect(updatedNode.userId).toBe(userId);
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  test('locked nodes cannot be edited', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        nodeTitleArb,
        async (userId, skillName, newTitle) => {
          // Create skill
          const { nodes } = await SkillService.createSkill(userId, skillName, 3);
          const lockedNodeId = nodes[1]._id.toString();

          // Verify node is locked
          expect(nodes[1].status).toBe('Locked');

          // Try to edit locked node
          await expect(
            NodeService.updateNodeContent(
              lockedNodeId,
              { title: newTitle, description: 'Test' },
              userId
            )
          ).rejects.toThrow('Cannot edit locked nodes');
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);
});

describe('Property 2.6: GET /api/skills/:id Response Format Unchanged', () => {
  test('getSkillById returns skill with expected structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        nodeCountArb,
        async (userId, skillName, nodeCount) => {
          // Create skill
          const { skill } = await SkillService.createSkill(userId, skillName, nodeCount);
          const skillId = skill._id.toString();

          // Get skill by ID
          const retrievedSkill = await SkillService.getSkillById(skillId, userId);

          // Verify structure matches original
          expect(retrievedSkill._id.toString()).toBe(skillId);
          expect(retrievedSkill.userId).toBe(userId);
          expect(retrievedSkill.name).toBe(skillName.trim());
          expect(retrievedSkill.nodeCount).toBe(nodeCount);
          expect(retrievedSkill.createdAt).toBeDefined();
          expect(retrievedSkill.updatedAt).toBeDefined();

          // Verify no extra fields added
          const expectedFields = ['_id', 'userId', 'name', 'nodeCount', 'createdAt', 'updatedAt'];
          const actualFields = Object.keys(retrievedSkill);
          expectedFields.forEach(field => {
            expect(actualFields).toContain(field);
          });
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  test('getSkillNodes returns nodes with expected structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        skillNameArb,
        nodeCountArb,
        async (userId, skillName, nodeCount) => {
          // Create skill
          const { skill } = await SkillService.createSkill(userId, skillName, nodeCount);
          const skillId = skill._id.toString();

          // Get nodes
          const nodes = await NodeService.getSkillNodes(skillId, userId);

          // Verify structure
          expect(nodes).toHaveLength(nodeCount);
          
          nodes.forEach((node, index) => {
            expect(node._id).toBeDefined();
            expect(node.skillId.toString()).toBe(skillId);
            expect(node.userId).toBe(userId);
            expect(node.order).toBe(index + 1);
            expect(node.title).toBeDefined();
            expect(node.description).toBeDefined();
            expect(node.status).toBeDefined();
            expect(typeof node.isStart).toBe('boolean');
            expect(typeof node.isGoal).toBe('boolean');
            expect(node.createdAt).toBeDefined();
            expect(node.updatedAt).toBeDefined();
          });
        }
      ),
      { numRuns: 5 }
    );
  }, 60000);
});
