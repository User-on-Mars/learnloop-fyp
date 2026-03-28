// Feature: skill-map-progression
// Task 16.3: Complete user workflow integration tests
// Tests complete workflows: skill creation → node editing → session start → completion → reflection

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Skill from '../../models/Skill.js';
import Node from '../../models/Node.js';
import LearningSession from '../../models/LearningSession.js';
import Reflection from '../../models/Reflection.js';
import SkillService from '../../services/SkillService.js';
import NodeService from '../../services/NodeService.js';
import SessionLinkingService from '../../services/SessionLinkingService.js';
import { createReflection } from '../../controllers/reflectionController.js';

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
  await Reflection.deleteMany({});
});

describe('16.3.1 Complete skill creation → node editing → session start → completion → reflection workflow', () => {
  test('should complete full workflow from skill creation to reflection', async () => {
    const userId = 'test-user-workflow-1';
    
    // Step 1: Create skill with nodes
    console.log('Step 1: Creating skill with 4 nodes');
    const { skill, nodes } = await SkillService.createSkill(userId, 'Learn TypeScript', 4);
    
    expect(skill).toBeDefined();
    expect(skill.name).toBe('Learn TypeScript');
    expect(skill.nodeCount).toBe(4);
    expect(nodes).toHaveLength(4);
    
    // Verify START node is unlocked
    expect(nodes[0].status).toBe('Unlocked');
    expect(nodes[0].isStart).toBe(true);
    expect(nodes[0].order).toBe(1);
    
    // Verify other nodes are locked
    expect(nodes[1].status).toBe('Locked');
    expect(nodes[2].status).toBe('Locked');
    
    // Verify GOAL node
    expect(nodes[3].status).toBe('Locked');
    expect(nodes[3].isGoal).toBe(true);
    expect(nodes[3].order).toBe(4);
    
    const startNodeId = nodes[0]._id.toString();
    const node2Id = nodes[1]._id.toString();
    
    // Step 2: Edit START node content
    console.log('Step 2: Editing START node content');
    const updatedNode = await NodeService.updateNodeContent(
      startNodeId,
      {
        title: 'Introduction to TypeScript',
        description: 'Learn the basics of TypeScript syntax and type system'
      },
      userId
    );
    
    expect(updatedNode.title).toBe('Introduction to TypeScript');
    expect(updatedNode.description).toBe('Learn the basics of TypeScript syntax and type system');
    expect(updatedNode.status).toBe('Unlocked');
    
    // Step 3: Start practice session from START node
    console.log('Step 3: Starting practice session from START node');
    const { session: session1, nodeStatusUpdated } = await SessionLinkingService.createSessionForNode(
      startNodeId,
      userId
    );
    
    expect(session1).toBeDefined();
    expect(session1.nodeId.toString()).toBe(startNodeId);
    expect(session1.skillId.toString()).toBe(skill._id.toString());
    expect(session1.status).toBe('active');
    expect(nodeStatusUpdated).toBe(true); // Should change from Unlocked to In_Progress
    
    // Verify node status changed to In_Progress
    const nodeAfterSessionStart = await Node.findById(startNodeId);
    expect(nodeAfterSessionStart.status).toBe('In_Progress');
    
    // Step 4: Complete the session
    console.log('Step 4: Completing the session');
    session1.status = 'completed';
    session1.endTime = new Date();
    session1.duration = 1800; // 30 minutes
    session1.reflection = {
      understanding: 4,
      difficulty: 2,
      notes: 'Great introduction to TypeScript basics',
      completionConfidence: 4,
      wouldRecommend: true,
      tags: ['typescript', 'basics']
    };
    await session1.save();
    
    // Step 5: Add reflection linked to session and node
    console.log('Step 5: Adding reflection');
    const reflection = await createReflection(userId, {
      content: 'I learned about type annotations and interfaces. The syntax is similar to JavaScript but with added type safety.',
      mood: 'Happy',
      tags: ['typescript', 'learning', 'progress']
    });
    
    // Link reflection to session (in real app, this would be done automatically)
    reflection.sessionId = session1._id;
    await reflection.save();
    
    expect(reflection.content).toContain('type annotations');
    expect(reflection.mood).toBe('Happy');
    expect(reflection.sessionId.toString()).toBe(session1._id.toString());
    
    // Step 6: Mark START node as completed
    console.log('Step 6: Marking START node as completed');
    const { node: completedNode, nextNode } = await NodeService.updateNodeStatus(
      startNodeId,
      'Completed',
      userId
    );
    
    expect(completedNode.status).toBe('Completed');
    expect(nextNode).toBeDefined();
    expect(nextNode.status).toBe('Unlocked'); // Node 2 should be unlocked
    expect(nextNode._id.toString()).toBe(node2Id);
    
    // Step 7: Verify node details show linked content
    console.log('Step 7: Verifying node details');
    const nodeDetails = await NodeService.getNodeDetails(startNodeId, userId);
    
    expect(nodeDetails.node.title).toBe('Introduction to TypeScript');
    expect(nodeDetails.sessions).toHaveLength(1);
    expect(nodeDetails.sessions[0]._id.toString()).toBe(session1._id.toString());
    expect(nodeDetails.sessions[0].duration).toBe(1800);
    expect(nodeDetails.reflections).toHaveLength(1);
    expect(nodeDetails.reflections[0].content).toContain('type annotations');
    
    // Step 8: Verify skill progress updated
    console.log('Step 8: Verifying skill progress');
    const skills = await SkillService.getUserSkills(userId);
    
    expect(skills).toHaveLength(1);
    expect(skills[0].completedNodes).toBe(1);
    expect(skills[0].completionPercentage).toBe(25); // 1 of 4 nodes completed
    
    console.log('✅ Complete workflow test passed');
  });

  test('should handle multiple nodes progression with sessions and reflections', async () => {
    const userId = 'test-user-workflow-2';
    
    // Create skill
    const { skill, nodes } = await SkillService.createSkill(userId, 'Master React Hooks', 3);
    
    const node1Id = nodes[0]._id.toString();
    const node2Id = nodes[1]._id.toString();
    const node3Id = nodes[2]._id.toString();
    
    // Complete Node 1
    await SessionLinkingService.createSessionForNode(node1Id, userId);
    await NodeService.updateNodeStatus(node1Id, 'Completed', userId);
    
    // Node 2 should be unlocked
    const node2 = await Node.findById(node2Id);
    expect(node2.status).toBe('Unlocked');
    
    // Start and complete Node 2
    const { session: session2 } = await SessionLinkingService.createSessionForNode(node2Id, userId);
    session2.status = 'completed';
    session2.endTime = new Date();
    session2.duration = 2400;
    session2.reflection = {
      understanding: 5,
      difficulty: 3,
      notes: 'useState and useEffect are powerful',
      completionConfidence: 5,
      wouldRecommend: true
    };
    await session2.save();
    
    await NodeService.updateNodeStatus(node2Id, 'Completed', userId);
    
    // Node 3 (GOAL) should be unlocked
    const node3 = await Node.findById(node3Id);
    expect(node3.status).toBe('Unlocked');
    expect(node3.isGoal).toBe(true);
    
    // Verify progress
    const skills = await SkillService.getUserSkills(userId);
    expect(skills[0].completedNodes).toBe(2);
    expect(skills[0].completionPercentage).toBe(67); // 2 of 3 nodes
  });
});

