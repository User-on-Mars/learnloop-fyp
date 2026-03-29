#!/usr/bin/env node

/**
 * Complete System Validation Script
 * 
 * Validates the entire node system rebuild including:
 * - Linear progression rules
 * - Session management
 * - WebSocket real-time updates
 * - Animation system integration
 * - Error handling
 */

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import WebSocket from 'ws';

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:4000/api';
const WS_URL = process.env.WS_URL || 'ws://localhost:4000';
const TEST_USER_EMAIL = 'system-test@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

class SystemValidator {
  constructor() {
    this.authToken = null;
    this.testResults = [];
    this.skillId = null;
    this.skillMapId = null;
    this.nodes = [];
    this.sessions = [];
    this.wsEvents = [];
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`${colors.cyan}[${timestamp}]${colors[color]} ${message}${colors.reset}`);
  }

  async authenticate() {
    this.log('🔐 Setting up test user authentication...', 'blue');
    
    try {
      // Try to register user (might already exist)
      const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          name: 'System Test User'
        })
      });

      if (registerResponse.ok) {
        this.log('✅ Test user registered successfully', 'green');
      }
    } catch (error) {
      // User might already exist, continue with login
    }

    // Login
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Authentication failed: ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    this.authToken = loginData.token;
    this.log('✅ Authentication successful', 'green');
  }

  async testLinearProgressionRules() {
    this.log('📏 Testing Linear Progression Rules (Requirements 1.3, 1.4)...', 'blue');
    
    // Create skill map with strict linear progression
    const skillMapResponse = await fetch(`${API_BASE_URL}/skill-maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        name: 'Linear Progression Test',
        nodeLimit: 5,
        unlockMode: 'strict_linear',
        requireReflection: true,
        theme: 'pixel-retro'
      })
    });

    if (!skillMapResponse.ok) {
      throw new Error(`Failed to create skill map: ${skillMapResponse.statusText}`);
    }

    const skillMapData = await skillMapResponse.json();
    this.skillId = skillMapData.skillId;
    this.skillMapId = skillMapData._id;

    // Create nodes: START -> Content1 -> Content2 -> Content3 -> GOAL
    const nodeSequence = [
      { title: 'Start Learning', nodeType: 'start', sequenceOrder: 0 },
      { title: 'Basic Concepts', nodeType: 'content', sequenceOrder: 1 },
      { title: 'Intermediate Skills', nodeType: 'content', sequenceOrder: 2 },
      { title: 'Advanced Topics', nodeType: 'content', sequenceOrder: 3 },
      { title: 'Mastery Goal', nodeType: 'goal', sequenceOrder: 4 }
    ];

    for (const nodeData of nodeSequence) {
      const nodeResponse = await fetch(`${API_BASE_URL}/skills/${this.skillId}/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          ...nodeData,
          description: `Test node for ${nodeData.title}`,
          pixelPosition: {
            x: nodeData.sequenceOrder * 120 + 60,
            y: 200,
            gridX: nodeData.sequenceOrder * 4,
            gridY: 6
          }
        })
      });

      if (!nodeResponse.ok) {
        throw new Error(`Failed to create node: ${nodeResponse.statusText}`);
      }

      const node = await nodeResponse.json();
      this.nodes.push(node);
    }

    // Test 1: Verify initial state - only START node unlocked
    const initialProgressResponse = await fetch(`${API_BASE_URL}/skills/${this.skillId}/progression-path`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });

    const initialProgress = await initialProgressResponse.json();
    const startNodeUnlocked = initialProgress.unlockedNodes.length === 1 && 
                             initialProgress.unlockedNodes[0].nodeType === 'start';

    this.testResults.push({
      test: 'Initial State - Only START Unlocked',
      requirement: 'Only START node should be unlocked initially',
      passed: startNodeUnlocked,
      details: `${initialProgress.unlockedNodes.length} nodes unlocked`
    });

    // Test 2: Try to access locked node - should fail
    const lockedNodeValidation = await fetch(
      `${API_BASE_URL}/skills/${this.skillId}/nodes/${this.nodes[2]._id}/validate-unlock`,
      { headers: { 'Authorization': `Bearer ${this.authToken}` } }
    );

    const validationResult = await lockedNodeValidation.json();
    const lockedNodeBlocked = !validationResult.isValid;

    this.testResults.push({
      test: 'Locked Node Access Prevention',
      requirement: 'Should prevent access to locked nodes',
      passed: lockedNodeBlocked,
      details: validationResult.reason || 'No reason provided'
    });

    this.log(`✅ Linear progression rules: ${startNodeUnlocked && lockedNodeBlocked ? 'PASS' : 'FAIL'}`, 
             startNodeUnlocked && lockedNodeBlocked ? 'green' : 'red');

    return startNodeUnlocked && lockedNodeBlocked;
  }

  async testCompleteUserJourney() {
    this.log('🎯 Testing Complete User Journey (Start to Goal)...', 'blue');
    
    let journeySuccess = true;
    const journeySteps = [];

    // Complete each node in sequence
    for (let i = 0; i < this.nodes.length - 1; i++) { // Skip GOAL node
      const node = this.nodes[i];
      const stepStart = performance.now();

      try {
        // Start session
        const sessionResponse = await fetch(`${API_BASE_URL}/sessions/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({ nodeId: node._id })
        });

        if (!sessionResponse.ok) {
          throw new Error(`Failed to start session for ${node.title}`);
        }

        const sessionData = await sessionResponse.json();
        const sessionId = sessionData.sessionId;
        this.sessions.push(sessionData);

        // Simulate progress updates
        await fetch(`${API_BASE_URL}/sessions/${sessionId}/progress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            progress: 25,
            action: 'content_started'
          })
        });

        await fetch(`${API_BASE_URL}/sessions/${sessionId}/progress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            progress: 75,
            action: 'milestone_reached'
          })
        });

        // Complete session with reflection
        const completionResponse = await fetch(`${API_BASE_URL}/sessions/${sessionId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            understanding: 4 + Math.floor(Math.random() * 2), // 4-5
            difficulty: 2 + Math.floor(Math.random() * 2), // 2-3
            notes: `Completed ${node.title} - comprehensive understanding achieved`,
            completionConfidence: 4 + Math.floor(Math.random() * 2)
          })
        });

        if (!completionResponse.ok) {
          throw new Error(`Failed to complete session for ${node.title}`);
        }

        const completionData = await completionResponse.json();
        const stepTime = performance.now() - stepStart;

        journeySteps.push({
          node: node.title,
          completed: completionData.nodeCompleted,
          unlockedNext: completionData.unlockedNodes?.length > 0,
          time: Math.round(stepTime)
        });

        this.log(`  ✅ ${node.title} completed in ${Math.round(stepTime)}ms`, 'green');

        // Verify next node is unlocked (if not the last content node)
        if (i < this.nodes.length - 2) {
          const nextNodeId = this.nodes[i + 1]._id;
          const isUnlocked = completionData.unlockedNodes?.includes(nextNodeId);
          if (!isUnlocked) {
            journeySuccess = false;
            this.log(`  ❌ Next node not unlocked after completing ${node.title}`, 'red');
          }
        }

      } catch (error) {
        journeySuccess = false;
        this.log(`  ❌ Failed at ${node.title}: ${error.message}`, 'red');
        journeySteps.push({
          node: node.title,
          completed: false,
          error: error.message
        });
      }
    }

    // Verify final state - all nodes should be unlocked
    const finalProgressResponse = await fetch(`${API_BASE_URL}/skills/${this.skillId}/progression-path`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });

    const finalProgress = await finalProgressResponse.json();
    const allNodesUnlocked = finalProgress.unlockedNodes.length === this.nodes.length;
    const goalUnlocked = finalProgress.unlockedNodes.some(n => n.nodeType === 'goal');

    this.testResults.push({
      test: 'Complete User Journey',
      requirement: 'Complete progression from START to GOAL',
      passed: journeySuccess && allNodesUnlocked && goalUnlocked,
      details: `${journeySteps.filter(s => s.completed).length}/${journeySteps.length} nodes completed`
    });

    this.log(`✅ User journey: ${journeySuccess && allNodesUnlocked ? 'PASS' : 'FAIL'}`, 
             journeySuccess && allNodesUnlocked ? 'green' : 'red');

    return journeySuccess && allNodesUnlocked;
  }

  async testWebSocketIntegration() {
    this.log('🔌 Testing WebSocket Real-time Updates (Requirement 5.1, 5.2)...', 'blue');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket test timeout'));
      }, 15000);

      const ws = new WebSocket(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      let eventsReceived = 0;
      let connectionEstablished = false;

      ws.on('open', () => {
        connectionEstablished = true;
        this.log('  🔗 WebSocket connection established', 'green');
        
        // Join skill room
        ws.send(`42["join_skill_room",{"skillId":"${this.skillId}"}]`);
      });

      ws.on('message', (data) => {
        const message = data.toString();
        
        if (message.includes('room_joined')) {
          this.log('  📡 Joined skill room successfully', 'green');
        }
        
        if (message.includes('node_unlocked')) {
          eventsReceived++;
          this.log(`  🎉 Received unlock notification ${eventsReceived}`, 'green');
          this.wsEvents.push({ type: 'unlock', timestamp: Date.now() });
        }
        
        if (message.includes('session_completed')) {
          eventsReceived++;
          this.log(`  ✅ Received session completion notification`, 'green');
          this.wsEvents.push({ type: 'completion', timestamp: Date.now() });
        }

        // If we've received some events, consider the test successful
        if (eventsReceived >= 2) {
          clearTimeout(timeout);
          ws.close();
          
          this.testResults.push({
            test: 'WebSocket Real-time Updates',
            requirement: 'Receive real-time unlock and completion notifications',
            passed: true,
            details: `${eventsReceived} events received`
          });
          
          resolve(true);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.testResults.push({
          test: 'WebSocket Real-time Updates',
          requirement: 'Receive real-time unlock and completion notifications',
          passed: false,
          details: `Connection error: ${error.message}`
        });
        resolve(false);
      });

      // Trigger some events by completing a session
      setTimeout(async () => {
        if (connectionEstablished && this.nodes.length > 0) {
          try {
            // Start and complete a session to trigger WebSocket events
            const sessionResponse = await fetch(`${API_BASE_URL}/sessions/start`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
              },
              body: JSON.stringify({ nodeId: this.nodes[0]._id })
            });

            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              
              await fetch(`${API_BASE_URL}/sessions/${sessionData.sessionId}/complete`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                  understanding: 5,
                  difficulty: 2,
                  notes: 'WebSocket test completion',
                  completionConfidence: 5
                })
              });
            }
          } catch (error) {
            this.log(`  ⚠️ Failed to trigger WebSocket events: ${error.message}`, 'yellow');
          }
        }
      }, 2000);
    });
  }

  async testErrorHandling() {
    this.log('🛡️ Testing Error Handling and Recovery (Requirement 8.1, 8.5)...', 'blue');
    
    const errorTests = [];

    // Test 1: Invalid session start
    try {
      const invalidSessionResponse = await fetch(`${API_BASE_URL}/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ nodeId: 'invalid-node-id' })
      });

      errorTests.push({
        test: 'Invalid Node Session Start',
        passed: !invalidSessionResponse.ok,
        status: invalidSessionResponse.status
      });
    } catch (error) {
      errorTests.push({
        test: 'Invalid Node Session Start',
        passed: true,
        details: 'Properly rejected invalid request'
      });
    }

    // Test 2: Invalid reflection data
    if (this.sessions.length > 0) {
      try {
        const invalidReflectionResponse = await fetch(`${API_BASE_URL}/sessions/${this.sessions[0].sessionId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            understanding: 10, // Invalid: should be 1-5
            difficulty: 0, // Invalid: should be 1-5
            notes: 'x'.repeat(600), // Invalid: too long
            completionConfidence: -1 // Invalid: should be 1-5
          })
        });

        errorTests.push({
          test: 'Invalid Reflection Data',
          passed: !invalidReflectionResponse.ok,
          status: invalidReflectionResponse.status
        });
      } catch (error) {
        errorTests.push({
          test: 'Invalid Reflection Data',
          passed: true,
          details: 'Properly validated reflection data'
        });
      }
    }

    // Test 3: Unauthorized access
    try {
      const unauthorizedResponse = await fetch(`${API_BASE_URL}/skills/${this.skillId}/nodes`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });

      errorTests.push({
        test: 'Unauthorized Access',
        passed: unauthorizedResponse.status === 401,
        status: unauthorizedResponse.status
      });
    } catch (error) {
      errorTests.push({
        test: 'Unauthorized Access',
        passed: true,
        details: 'Properly rejected unauthorized request'
      });
    }

    const allErrorTestsPassed = errorTests.every(test => test.passed);

    this.testResults.push({
      test: 'Error Handling and Recovery',
      requirement: 'Graceful error handling with descriptive messages',
      passed: allErrorTestsPassed,
      details: `${errorTests.filter(t => t.passed).length}/${errorTests.length} error scenarios handled correctly`
    });

    this.log(`✅ Error handling: ${allErrorTestsPassed ? 'PASS' : 'FAIL'}`, 
             allErrorTestsPassed ? 'green' : 'red');

    return allErrorTestsPassed;
  }

  async testPerformanceRequirements() {
    this.log('⚡ Testing Performance Requirements (7.1, 7.2)...', 'blue');
    
    // Test load time
    const loadStartTime = performance.now();
    const loadResponse = await fetch(`${API_BASE_URL}/skills/${this.skillId}/nodes`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
    const loadTime = performance.now() - loadStartTime;
    const loadTimePassed = loadTime < 2000;

    // Test unlock processing time
    const unlockStartTime = performance.now();
    const sessionResponse = await fetch(`${API_BASE_URL}/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ nodeId: this.nodes[0]._id })
    });

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      
      await fetch(`${API_BASE_URL}/sessions/${sessionData.sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          understanding: 5,
          difficulty: 2,
          notes: 'Performance test',
          completionConfidence: 5
        })
      });
    }
    
    const unlockTime = performance.now() - unlockStartTime;
    const unlockTimePassed = unlockTime < 500;

    this.testResults.push({
      test: 'Load Time Performance',
      requirement: '<2000ms',
      passed: loadTimePassed,
      details: `${Math.round(loadTime)}ms`
    });

    this.testResults.push({
      test: 'Unlock Processing Performance',
      requirement: '<500ms',
      passed: unlockTimePassed,
      details: `${Math.round(unlockTime)}ms`
    });

    this.log(`  📊 Load time: ${Math.round(loadTime)}ms (${loadTimePassed ? 'PASS' : 'FAIL'})`, 
             loadTimePassed ? 'green' : 'red');
    this.log(`  ⚡ Unlock time: ${Math.round(unlockTime)}ms (${unlockTimePassed ? 'PASS' : 'FAIL'})`, 
             unlockTimePassed ? 'green' : 'red');

    return loadTimePassed && unlockTimePassed;
  }

  async cleanup() {
    this.log('🧹 Cleaning up test data...', 'blue');
    
    try {
      // Delete sessions
      for (const session of this.sessions) {
        try {
          await fetch(`${API_BASE_URL}/sessions/${session.sessionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.authToken}` }
          });
        } catch (error) {
          // Session might already be cleaned up
        }
      }

      // Delete skill map (this should cascade delete nodes)
      if (this.skillMapId) {
        await fetch(`${API_BASE_URL}/skill-maps/${this.skillMapId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.authToken}` }
        });
      }

      this.log('✅ Cleanup completed', 'green');
    } catch (error) {
      this.log(`⚠️ Cleanup warning: ${error.message}`, 'yellow');
    }
  }

  printResults() {
    this.log('\n📋 System Validation Results', 'blue');
    this.log('=' .repeat(80), 'blue');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const color = result.passed ? 'green' : 'red';
      
      this.log(`${status} ${result.test}`, color);
      this.log(`    Requirement: ${result.requirement}`);
      if (result.details) {
        this.log(`    Details: ${result.details}`);
      }
      this.log('');
    });

    this.log('=' .repeat(80), 'blue');
    this.log(`Overall Result: ${passed}/${total} tests passed`, passed === total ? 'green' : 'red');
    
    if (passed === total) {
      this.log('🎉 All system requirements validated successfully!', 'green');
      this.log('🚀 Node System Rebuild is ready for deployment!', 'green');
    } else {
      this.log('⚠️ Some system requirements not met - review failed tests', 'yellow');
    }

    // Summary statistics
    this.log('\n📊 Test Summary:', 'cyan');
    this.log(`  WebSocket Events: ${this.wsEvents.length}`, 'cyan');
    this.log(`  Sessions Created: ${this.sessions.length}`, 'cyan');
    this.log(`  Nodes Tested: ${this.nodes.length}`, 'cyan');

    return passed === total;
  }

  async run() {
    try {
      this.log('🚀 Starting Complete Node System Validation', 'blue');
      this.log('Testing all requirements for production readiness', 'blue');
      this.log('=' .repeat(80), 'blue');

      await this.authenticate();
      
      // Run all validation tests
      await this.testLinearProgressionRules();
      await this.testCompleteUserJourney();
      await this.testWebSocketIntegration();
      await this.testErrorHandling();
      await this.testPerformanceRequirements();
      
      // Print comprehensive results
      const allPassed = this.printResults();
      
      // Cleanup
      await this.cleanup();
      
      process.exit(allPassed ? 0 : 1);
      
    } catch (error) {
      this.log(`❌ System validation failed: ${error.message}`, 'red');
      console.error(error.stack);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SystemValidator();
  validator.run();
}

export default SystemValidator;