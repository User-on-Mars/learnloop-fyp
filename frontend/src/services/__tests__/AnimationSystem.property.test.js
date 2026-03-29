/**
 * AnimationSystem Property-Based Tests
 * 
 * **Validates: Requirements 4.5, 8.3**
 * 
 * Property-based tests for animation system resilience and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import AnimationSystem from '../AnimationSystem.js';

// Mock DOM and Web Audio API
const mockElement = {
  style: {},
  getBoundingClientRect: () => ({ left: 100, top: 100, width: 64, height: 64 }),
  querySelector: vi.fn(() => ({ style: {} })),
  querySelectorAll: vi.fn(() => []),
  appendChild: vi.fn(),
  removeChild: vi.fn()
};

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  sampleRate: 44100,
  destination: {},
  createBuffer: vi.fn(() => ({
    getChannelData: () => new Float32Array(1024)
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    playbackRate: { value: 1.0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null
  })),
  createGain: vi.fn(() => ({
    gain: { value: 1.0 },
    connect: vi.fn()
  })),
  decodeAudioData: vi.fn(() => Promise.resolve({
    duration: 1.0,
    sampleRate: 44100
  })),
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve())
};

const mockDocument = {
  querySelector: vi.fn(() => mockElement),
  getElementById: vi.fn(() => mockElement),
  createElement: vi.fn(() => mockElement),
  addEventListener: vi.fn(),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
};

const mockPerformance = {
  now: vi.fn(() => Date.now())
};

let animationFrameCallbacks = [];
const mockRequestAnimationFrame = vi.fn((callback) => {
  const id = animationFrameCallbacks.length;
  animationFrameCallbacks.push(callback);
  // Auto-execute callback after short delay for testing
  setTimeout(() => {
    if (animationFrameCallbacks[id]) {
      animationFrameCallbacks[id](mockPerformance.now());
    }
  }, 1);
  return id;
});

// Setup global mocks
global.AudioContext = vi.fn(() => mockAudioContext);
global.webkitAudioContext = vi.fn(() => mockAudioContext);
global.document = mockDocument;
global.performance = mockPerformance;
global.requestAnimationFrame = mockRequestAnimationFrame;
global.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
}));

describe('AnimationSystem Property-Based Tests', () => {
  let animationSystem;

  beforeEach(() => {
    animationSystem = new AnimationSystem({
      enableAnimations: true,
      enableSounds: true,
      enableParticles: true
    });
    
    vi.clearAllMocks();
    animationFrameCallbacks = [];
    mockPerformance.now.mockReturnValue(1000);
  });

  afterEach(() => {
    animationSystem.dispose();
  });

  describe('Property 9: Animation System Resilience', () => {
    /**
     * **Validates: Requirements 4.5, 8.3**
     * 
     * For any animation failure, the system must log the error and continue 
     * with fallback visuals without disrupting user experience.
     */

    it('should handle arbitrary node unlock requests gracefully', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // nodeId
        fc.record({
          title: fc.string({ maxLength: 100 }),
          status: fc.constantFrom('locked', 'not_started', 'in_progress', 'completed'),
          reflection: fc.option(fc.record({
            understanding: fc.integer({ min: 1, max: 5 }),
            difficulty: fc.integer({ min: 1, max: 5 })
          }))
        }), // nodeData
        fc.record({
          duration: fc.option(fc.integer({ min: 100, max: 10000 })),
          particleEffects: fc.option(fc.boolean()),
          soundEffects: fc.option(fc.boolean())
        }), // options
        async (nodeId, nodeData, options) => {
          // The system should never throw errors, regardless of input
          let result;
          let errorThrown = false;
          
          try {
            result = await animationSystem.playNodeUnlockSequence(nodeId, nodeData, options);
          } catch (error) {
            errorThrown = true;
          }
          
          // Property: System never throws errors
          expect(errorThrown).toBe(false);
          
          // Property: Always returns a boolean result
          expect(typeof result).toBe('boolean');
          
          // Property: System remains in valid state after operation
          const stats = animationSystem.getPerformanceStats();
          expect(stats).toBeDefined();
          expect(typeof stats.system.totalAnimations).toBe('number');
        }
      ), { numRuns: 20 });
    });

    it('should handle arbitrary progress animation requests gracefully', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // elementId
        fc.float({ min: -1000, max: 1000 }), // fromProgress
        fc.float({ min: -1000, max: 1000 }), // toProgress
        fc.record({
          duration: fc.option(fc.integer({ min: 1, max: 10000 })),
          easing: fc.option(fc.constantFrom('easeIn', 'easeOut', 'easeInOut', 'bounce', 'invalid')),
          showSparkles: fc.option(fc.boolean())
        }), // options
        async (elementId, fromProgress, toProgress, options) => {
          let result;
          let errorThrown = false;
          
          try {
            result = await animationSystem.animateProgressUpdate(elementId, fromProgress, toProgress, options);
          } catch (error) {
            errorThrown = true;
          }
          
          // Property: System never throws errors
          expect(errorThrown).toBe(false);
          
          // Property: Always returns a boolean result
          expect(typeof result).toBe('boolean');
          
          // Property: Progress values are properly clamped internally
          // (We can't directly test internal clamping, but system should handle it)
          expect(result).toBeDefined();
        }
      ), { numRuns: 20 });
    });

    it('should handle arbitrary celebration requests gracefully', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // sessionId
        fc.record({
          reflection: fc.option(fc.record({
            understanding: fc.integer({ min: -10, max: 15 }), // Invalid range to test validation
            difficulty: fc.integer({ min: -10, max: 15 })
          })),
          duration: fc.option(fc.integer({ min: -1000, max: 1000000 }))
        }), // sessionData
        fc.record({
          duration: fc.option(fc.integer({ min: 1, max: 20000 })),
          effects: fc.option(fc.array(fc.string(), { maxLength: 10 }))
        }), // options
        async (sessionId, sessionData, options) => {
          let result;
          let errorThrown = false;
          
          try {
            result = await animationSystem.triggerSessionCompletionCelebration(sessionId, sessionData, options);
          } catch (error) {
            errorThrown = true;
          }
          
          // Property: System never throws errors
          expect(errorThrown).toBe(false);
          
          // Property: Always returns a boolean result
          expect(typeof result).toBe('boolean');
        }
      ), { numRuns: 15 });
    });

    it('should handle arbitrary state transitions gracefully', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // nodeId
        fc.string({ maxLength: 20 }), // fromState
        fc.string({ maxLength: 20 }), // toState
        fc.record({
          duration: fc.option(fc.integer({ min: 1, max: 5000 }))
        }), // options
        async (nodeId, fromState, toState, options) => {
          let result;
          let errorThrown = false;
          
          try {
            result = await animationSystem.animateStateTransition(nodeId, fromState, toState, options);
          } catch (error) {
            errorThrown = true;
          }
          
          // Property: System never throws errors
          expect(errorThrown).toBe(false);
          
          // Property: Always returns a boolean result
          expect(typeof result).toBe('boolean');
        }
      ), { numRuns: 15 });
    });

    it('should maintain system integrity under rapid setting changes', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          enableAnimations: fc.option(fc.boolean()),
          enableSounds: fc.option(fc.boolean()),
          enableParticles: fc.option(fc.boolean()),
          performanceMode: fc.option(fc.constantFrom('performance', 'balanced', 'quality', 'invalid')),
          masterVolume: fc.option(fc.float({ min: -2, max: 2 })),
          sfxVolume: fc.option(fc.float({ min: -2, max: 2 })),
          muted: fc.option(fc.boolean())
        }), { maxLength: 20 }),
        (settingsUpdates) => {
          let errorThrown = false;
          
          try {
            // Apply all settings updates rapidly
            settingsUpdates.forEach(settings => {
              animationSystem.updateSettings(settings);
            });
            
            // Get final settings
            const finalSettings = animationSystem.getSettings();
            
            // Property: Settings are always in valid state
            expect(typeof finalSettings.enableAnimations).toBe('boolean');
            expect(typeof finalSettings.enableSounds).toBe('boolean');
            expect(typeof finalSettings.enableParticles).toBe('boolean');
            
            // Property: Volume values are clamped to valid range
            if (finalSettings.audio) {
              expect(finalSettings.audio.masterVolume).toBeGreaterThanOrEqual(0);
              expect(finalSettings.audio.masterVolume).toBeLessThanOrEqual(1);
              expect(finalSettings.audio.sfxVolume).toBeGreaterThanOrEqual(0);
              expect(finalSettings.audio.sfxVolume).toBeLessThanOrEqual(1);
            }
            
          } catch (error) {
            errorThrown = true;
          }
          
          // Property: System never throws errors during settings updates
          expect(errorThrown).toBe(false);
        }
      ), { numRuns: 25 });
    });

    it('should handle DOM manipulation failures gracefully', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // nodeId
        fc.constantFrom(null, undefined, 'throws'), // DOM failure mode
        async (nodeId, failureMode) => {
          // Mock DOM failures
          const originalQuerySelector = mockDocument.querySelector;
          
          if (failureMode === null) {
            mockDocument.querySelector.mockReturnValue(null);
          } else if (failureMode === undefined) {
            mockDocument.querySelector.mockReturnValue(undefined);
          } else if (failureMode === 'throws') {
            mockDocument.querySelector.mockImplementation(() => {
              throw new Error('DOM access failed');
            });
          }
          
          let result;
          let errorThrown = false;
          
          try {
            result = await animationSystem.playNodeUnlockSequence(nodeId, {}, { duration: 100 });
          } catch (error) {
            errorThrown = true;
          }
          
          // Restore original mock
          mockDocument.querySelector = originalQuerySelector;
          
          // Property: System handles DOM failures gracefully
          expect(errorThrown).toBe(false);
          expect(typeof result).toBe('boolean');
        }
      ), { numRuns: 15 });
    });

    it('should handle audio context failures gracefully', async () => {
      await fc.assert(fc.asyncProperty(
        fc.constantFrom('suspended', 'closed', 'throws', null), // Audio failure mode
        fc.string({ minLength: 1, maxLength: 20 }), // soundName
        async (failureMode, soundName) => {
          // Mock audio context failures
          const originalState = mockAudioContext.state;
          const originalCreateBufferSource = mockAudioContext.createBufferSource;
          
          if (failureMode === 'suspended') {
            mockAudioContext.state = 'suspended';
          } else if (failureMode === 'closed') {
            mockAudioContext.state = 'closed';
          } else if (failureMode === 'throws') {
            mockAudioContext.createBufferSource.mockImplementation(() => {
              throw new Error('Audio context failed');
            });
          } else if (failureMode === null) {
            animationSystem.audioManager.audioContext = null;
          }
          
          let result;
          let errorThrown = false;
          
          try {
            // Try to play a sound
            result = await animationSystem.audioManager.playSound(soundName, { volume: 0.5 });
          } catch (error) {
            errorThrown = true;
          }
          
          // Restore original mocks
          mockAudioContext.state = originalState;
          mockAudioContext.createBufferSource = originalCreateBufferSource;
          
          // Property: System handles audio failures gracefully
          expect(errorThrown).toBe(false);
          
          // Property: Returns null on failure, string on success
          expect(result === null || typeof result === 'string').toBe(true);
        }
      ), { numRuns: 15 });
    });

    it('should maintain performance under concurrent animation requests', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.record({
          type: fc.constantFrom('unlock', 'progress', 'celebration', 'transition'),
          id: fc.string({ minLength: 1, maxLength: 20 }),
          data: fc.record({
            duration: fc.option(fc.integer({ min: 50, max: 500 }))
          })
        }), { minLength: 1, maxLength: 10 }),
        async (animationRequests) => {
          const startTime = performance.now();
          const promises = [];
          let errorThrown = false;
          
          try {
            // Start all animations concurrently
            animationRequests.forEach(request => {
              switch (request.type) {
                case 'unlock':
                  promises.push(animationSystem.playNodeUnlockSequence(request.id, {}, request.data));
                  break;
                case 'progress':
                  promises.push(animationSystem.animateProgressUpdate(request.id, 0, 100, request.data));
                  break;
                case 'celebration':
                  promises.push(animationSystem.triggerSessionCompletionCelebration(request.id, {}, request.data));
                  break;
                case 'transition':
                  promises.push(animationSystem.animateStateTransition(request.id, 'locked', 'unlocked', request.data));
                  break;
              }
            });
            
            // Wait for all animations to complete
            const results = await Promise.all(promises);
            
            // Property: All animations return boolean results
            results.forEach(result => {
              expect(typeof result).toBe('boolean');
            });
            
            // Property: System performance remains reasonable
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
            
            // Property: System state remains valid
            const stats = animationSystem.getPerformanceStats();
            expect(stats).toBeDefined();
            expect(typeof stats.system.totalAnimations).toBe('number');
            
          } catch (error) {
            errorThrown = true;
          }
          
          // Property: System never throws errors under concurrent load
          expect(errorThrown).toBe(false);
        }
      ), { numRuns: 10 });
    });

    it('should handle system disposal and recreation gracefully', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          action: fc.constantFrom('dispose', 'recreate', 'updateSettings', 'getStats'),
          settings: fc.option(fc.record({
            enableAnimations: fc.boolean(),
            enableSounds: fc.boolean()
          }))
        }), { maxLength: 20 }),
        (actions) => {
          let currentSystem = animationSystem;
          let errorThrown = false;
          
          try {
            actions.forEach(action => {
              switch (action.action) {
                case 'dispose':
                  if (currentSystem) {
                    currentSystem.dispose();
                    currentSystem = null;
                  }
                  break;
                  
                case 'recreate':
                  if (!currentSystem) {
                    currentSystem = new AnimationSystem(action.settings || {});
                  }
                  break;
                  
                case 'updateSettings':
                  if (currentSystem && action.settings) {
                    currentSystem.updateSettings(action.settings);
                  }
                  break;
                  
                case 'getStats':
                  if (currentSystem) {
                    const stats = currentSystem.getPerformanceStats();
                    expect(stats).toBeDefined();
                  }
                  break;
              }
            });
          } catch (error) {
            errorThrown = true;
          }
          
          // Property: System lifecycle operations never throw errors
          expect(errorThrown).toBe(false);
          
          // Cleanup
          if (currentSystem && currentSystem !== animationSystem) {
            currentSystem.dispose();
          }
        }
      ), { numRuns: 20 });
    });
  });

  describe('Performance and Resource Management Properties', () => {
    it('should maintain bounded memory usage under repeated operations', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.record({
          nodeId: fc.string({ minLength: 1, maxLength: 10 }),
          operation: fc.constantFrom('unlock', 'stop', 'clear')
        }), { minLength: 10, maxLength: 50 }),
        async (operations) => {
          const initialStats = animationSystem.getPerformanceStats();
          
          // Perform operations
          for (const op of operations) {
            try {
              switch (op.operation) {
                case 'unlock':
                  await animationSystem.playNodeUnlockSequence(op.nodeId, {}, { duration: 50 });
                  break;
                case 'stop':
                  animationSystem.unlockEngine.stopAnimation(op.nodeId);
                  break;
                case 'clear':
                  animationSystem.stopAll();
                  break;
              }
            } catch (error) {
              // Ignore errors for this test
            }
          }
          
          const finalStats = animationSystem.getPerformanceStats();
          
          // Property: Active animations count should be reasonable
          expect(finalStats.unlock.activeAnimations).toBeLessThan(100);
          
          // Property: Cache sizes should be bounded
          expect(finalStats.unlock.cacheSize).toBeLessThan(1000);
          expect(finalStats.audio.loadedSounds).toBeLessThan(100);
        }
      ), { numRuns: 10 });
    });
  });
});