describe('16.3.2 Node status transitions and unlocking workflow', () => {
  test('should unlock nodes sequentially as previous nodes are completed', async () => {
    const userId = 'test-user-transitions-1';
    
    // Create skill with 5 nodes
    const { skill, nodes } = await SkillService.createSkill(userId, 'Learn Python', 5);
    
    // Initially only START is unlocked
    expect(nodes[0].status).toBe('Unlocked');
    expect(nodes[1].status).toBe('Locked');
    expect(nodes[2].status).toBe('Locked');
    expect(nodes[3].status).toBe('Locked');
    expect(nodes[4].status).toBe('Locked');
    
    // Complete Node 1 → Node 2 unlocks
    await NodeService.updateNodeStatus(nodes[0]._id.toString(), 'Completed', userId);
    let node2 = await Node.findById(nodes[1]._id);
    expect(node2.status).toBe('Unlocked');
    
    // Complete Node 2 → Node 3 unlocks
    await NodeService.updateNodeStatus(nodes[1]._id.toString(), 'Completed', userId);
    let node3 = await Node.findById(nodes[2]._id);
    expect(node3.status).toBe('Unlocked');
    
    // Complete Node 3 → Node 4 unlocks
    await NodeService.updateNodeStatus(nodes[2]._id.toString(), 'Completed', userId);
    let node4 = await Node.findById(nodes[3]._id);
    expect(node4.status).toBe('Unlocked');
    
    // Complete Node 4 → Node 5 (GOAL) unlocks
    await NodeService.updateNodeStatus(nodes[3]._id.toString(), 'Completed', userId);
    let node5 = await Node.findById(nodes[4]._id);
    expect(node5.status).toBe('Unlocked');
    expect(node5.isGoal).toBe(true);
    
    // Complete GOAL node
    await NodeService.updateNodeStatus(nodes[4]._id.toString(), 'Completed', userId);
    node5 = await Node.findById(nodes[4]._id);
    expect(node5.status).toBe('Completed');
    
    // Verify all nodes completed
    const allNodes = await Node.find({ skillId: skill._id });
    const allCompleted = allNodes.every(n => n.status === 'Completed');
    expect(allCompleted).toBe(true);
  });

  test('should handle status transitions: Unlocked → In_Progress → Completed', async () => {
    const userId = 'test-user-transitions-2';
    
    const { nodes } = await SkillService.createSkill(userId, 'Test Skill', 3);
    const node1Id = nodes[0]._id.toString();
    
    // START node is Unlocked
    expect(nodes[0].status).toBe('Unlocked');
    
    // Transition to In_Progress
    await NodeService.updateNodeStatus(node1Id, 'In_Progress', userId);
    let node1 = await Node.findById(node1Id);
    expect(node1.status).toBe('In_Progress');
    
    // Transition to Completed
    await NodeService.updateNodeStatus(node1Id, 'Completed', userId);
    node1 = await Node.findById(node1Id);
    expect(node1.status).toBe('Completed');
  });

  test('should allow reverting Completed → In_Progress → Unlocked', async () => {
    const userId = 'test-user-transitions-3';
    
    const { nodes } = await SkillService.createSkill(userId, 'Test Skill', 2);
    const node1Id = nodes[0]._id.toString();
    
    // Complete the node
    await NodeService.updateNodeStatus(node1Id, 'Completed', userId);
    
    // Revert to In_Progress
    await NodeService.updateNodeStatus(node1Id, 'In_Progress', userId);
    let node1 = await Node.findById(node1Id);
    expect(node1.status).toBe('In_Progress');
    
    // Revert to Unlocked
    await NodeService.updateNodeStatus(node1Id, 'Unlocked', userId);
    node1 = await Node.findById(node1Id);
    expect(node1.status).toBe('Unlocked');
  });

  test('should prevent invalid status transitions', async () => {
    const userId = 'test-user-transitions-4';
    
    const { nodes } = await SkillService.createSkill(userId, 'Test Skill', 3);
    const node2Id = nodes[1]._id.toString();
    
    // Node 2 is Locked, cannot transition to In_Progress
    await expect(
      NodeService.updateNodeStatus(node2Id, 'In_Progress', userId)
    ).rejects.toThrow('Invalid status transition');
    
    // Node 2 is Locked, cannot transition to Completed
    await expect(
      NodeService.updateNodeStatus(node2Id, 'Completed', userId)
    ).rejects.toThrow('Invalid status transition');
  });
});

