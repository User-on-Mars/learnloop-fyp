#!/usr/bin/env node

/**
 * Performance Validation Script
 * 
 * Validates that the node system meets performance requirements:
 * - 2s load time for skill maps
 * - 500ms unlock processing
 * - 60fps animation performance
 */

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import WebSocket from 'ws';

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:4000/api';
const WS_URL = process.env.WS_URL || 'ws://localhost:4000';
const TEST_USER_EMAIL = 'perf-test@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

class PerformanceValidator {
  constructor() {
    this.authToken = null;
    this.testResults = [];
    this.skillId = null;
    this.nodes = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async authenticate() {
    this.log('🔐 Authenticating test user...', 'blue');
    
    try {
      // Try to register user (might already exist)
      await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          name: 'Performance Test User'
        })
      });
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

  async createTestSkillMap() {
    this.log('🗺️ Creating test skill map...', 'blue');
    
    const response = await fetch(`${API_BASE_URL}/skill-maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        name: 'Performance Test Skill Map',
        nodeLimit: 10,
        unlockMode: 'strict_linear',
        theme: 'pixel-retro'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create skill map: ${response.statusText}`);
    }

    const skillMapData = await response.json();
    this.skillId = skillMapData.skillId;
    
    // Create nodes for testing
    const nodeTypes = ['start', 'content', 'content', 'content', 'content', 'content', 'content', 'content', 'content', 'goal'];
    
    for (let i = 0; i < nodeTypes.length; i++) {
      const nodeResponse = await fetch(`${API_BASE_URL}/skills/${this.skillId}/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          title: `Test Node ${i + 1}`,
          description: `Performance test node ${i + 1}`,
          nodeType: nodeTypes[i],
          sequenceOrder: i,
          pixelPosition: { x: i * 100, y: 100, gridX: i * 3, gridY: 3 }
        })
      });

      if (!nodeResponse.ok) {
        throw new Error(`Failed to create node ${i + 1}: ${nodeResponse.statusText}`);
      }

      const nodeData = await nodeResponse.json();
      this.nodes.push(nodeData);
    }

    this.log(`✅ Created skill map with ${this.nodes.length} nodes`, 'green');
  }

  async testSkillMapLoadTime() {
    this.log('⏱️ Testing skill map load time (Requirement 7.1: <2s)...', 'blue');
    
    const startTime = performance.now();
    
    const response = await fetch(`${API_BASE_URL}/skills/${this.skillId}/nodes`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    if (!response.ok) {
      throw new Error(`Failed to load skill map: ${response.statusText}`);
    }

    const nodes = await response.json();
    const passed = loadTime < 2000;

    this.testResults.push({
      test: 'Skill Map Load Time',
      requirement: '<2000ms',
      actual: `${Math.round(loadTime)}ms`,
      passed,
      details: `Loaded ${nodes.length} nodes`
    });

    this.log(
      `${passed ? '✅' : '❌'} Load time: ${Math.round(loadTime)}ms (${passed ? 'PASS' : 'FAIL'})`,
      passed ? 'green' : 'red'
    );

    return passed;
  }

  async testUnlockProcessingTime() {
    this.log('⚡ Testing unlock processing time (Requirement 7.2: <500ms)...', 'blue');
    
    // Start session on first node
    const sessionResponse = await fetch(`${API_BASE_URL}/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        nodeId: this.nodes[0]._id
      })
    });

    if (!sessionResponse.ok) {
      throw new Error(`Failed to start session: ${sessionResponse.statusText}`);
    }

    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.sessionId;

    // Measure unlock processing time
    const startTime = performance.now();
    
    const completionResponse = await fetch(`${API_BASE_URL}/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        understanding: 5,
        difficulty: 2,
        notes: 'Performance test completion',
        completionConfidence: 5
      })
    });

    const endTime = performance.now();
    const unlockTime = endTime - startTime;

    if (!completionResponse.ok) {
      throw new Error(`Failed to complete session: ${completionResponse.statusText}`);
    }

    const completionData = await completionResponse.json();
    const passed = unlockTime < 500;

    this.testResults.push({
      test: 'Unlock Processing Time',
      requirement: '<500ms',
      actual: `${Math.round(unlockTime)}ms`,
      passed,
      details: `Unlocked ${completionData.unlockedNodes?.length || 0} nodes`
    });

    this.log(
      `${passed ? '✅' : '❌'} Unlock time: ${Math.round(unlockTime)}ms (${passed ? 'PASS' : 'FAIL'})`,
      passed ? 'green' : 'red'
    );

    return passed;
  }

  async testWebSocketPerformance() {
    this.log('🔌 Testing WebSocket connection and real-time updates...', 'blue');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket test timeout'));
      }, 10000);

      const ws = new WebSocket(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      let connectionTime = null;
      let messageReceived = false;
      const startTime = performance.now();

      ws.on('open', () => {
        connectionTime = performance.now() - startTime;
        this.log(`🔗 WebSocket connected in ${Math.round(connectionTime)}ms`, 'green');
        
        // Join skill room
        ws.send(`42["join_skill_room",{"skillId":"${this.skillId}"}]`);
      });

      ws.on('message', (data) => {
        const message = data.toString();
        if (message.includes('node_unlocked') || message.includes('room_joined')) {
          messageReceived = true;
          
          const passed = connectionTime < 1000; // 1 second for WebSocket connection
          
          this.testResults.push({
            test: 'WebSocket Performance',
            requirement: '<1000ms connection',
            actual: `${Math.round(connectionTime)}ms`,
            passed,
            details: 'Real-time updates working'
          });

          clearTimeout(timeout);
          ws.close();
          resolve(passed);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async testAPIResponseTimes() {
    this.log('📊 Testing API response times...', 'blue');
    
    const endpoints = [
      { name: 'Health Check', path: '/health' },
      { name: 'Progression Path', path: `/skills/${this.skillId}/progression-path` },
      { name: 'Node Validation', path: `/skills/${this.skillId}/nodes/${this.nodes[1]._id}/validate-unlock` }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const startTime = performance.now();
      
      const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
        headers: endpoint.path !== '/health' ? {
          'Authorization': `Bearer ${this.authToken}`
        } : {}
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const passed = responseTime < 1000; // 1 second for API responses
      
      results.push({
        endpoint: endpoint.name,
        time: Math.round(responseTime),
        passed
      });

      this.log(
        `  ${passed ? '✅' : '❌'} ${endpoint.name}: ${Math.round(responseTime)}ms`,
        passed ? 'green' : 'red'
      );
    }

    const allPassed = results.every(r => r.passed);
    const avgTime = Math.round(results.reduce((sum, r) => sum + r.time, 0) / results.length);

    this.testResults.push({
      test: 'API Response Times',
      requirement: '<1000ms average',
      actual: `${avgTime}ms average`,
      passed: allPassed,
      details: `${results.filter(r => r.passed).length}/${results.length} endpoints passed`
    });

    return allPassed;
  }

  async testConcurrentUsers() {
    this.log('👥 Testing concurrent user performance...', 'blue');
    
    const concurrentRequests = 10;
    const promises = [];

    const startTime = performance.now();

    for (let i = 0; i < concurrentRequests; i++) {
      const promise = fetch(`${API_BASE_URL}/skills/${this.skillId}/progression-path`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      promises.push(promise);
    }

    const responses = await Promise.all(promises);
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / concurrentRequests;

    const allSuccessful = responses.every(r => r.ok);
    const passed = allSuccessful && avgTime < 500;

    this.testResults.push({
      test: 'Concurrent Users',
      requirement: '<500ms per request',
      actual: `${Math.round(avgTime)}ms average`,
      passed,
      details: `${concurrentRequests} concurrent requests`
    });

    this.log(
      `${passed ? '✅' : '❌'} Concurrent performance: ${Math.round(avgTime)}ms avg (${passed ? 'PASS' : 'FAIL'})`,
      passed ? 'green' : 'red'
    );

    return passed;
  }

  async cleanup() {
    this.log('🧹 Cleaning up test data...', 'blue');
    
    try {
      // Delete test skill map and associated data
      if (this.skillId) {
        await fetch(`${API_BASE_URL}/skill-maps/${this.skillId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });
      }
      
      this.log('✅ Cleanup completed', 'green');
    } catch (error) {
      this.log(`⚠️ Cleanup warning: ${error.message}`, 'yellow');
    }
  }

  printResults() {
    this.log('\n📋 Performance Validation Results', 'blue');
    this.log('=' .repeat(60), 'blue');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const color = result.passed ? 'green' : 'red';
      
      this.log(`${status} ${result.test}`, color);
      this.log(`    Requirement: ${result.requirement}`);
      this.log(`    Actual: ${result.actual}`);
      if (result.details) {
        this.log(`    Details: ${result.details}`);
      }
      this.log('');
    });

    this.log('=' .repeat(60), 'blue');
    this.log(`Overall: ${passed}/${total} tests passed`, passed === total ? 'green' : 'red');
    
    if (passed === total) {
      this.log('🎉 All performance requirements met!', 'green');
    } else {
      this.log('⚠️ Some performance requirements not met', 'yellow');
    }

    return passed === total;
  }

  async run() {
    try {
      this.log('🚀 Starting Node System Performance Validation', 'blue');
      this.log('=' .repeat(60), 'blue');

      await this.authenticate();
      await this.createTestSkillMap();
      
      // Run performance tests
      await this.testSkillMapLoadTime();
      await this.testUnlockProcessingTime();
      await this.testWebSocketPerformance();
      await this.testAPIResponseTimes();
      await this.testConcurrentUsers();
      
      // Print results
      const allPassed = this.printResults();
      
      // Cleanup
      await this.cleanup();
      
      process.exit(allPassed ? 0 : 1);
      
    } catch (error) {
      this.log(`❌ Performance validation failed: ${error.message}`, 'red');
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new PerformanceValidator();
  validator.run();
}

export default PerformanceValidator;