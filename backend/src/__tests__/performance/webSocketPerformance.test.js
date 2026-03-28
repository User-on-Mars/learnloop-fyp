import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import jwt from 'jsonwebtoken';

// Import services
import WebSocketService from '../../services/WebSocketService.js';
import ErrorLoggingService from '../../services/ErrorLoggingService.js';

let mongoServer;
let httpServer;
let serverSocket;
let clientSockets = [];

// Mock JWT secret for testing
process.env.JWT_SECRET = 'test-secret-key';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Create HTTP server for WebSocket testing
  httpServer = createServer();
  WebSocketService.initialize(httpServer);
  
  await new Promise((resolve) => {
    httpServer.listen(0, resolve); // Use random available port
  });
});

afterAll(async () => {
  // Cleanup all client connections
  clientSockets.forEach(socket => {
    if (socket.connected) {
      socket.disconnect();
    }
  });
  
  WebSocketService.shutdown();
  httpServer.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Disconnect all test clients
  clientSockets.forEach(socket => {
    if (socket.connected) {
      socket.disconnect();
    }
  });
  clientSockets = [];
});

/**
 * Helper function to create authenticated WebSocket client
 */
function createAuthenticatedClient(userId = 'testuser') {
  const token = jwt.sign(
    { id: userId, email: `${userId}@test.com` },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  const port = httpServer.address().port;
  const client = Client(`http://localhost:${port}`, {
    auth: { token },
    transports: ['websocket']
  });
  
  clientSockets.push(client);
  return client;
}

/**
 * Helper function to wait for client connection
 */
function waitForConnection(client) {
  return new Promise((resolve, reject) => {
    if (client.connected) {
      resolve();
      return;
    }
    
    client.on('connect', resolve);
    client.on('connect_error', reject);
    
    // Timeout after 5 seconds
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

describe('WebSocket Performance Tests', () => {
  describe('Connection Performance', () => {
    test('should handle multiple concurrent connections efficiently', async () => {
      const numClients = 100;
      const connectionPromises = [];
      
      const startTime = performance.now();
      
      // Create multiple concurrent connections
      for (let i = 0; i < numClients; i++) {
        const client = createAuthenticatedClient(`user_${i}`);
        connectionPromises.push(waitForConnection(client));
      }
      
      // Wait for all connections to establish
      await Promise.all(connectionPromises);
      
      const endTime = performance.now();
      const totalConnectionTime = endTime - startTime;
      const averageConnectionTime = totalConnectionTime / numClients;
      
      // Verify all clients are connected
      const connectedClients = clientSockets.filter(client => client.connected);
      expect(connectedClients).toHaveLength(numClients);
      
      // Performance requirements
      expect(averageConnectionTime).toBeLessThan(100); // 100ms average per connection
      expect(totalConnectionTime).toBeLessThan(10000); // Total under 10 seconds
      
      // Verify WebSocket service tracking
      const stats = WebSocketService.getConnectionStats();
      expect(stats.totalUsers).toBe(numClients);
      expect(stats.totalConnections).toBe(numClients);
      
      console.log(`✅ ${numClients} concurrent connections established in ${totalConnectionTime.toFixed(2)}ms`);
      console.log(`✅ Average connection time: ${averageConnectionTime.toFixed(2)}ms per connection`);
    }, 15000);
    
    test('should handle rapid connect/disconnect cycles efficiently', async () => {
      const numCycles = 50;
      const cyclePromises = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < numCycles; i++) {
        const cyclePromise = (async () => {
          const client = createAuthenticatedClient(`cycle_user_${i}`);
          
          // Wait for connection
          await waitForConnection(client);
          
          // Immediately disconnect
          client.disconnect();
          
          // Wait for disconnection
          await new Promise(resolve => {
            if (!client.connected) {
              resolve();
              return;
            }
            client.on('disconnect', resolve);
          });
        })();
        
        cyclePromises.push(cyclePromise);
      }
      
      await Promise.all(cyclePromises);
      
      const endTime = performance.now();
      const totalCycleTime = endTime - startTime;
      const averageCycleTime = totalCycleTime / numCycles;
      
      // Performance requirements
      expect(averageCycleTime).toBeLessThan(200); // 200ms average per cycle
      expect(totalCycleTime).toBeLessThan(10000); // Total under 10 seconds
      
      // Verify cleanup
      const stats = WebSocketService.getConnectionStats();
      expect(stats.totalUsers).toBe(0); // All users should be disconnected
      expect(stats.totalConnections).toBe(0);
      
      console.log(`✅ ${numCycles} connect/disconnect cycles completed in ${totalCycleTime.toFixed(2)}ms`);
      console.log(`✅ Average cycle time: ${averageCycleTime.toFixed(2)}ms per cycle`);
    }, 15000);
  });
  
  describe('Broadcasting Performance', () => {
    test('should broadcast unlock notifications to multiple clients efficiently', async () => {
      const numClients = 50;
      const clients = [];
      
      // Create and connect multiple clients
      for (let i = 0; i < numClients; i++) {
        const client = createAuthenticatedClient(`broadcast_user_${i}`);
        await waitForConnection(client);
        clients.push(client);
      }
      
      // Set up notification listeners
      const notificationPromises = clients.map(client => {
        return new Promise(resolve => {
          client.on('node_unlocked', (data) => {
            resolve(data);
          });
        });
      });
      
      // Performance test: Broadcast unlock notification
      const startTime = performance.now();
      
      const unlockData = {
        skillId: 'test_skill_123',
        nodeId: 'test_node_456',
        nodeTitle: 'Test Node',
        unlockedNodes: [
          {
            nodeId: 'next_node_789',
            nodeTitle: 'Next Node',
            nodeType: 'content',
            sequenceOrder: 2
          }
        ]
      };
      
      // Broadcast to all users (simulating unlock for each user)
      for (let i = 0; i < numClients; i++) {
        WebSocketService.broadcastNodeUnlock(`broadcast_user_${i}`, unlockData);
      }
      
      // Wait for all notifications to be received
      const notifications = await Promise.all(notificationPromises);
      
      const endTime = performance.now();
      const broadcastTime = endTime - startTime;
      const averageBroadcastTime = broadcastTime / numClients;
      
      // Verify all notifications were received
      expect(notifications).toHaveLength(numClients);
      notifications.forEach(notification => {
        expect(notification.type).toBe('node_unlock');
        expect(notification.nodeTitle).toBe('Test Node');
        expect(notification.unlockedNodes).toHaveLength(1);
      });
      
      // Performance requirements
      expect(averageBroadcastTime).toBeLessThan(50); // 50ms average per broadcast
      expect(broadcastTime).toBeLessThan(2000); // Total under 2 seconds
      
      console.log(`✅ Broadcasted unlock notifications to ${numClients} clients in ${broadcastTime.toFixed(2)}ms`);
      console.log(`✅ Average broadcast time: ${averageBroadcastTime.toFixed(2)}ms per client`);
    }, 10000);
    
    test('should handle high-frequency progress updates efficiently', async () => {
      const numClients = 20;
      const updatesPerClient = 50;
      const clients = [];
      
      // Create and connect clients
      for (let i = 0; i < numClients; i++) {
        const client = createAuthenticatedClient(`progress_user_${i}`);
        await waitForConnection(client);
        clients.push(client);
      }
      
      // Set up progress update listeners
      const updateCounters = new Array(numClients).fill(0);
      clients.forEach((client, index) => {
        client.on('session_progress_updated', () => {
          updateCounters[index]++;
        });
      });
      
      // Performance test: High-frequency progress updates
      const startTime = performance.now();
      
      const updatePromises = [];
      for (let clientIndex = 0; clientIndex < numClients; clientIndex++) {
        for (let updateIndex = 0; updateIndex < updatesPerClient; updateIndex++) {
          const updatePromise = new Promise(resolve => {
            setTimeout(() => {
              WebSocketService.broadcastSessionProgress(`progress_user_${clientIndex}`, {
                sessionId: `session_${clientIndex}`,
                nodeId: `node_${clientIndex}`,
                skillId: `skill_${clientIndex}`,
                progress: Math.floor((updateIndex + 1) * (100 / updatesPerClient)),
                action: `update_${updateIndex}`
              });
              resolve();
            }, Math.random() * 100); // Random delay up to 100ms
          });
          updatePromises.push(updatePromise);
        }
      }
      
      // Wait for all updates to be sent
      await Promise.all(updatePromises);
      
      // Wait a bit for all updates to be received
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const endTime = performance.now();
      const totalUpdateTime = endTime - startTime;
      const totalUpdates = numClients * updatesPerClient;
      const averageUpdateTime = totalUpdateTime / totalUpdates;
      
      // Verify all updates were received
      const totalReceived = updateCounters.reduce((sum, count) => sum + count, 0);
      expect(totalReceived).toBe(totalUpdates);
      
      // Performance requirements
      expect(averageUpdateTime).toBeLessThan(20); // 20ms average per update
      expect(totalUpdateTime).toBeLessThan(5000); // Total under 5 seconds
      
      console.log(`✅ Processed ${totalUpdates} progress updates in ${totalUpdateTime.toFixed(2)}ms`);
      console.log(`✅ Average update time: ${averageUpdateTime.toFixed(2)}ms per update`);
    }, 10000);
  });
  
  describe('Room Management Performance', () => {
    test('should handle skill room joins and leaves efficiently', async () => {
      const numClients = 30;
      const numSkills = 5;
      const clients = [];
      
      // Create and connect clients
      for (let i = 0; i < numClients; i++) {
        const client = createAuthenticatedClient(`room_user_${i}`);
        await waitForConnection(client);
        clients.push(client);
      }
      
      // Performance test: Room join operations
      const joinStartTime = performance.now();
      
      const joinPromises = clients.map((client, index) => {
        return new Promise(resolve => {
          const skillId = `skill_${index % numSkills}`;
          
          client.on('room_joined', (data) => {
            expect(data.skillId).toBe(skillId);
            resolve();
          });
          
          client.emit('join_skill_room', { skillId });
        });
      });
      
      await Promise.all(joinPromises);
      
      const joinEndTime = performance.now();
      const joinTime = joinEndTime - joinStartTime;
      const averageJoinTime = joinTime / numClients;
      
      // Performance test: Room leave operations
      const leaveStartTime = performance.now();
      
      const leavePromises = clients.map((client, index) => {
        return new Promise(resolve => {
          const skillId = `skill_${index % numSkills}`;
          
          client.on('room_left', (data) => {
            expect(data.skillId).toBe(skillId);
            resolve();
          });
          
          client.emit('leave_skill_room', { skillId });
        });
      });
      
      await Promise.all(leavePromises);
      
      const leaveEndTime = performance.now();
      const leaveTime = leaveEndTime - leaveStartTime;
      const averageLeaveTime = leaveTime / numClients;
      
      // Performance requirements
      expect(averageJoinTime).toBeLessThan(50); // 50ms average per join
      expect(averageLeaveTime).toBeLessThan(50); // 50ms average per leave
      expect(joinTime).toBeLessThan(2000); // Total join time under 2 seconds
      expect(leaveTime).toBeLessThan(2000); // Total leave time under 2 seconds
      
      console.log(`✅ ${numClients} room joins completed in ${joinTime.toFixed(2)}ms`);
      console.log(`✅ Average join time: ${averageJoinTime.toFixed(2)}ms per join`);
      console.log(`✅ ${numClients} room leaves completed in ${leaveTime.toFixed(2)}ms`);
      console.log(`✅ Average leave time: ${averageLeaveTime.toFixed(2)}ms per leave`);
    }, 10000);
    
    test('should broadcast to skill rooms efficiently with user exclusion', async () => {
      const numClientsPerSkill = 10;
      const numSkills = 3;
      const totalClients = numClientsPerSkill * numSkills;
      const clients = [];
      
      // Create clients and join them to different skill rooms
      for (let skillIndex = 0; skillIndex < numSkills; skillIndex++) {
        for (let clientIndex = 0; clientIndex < numClientsPerSkill; clientIndex++) {
          const userId = `skill${skillIndex}_user${clientIndex}`;
          const client = createAuthenticatedClient(userId);
          await waitForConnection(client);
          
          // Join skill room
          await new Promise(resolve => {
            client.on('room_joined', resolve);
            client.emit('join_skill_room', { skillId: `skill_${skillIndex}` });
          });
          
          clients.push({ client, userId, skillIndex });
        }
      }
      
      // Set up listeners for skill room broadcasts
      const receivedNotifications = [];
      clients.forEach(({ client, userId }) => {
        client.on('skill_node_unlocked', (data) => {
          receivedNotifications.push({ userId, data });
        });
      });
      
      // Performance test: Broadcast to skill rooms with exclusion
      const startTime = performance.now();
      
      // Broadcast unlock for one user in each skill
      for (let skillIndex = 0; skillIndex < numSkills; skillIndex++) {
        const originUserId = `skill${skillIndex}_user0`; // First user in each skill
        
        WebSocketService.broadcastNodeUnlock(originUserId, {
          skillId: `skill_${skillIndex}`,
          nodeId: `node_${skillIndex}`,
          nodeTitle: `Skill ${skillIndex} Node`,
          unlockedNodes: []
        });
      }
      
      // Wait for broadcasts to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const endTime = performance.now();
      const broadcastTime = endTime - startTime;
      
      // Verify broadcast behavior
      // Each skill should have (numClientsPerSkill - 1) notifications
      // (excluding the originating user)
      const expectedNotifications = numSkills * (numClientsPerSkill - 1);
      expect(receivedNotifications).toHaveLength(expectedNotifications);
      
      // Verify no user received their own unlock notification
      receivedNotifications.forEach(({ userId, data }) => {
        expect(data.isOwnEvent).toBe(false);
      });
      
      // Performance requirements
      expect(broadcastTime).toBeLessThan(1000); // Under 1 second for all broadcasts
      
      console.log(`✅ Broadcasted to ${numSkills} skill rooms (${totalClients} total clients) in ${broadcastTime.toFixed(2)}ms`);
      console.log(`✅ Received ${receivedNotifications.length} notifications (expected ${expectedNotifications})`);
    }, 10000);
  });
  
  describe('Memory and Resource Management', () => {
    test('should efficiently manage connection tracking data structures', async () => {
      const numCycles = 20;
      const clientsPerCycle = 25;
      
      for (let cycle = 0; cycle < numCycles; cycle++) {
        const cycleClients = [];
        
        // Create connections
        for (let i = 0; i < clientsPerCycle; i++) {
          const client = createAuthenticatedClient(`cycle${cycle}_user${i}`);
          await waitForConnection(client);
          cycleClients.push(client);
        }
        
        // Join rooms
        await Promise.all(cycleClients.map((client, index) => {
          return new Promise(resolve => {
            client.on('room_joined', resolve);
            client.emit('join_skill_room', { skillId: `skill_${index % 5}` });
          });
        }));
        
        // Verify tracking
        const stats = WebSocketService.getConnectionStats();
        expect(stats.totalUsers).toBe(clientsPerCycle);
        expect(stats.totalConnections).toBe(clientsPerCycle);
        
        // Disconnect all clients
        cycleClients.forEach(client => client.disconnect());
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify cleanup
        const cleanupStats = WebSocketService.getConnectionStats();
        expect(cleanupStats.totalUsers).toBe(0);
        expect(cleanupStats.totalConnections).toBe(0);
        
        // Clear from our tracking
        clientSockets.length = 0;
      }
      
      console.log(`✅ Completed ${numCycles} connection cycles with proper cleanup`);
    }, 30000);
  });
});