describe('16.3.3 Skill deletion with cascade workflow', () => {
  test('should delete skill and cascade to all nodes', async () => {
    const userId = 'test-user-delete-1';
    
    // Create skill with nodes
    const { skill, nodes } = await SkillService.createSkill(userId, 'Skill to Delete', 4);
    const skillId = skill._id.toString();
    
    // Verify skill and nodes exist
    let dbSkill = await Skill.findById(skillId);
    expect(dbSkill).toBeTruthy();
    
    let dbNodes = await Node.find({ skillId });
    expect(dbNodes).toHaveLength(4);
    
    // Delete skill
    await SkillService.deleteSkill(skillId, userId);
    
    // Verify skill deleted
    dbSkill = await Skill.findById(skillId);
    expect(dbSkill).toBeNull();
    
    // Verify all nodes deleted
    dbNodes = await Node.find({ skillId });
    expect(dbNodes).toHaveLength(0);
  });

  test('should unlink sessions but preserve them when skill is deleted', async () => {
    const userId = 'test-user-delete-2';
    
    // Create skill and start sessions
    const { skill, nodes } = await SkillService.createSkill(userId, 'Skill with Sessions', 3);
    const skillId = skill._id.toString();
    const node1Id = nodes[0]._id.toString();
    
    // Create sessions for node 1
    const { session: session1 } = await SessionLinkingService.createSessionForNode(node1Id, userId);
    const sessionId = session1._id.toString();
    
    // Verify session is linked
    let dbSession = await LearningSession.findById(sessionId);
    expect(dbSession.nodeId.toString()).toBe(node1Id);
    expect(dbSession.skillId.toString()).toBe(skillId);
    
    // Delete skill
    await SkillService.deleteSkill(skillId, userId);
    
    // Verify session still exists but nodeId and skillId are unlinked
    dbSession = await LearningSession.findById(sessionId);
    expect(dbSession).toBeTruthy();
    expect(dbSession.nodeId).toBeUndefined();
    expect(dbSession.skillId).toBeUndefined();
  });

  test('should preserve reflections when skill is deleted', async () => {
    const userId = 'test-user-delete-3';
    
    // Create skill and session
    const { skill, nodes } = await SkillService.createSkill(userId, 'Skill with Reflections', 2);
    const skillId = skill._id.toString();
    const node1Id = nodes[0]._id.toString();
    
    const { session } = await SessionLinkingService.createSessionForNode(node1Id, userId);
    
    // Create reflection
    const reflection = await createReflection(userId, {
      content: 'Important learning reflection',
      mood: 'Thoughtful',
      tags: ['learning']
    });
    const reflectionId = reflection._id.toString();
    
    // Delete skill
    await SkillService.deleteSkill(skillId, userId);
    
    // Verify reflection still exists
    const dbReflection = await Reflection.findById(reflectionId);
    expect(dbReflection).toBeTruthy();
    expect(dbReflection.content).toBe('Important learning reflection');
  });

  test('should not delete skill with active sessions', async () => {
    const userId = 'test-user-delete-4';
    
    // Create skill and active session
    const { skill, nodes } = await SkillService.createSkill(userId, 'Skill with Active Session', 2);
    const skillId = skill._id.toString();
    const node1Id = nodes[0]._id.toString();
    
    await SessionLinkingService.createSessionForNode(node1Id, userId);
    
    // Try to delete skill with active session
    await expect(
      SkillService.deleteSkill(skillId, userId)
    ).rejects.toThrow('active session');
    
    // Verify skill still exists
    const dbSkill = await Skill.findById(skillId);
    expect(dbSkill).toBeTruthy();
  });
});

describe('16.3.4 Node deletion with validation workflow', () => {
  test('should delete node with no sessions and recalculate order', async () => {
    const userId = 'test-user-node-delete-1';
    
    // Create skill with 5 nodes
    const { skill, nodes } = await SkillService.createSkill(userId, 'Skill for Node Deletion', 5);
    const node3Id = nodes[2]._id.toString(); // Middle node
    
    // Verify initial order
    expect(nodes[0].order).toBe(1);
    expect(nodes[1].order).toBe(2);
    expect(nodes[2].order).toBe(3);
    expect(nodes[3].order).toBe(4);
    expect(nodes[4].order).toBe(5);
    
    // Delete node 3 (no sessions)
    await NodeService.deleteNode(node3Id, userId);
    
    // Verify node deleted
    const deletedNode = await Node.findById(node3Id);
    expect(deletedNode).toBeNull();
    
    // Verify remaining nodes have recalculated order
    const remainingNodes = await Node.find({ skillId: skill._id }).sort({ order: 1 });
    expect(remainingNodes).toHaveLength(4);
    expect(remainingNodes[0].order).toBe(1);
    expect(remainingNodes[1].order).toBe(2);
    expect(remainingNodes[2].order).toBe(3); // Was node 4
    expect(remainingNodes[3].order).toBe(4); // Was node 5
    
    // Verify skill nodeCount updated
    const updatedSkill = await Skill.findById(skill._id);
    expect(updatedSkill.nodeCount).toBe(4);
  });

  test('should prevent deletion of node with linked sessions', async () => {
    const userId = 'test-user-node-delete-2';
    
    // Create skill and session
    const { nodes } = await SkillService.createSkill(userId, 'Skill with Session', 3);
    const node1Id = nodes[0]._id.toString();
    
    // Create session for node 1
    await SessionLinkingService.createSessionForNode(node1Id, userId);
    
    // Try to delete node with session
    await expect(
      NodeService.deleteNode(node1Id, userId)
    ).rejects.toThrow('linked session');
    
    // Verify node still exists
    const dbNode = await Node.findById(node1Id);
    expect(dbNode).toBeTruthy();
  });

  test('should prevent deletion of START node', async () => {
    const userId = 'test-user-node-delete-3';
    
    const { nodes } = await SkillService.createSkill(userId, 'Test Skill', 3);
    const startNodeId = nodes[0]._id.toString();
    
    // Try to delete START node
    await expect(
      NodeService.deleteNode(startNodeId, userId)
    ).rejects.toThrow('Cannot delete START node');
    
    // Verify START node still exists
    const dbNode = await Node.findById(startNodeId);
    expect(dbNode).toBeTruthy();
    expect(dbNode.isStart).toBe(true);
  });

  test('should prevent deletion of GOAL node', async () => {
    const userId = 'test-user-node-delete-4';
    
    const { nodes } = await SkillService.createSkill(userId, 'Test Skill', 3);
    const goalNodeId = nodes[2]._id.toString();
    
    // Try to delete GOAL node
    await expect(
      NodeService.deleteNode(goalNodeId, userId)
    ).rejects.toThrow('Cannot delete GOAL node');
    
    // Verify GOAL node still exists
    const dbNode = await Node.findById(goalNodeId);
    expect(dbNode).toBeTruthy();
    expect(dbNode.isGoal).toBe(true);
  });

  test('should prevent deletion if it would result in fewer than 2 nodes', async () => {
    const userId = 'test-user-node-delete-5';
    
    // Create skill with minimum 2 nodes
    const { nodes } = await SkillService.createSkill(userId, 'Minimal Skill', 2);
    const node1Id = nodes[0]._id.toString();
    
    // Try to delete any node (would leave only 1 node)
    await expect(
      NodeService.deleteNode(node1Id, userId)
    ).rejects.toThrow('must have at least 2 nodes');
  });
});

describe('16.3.5 Complex multi-skill workflow', () => {
  test('should handle multiple skills with independent progression', async () => {
    const userId = 'test-user-multi-skill';
    
    // Create two skills
    const { skill: skill1, nodes: nodes1 } = await SkillService.createSkill(
      userId,
      'JavaScript Fundamentals',
      3
    );
    const { skill: skill2, nodes: nodes2 } = await SkillService.createSkill(
      userId,
      'CSS Mastery',
      4
    );
    
    // Progress in skill 1
    await NodeService.updateNodeStatus(nodes1[0]._id.toString(), 'Completed', userId);
    await NodeService.updateNodeStatus(nodes1[1]._id.toString(), 'Completed', userId);
    
    // Progress in skill 2
    await NodeService.updateNodeStatus(nodes2[0]._id.toString(), 'Completed', userId);
    
    // Verify independent progress
    const skills = await SkillService.getUserSkills(userId);
    expect(skills).toHaveLength(2);
    
    const jsSkill = skills.find(s => s.name === 'JavaScript Fundamentals');
    const cssSkill = skills.find(s => s.name === 'CSS Mastery');
    
    expect(jsSkill.completedNodes).toBe(2);
    expect(jsSkill.completionPercentage).toBe(67); // 2 of 3
    
    expect(cssSkill.completedNodes).toBe(1);
    expect(cssSkill.completionPercentage).toBe(25); // 1 of 4
  });
});
