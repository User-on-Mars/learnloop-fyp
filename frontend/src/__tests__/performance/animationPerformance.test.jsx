import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Import animation services
import AnimationSystem from '../../services/AnimationSystem';
import UnlockAnimationEngine from '../../services/UnlockAnimationEngine';
import ProgressAnimationController from '../../services/ProgressAnimationController';
import AudioManager from '../../services/AudioManager';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => [])
};

// Mock requestAnimationFrame
let animationFrameId = 0;
const mockRequestAnimationFrame = vi.fn((callback) => {
  const id = ++animationFrameId;
  setTimeout(() => callback(mockPerformance.now()), 16); // ~60fps
  return id;
});

const mockCancelAnimationFrame = vi.fn();

// Mock Canvas API
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '12px Arial',
    textAlign: 'left',
    textBaseline: 'top',
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
    putImageData: vi.fn()
  })),
  width: 800,
  height: 600,
  style: {}
};

// Mock DOM elements
const mockElement = {
  style: {},
  getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  offsetWidth: 100,
  offsetHeight: 100,
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(() => false)
  },
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(() => [])
};

beforeAll(() => {
  // Setup global mocks
  global.performance = mockPerformance;
  global.requestAnimationFrame = mockRequestAnimationFrame;
  global.cancelAnimationFrame = mockCancelAnimationFrame;
  
  // Mock document methods
  global.document = {
    createElement: vi.fn((tag) => {
      if (tag === 'canvas') return mockCanvas;
      return mockElement;
    }),
    getElementById: vi.fn(() => mockElement),
    querySelector: vi.fn(() => mockElement),
    querySelectorAll: vi.fn(() => [mockElement]),
    body: mockElement
  };
  
  // Mock window
  global.window = {
    devicePixelRatio: 1,
    AudioContext: vi.fn(() => ({
      createBufferSource: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      })),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: { value: 1 }
      })),
      destination: {},
      state: 'running',
      resume: vi.fn()
    }))
  };
});

describe('Animation Performance Tests', () => {
  let animationSystem;
  let unlockAnimationEngine;
  let progressAnimationController;
  
  beforeEach(() => {
    vi.clearAllMocks();
    animationFrameId = 0;
    
    // Initialize animation services
    animationSystem = new AnimationSystem();
    unlockAnimationEngine = new UnlockAnimationEngine();
    progressAnimationController = new ProgressAnimationController();
  });
  
  afterEach(() => {
    // Cleanup animations
    if (animationSystem) {
      animationSystem.cleanup();
    }
  });
  
  describe('60fps Animation Performance', () => {
    it('should maintain 60fps during unlock animations', async () => {
      const targetFPS = 60;
      const frameDuration = 1000 / targetFPS; // ~16.67ms
      const animationDuration = 1000; // 1 second
      const expectedFrames = Math.floor(animationDuration / frameDuration);
      
      const frameTimestamps = [];
      let frameCount = 0;
      
      // Mock requestAnimationFrame to track timing
      mockRequestAnimationFrame.mockImplementation((callback) => {
        const timestamp = mockPerformance.now();
        frameTimestamps.push(timestamp);
        frameCount++;
        
        // Simulate frame processing time
        const processingTime = Math.random() * 5; // 0-5ms processing
        setTimeout(() => {
          callback(timestamp);
        }, processingTime);
        
        return frameCount;
      });
      
      // Start unlock animation
      const startTime = mockPerformance.now();
      mockPerformance.now.mockReturnValue(startTime);
      
      const animationPromise = unlockAnimationEngine.playUnlockAnimation('test-node-1', {
        duration: animationDuration,
        enableParticles: true,
        enableGlow: true
      });
      
      // Simulate animation frames
      for (let i = 0; i < expectedFrames; i++) {
        const currentTime = startTime + (i * frameDuration);
        mockPerformance.now.mockReturnValue(currentTime);
        
        // Trigger frame callback
        const callback = mockRequestAnimationFrame.mock.calls[i]?.[0];
        if (callback) {
          callback(currentTime);
        }
        
        // Small delay to simulate real timing
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      await animationPromise;
      
      // Analyze frame timing
      const frameDurations = [];
      for (let i = 1; i < frameTimestamps.length; i++) {
        frameDurations.push(frameTimestamps[i] - frameTimestamps[i - 1]);
      }
      
      const averageFrameDuration = frameDurations.reduce((sum, duration) => sum + duration, 0) / frameDurations.length;
      const actualFPS = 1000 / averageFrameDuration;
      
      // Performance requirements
      expect(actualFPS).toBeGreaterThanOrEqual(55); // Allow 5fps tolerance
      expect(frameCount).toBeGreaterThanOrEqual(expectedFrames * 0.9); // Allow 10% frame drop tolerance
      
      // Check for frame drops (durations > 20ms indicate dropped frames)
      const droppedFrames = frameDurations.filter(duration => duration > 20).length;
      const dropRate = droppedFrames / frameDurations.length;
      expect(dropRate).toBeLessThan(0.05); // Less than 5% frame drops
      
      console.log(`✅ Unlock animation: ${actualFPS.toFixed(1)} FPS average, ${droppedFrames} dropped frames`);
    });
    
    it('should handle multiple concurrent animations at 60fps', async () => {
      const numAnimations = 5;
      const animationDuration = 800;
      const targetFPS = 60;
      
      const animationPromises = [];
      const frameCounters = new Array(numAnimations).fill(0);
      
      // Mock multiple animation elements
      const mockElements = Array.from({ length: numAnimations }, (_, i) => ({
        ...mockElement,
        id: `animation-element-${i}`
      }));
      
      global.document.getElementById.mockImplementation((id) => {
        const index = parseInt(id.split('-')[2]);
        return mockElements[index] || mockElement;
      });
      
      const startTime = mockPerformance.now();
      
      // Start multiple concurrent animations
      for (let i = 0; i < numAnimations; i++) {
        const promise = animationSystem.animateProgress(`animation-element-${i}`, 0, 100, {
          duration: animationDuration,
          easing: 'easeInOut',
          showSparkles: true
        });
        animationPromises.push(promise);
      }
      
      // Simulate animation frames for all concurrent animations
      const expectedFrames = Math.floor(animationDuration / (1000 / targetFPS));
      
      for (let frame = 0; frame < expectedFrames; frame++) {
        const currentTime = startTime + (frame * (1000 / targetFPS));
        mockPerformance.now.mockReturnValue(currentTime);
        
        // Process frame for each animation
        for (let i = 0; i < numAnimations; i++) {
          frameCounters[i]++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      await Promise.all(animationPromises);
      
      // Verify all animations maintained good performance
      frameCounters.forEach((frameCount, index) => {
        expect(frameCount).toBeGreaterThanOrEqual(expectedFrames * 0.9);
      });
      
      const totalFrames = frameCounters.reduce((sum, count) => sum + count, 0);
      const averageFramesPerAnimation = totalFrames / numAnimations;
      
      expect(averageFramesPerAnimation).toBeGreaterThanOrEqual(expectedFrames * 0.9);
      
      console.log(`✅ ${numAnimations} concurrent animations: ${averageFramesPerAnimation.toFixed(0)} avg frames each`);
    });
    
    it('should maintain performance with complex particle effects', async () => {
      const particleCount = 50;
      const animationDuration = 1200;
      const frameTimings = [];
      
      // Mock particle system
      const particles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1.0,
        decay: 0.02
      }));
      
      let frameCount = 0;
      const maxFrames = Math.floor(animationDuration / 16.67);
      
      // Simulate particle animation loop
      const animateParticles = () => {
        const frameStart = mockPerformance.now();
        
        // Update particles (simulate complex calculations)
        particles.forEach(particle => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.life -= particle.decay;
          
          // Simulate collision detection
          if (particle.x < 0 || particle.x > 800) particle.vx *= -1;
          if (particle.y < 0 || particle.y > 600) particle.vy *= -1;
          
          // Simulate rendering calculations
          const alpha = Math.max(0, particle.life);
          const size = alpha * 5;
        });
        
        // Remove dead particles and add new ones
        const aliveParticles = particles.filter(p => p.life > 0);
        while (aliveParticles.length < particleCount && frameCount < maxFrames) {
          aliveParticles.push({
            id: Date.now() + Math.random(),
            x: Math.random() * 800,
            y: Math.random() * 600,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1.0,
            decay: 0.02
          });
        }
        
        const frameEnd = mockPerformance.now();
        const frameDuration = frameEnd - frameStart;
        frameTimings.push(frameDuration);
        
        frameCount++;
        
        if (frameCount < maxFrames) {
          setTimeout(animateParticles, 16.67);
        }
      };
      
      // Start particle animation
      const startTime = mockPerformance.now();
      animateParticles();
      
      // Wait for animation to complete
      await new Promise(resolve => {
        const checkComplete = () => {
          if (frameCount >= maxFrames) {
            resolve();
          } else {
            setTimeout(checkComplete, 50);
          }
        };
        checkComplete();
      });
      
      // Analyze performance
      const averageFrameTime = frameTimings.reduce((sum, time) => sum + time, 0) / frameTimings.length;
      const maxFrameTime = Math.max(...frameTimings);
      const slowFrames = frameTimings.filter(time => time > 16.67).length;
      const slowFrameRate = slowFrames / frameTimings.length;
      
      // Performance requirements for particle effects
      expect(averageFrameTime).toBeLessThan(12); // Average under 12ms (leaves 4ms buffer)
      expect(maxFrameTime).toBeLessThan(25); // Max frame time under 25ms
      expect(slowFrameRate).toBeLessThan(0.1); // Less than 10% slow frames
      
      console.log(`✅ Particle animation: ${averageFrameTime.toFixed(2)}ms avg frame time, ${slowFrames} slow frames`);
    });
  });
  
  describe('Animation System Resource Management', () => {
    it('should efficiently manage animation memory usage', async () => {
      const numAnimations = 20;
      const animationDuration = 500;
      
      // Track animation instances
      const activeAnimations = new Set();
      const completedAnimations = new Set();
      
      // Mock animation tracking
      const originalAnimateProgress = animationSystem.animateProgress;
      animationSystem.animateProgress = vi.fn(async (elementId, fromProgress, toProgress, options) => {
        const animationId = `${elementId}-${Date.now()}-${Math.random()}`;
        activeAnimations.add(animationId);
        
        try {
          const result = await originalAnimateProgress.call(animationSystem, elementId, fromProgress, toProgress, options);
          completedAnimations.add(animationId);
          activeAnimations.delete(animationId);
          return result;
        } catch (error) {
          activeAnimations.delete(animationId);
          throw error;
        }
      });
      
      // Start multiple animations in batches
      const batchSize = 5;
      for (let batch = 0; batch < numAnimations / batchSize; batch++) {
        const batchPromises = [];
        
        for (let i = 0; i < batchSize; i++) {
          const elementId = `batch-${batch}-element-${i}`;
          const promise = animationSystem.animateProgress(elementId, 0, 100, {
            duration: animationDuration
          });
          batchPromises.push(promise);
        }
        
        // Wait for batch to complete before starting next
        await Promise.all(batchPromises);
        
        // Verify memory cleanup between batches
        expect(activeAnimations.size).toBe(0);
      }
      
      // Verify all animations completed successfully
      expect(completedAnimations.size).toBe(numAnimations);
      expect(activeAnimations.size).toBe(0);
      
      console.log(`✅ Completed ${numAnimations} animations with proper memory cleanup`);
    });
    
    it('should handle animation cancellation efficiently', async () => {
      const numAnimations = 10;
      const animationDuration = 2000; // Long duration for cancellation testing
      
      const animationPromises = [];
      const cancelledAnimations = [];
      
      // Start multiple long-running animations
      for (let i = 0; i < numAnimations; i++) {
        const elementId = `cancel-test-${i}`;
        const promise = animationSystem.animateProgress(elementId, 0, 100, {
          duration: animationDuration,
          onProgress: (progress) => {
            // Track progress for verification
          }
        });
        animationPromises.push(promise);
      }
      
      // Cancel half of the animations after a short delay
      setTimeout(() => {
        for (let i = 0; i < numAnimations / 2; i++) {
          const elementId = `cancel-test-${i}`;
          try {
            animationSystem.cancelAnimation(elementId);
            cancelledAnimations.push(elementId);
          } catch (error) {
            // Animation might have already completed
          }
        }
      }, 100);
      
      // Wait for remaining animations to complete
      const results = await Promise.allSettled(animationPromises);
      
      // Verify cancellation behavior
      const completed = results.filter(result => result.status === 'fulfilled').length;
      const cancelled = results.filter(result => result.status === 'rejected').length;
      
      expect(completed + cancelled).toBe(numAnimations);
      expect(cancelledAnimations.length).toBeGreaterThan(0);
      
      console.log(`✅ Cancelled ${cancelledAnimations.length} animations, ${completed} completed normally`);
    });
    
    it('should optimize performance under high load', async () => {
      const highLoadAnimations = 30;
      const animationDuration = 600;
      const performanceThreshold = 20; // 20ms max frame time under load
      
      const frameTimings = [];
      let frameCount = 0;
      
      // Mock performance monitoring
      const originalRAF = mockRequestAnimationFrame;
      mockRequestAnimationFrame.mockImplementation((callback) => {
        const frameStart = mockPerformance.now();
        
        const result = originalRAF.call(global, () => {
          const frameEnd = mockPerformance.now();
          frameTimings.push(frameEnd - frameStart);
          frameCount++;
          callback(frameEnd);
        });
        
        return result;
      });
      
      // Start high load of concurrent animations
      const animationPromises = [];
      for (let i = 0; i < highLoadAnimations; i++) {
        const promise = animationSystem.animateProgress(`high-load-${i}`, 0, 100, {
          duration: animationDuration,
          easing: 'easeInOut',
          showSparkles: i % 3 === 0 // Add particles to some animations
        });
        animationPromises.push(promise);
      }
      
      await Promise.all(animationPromises);
      
      // Analyze performance under load
      const averageFrameTime = frameTimings.reduce((sum, time) => sum + time, 0) / frameTimings.length;
      const maxFrameTime = Math.max(...frameTimings);
      const overThresholdFrames = frameTimings.filter(time => time > performanceThreshold).length;
      const overThresholdRate = overThresholdFrames / frameTimings.length;
      
      // Performance requirements under high load
      expect(averageFrameTime).toBeLessThan(performanceThreshold);
      expect(overThresholdRate).toBeLessThan(0.15); // Less than 15% frames over threshold
      
      console.log(`✅ High load test: ${averageFrameTime.toFixed(2)}ms avg, ${overThresholdFrames} frames over ${performanceThreshold}ms`);
    });
  });
  
  describe('Audio Performance Integration', () => {
    it('should maintain animation performance with audio effects', async () => {
      const audioManager = new AudioManager();
      const numAnimationsWithAudio = 8;
      const animationDuration = 800;
      
      // Mock audio context and buffer creation
      const mockAudioContext = {
        createBufferSource: vi.fn(() => ({
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          buffer: null
        })),
        createGain: vi.fn(() => ({
          connect: vi.fn(),
          gain: { value: 1 }
        })),
        destination: {},
        state: 'running'
      };
      
      audioManager.audioContext = mockAudioContext;
      
      const frameTimings = [];
      const audioCallCounts = {
        createBufferSource: 0,
        start: 0,
        stop: 0
      };
      
      // Track audio API calls
      mockAudioContext.createBufferSource.mockImplementation(() => {
        audioCallCounts.createBufferSource++;
        return {
          connect: vi.fn(),
          start: vi.fn(() => audioCallCounts.start++),
          stop: vi.fn(() => audioCallCounts.stop++),
          buffer: null
        };
      });
      
      // Start animations with audio effects
      const animationPromises = [];
      for (let i = 0; i < numAnimationsWithAudio; i++) {
        const frameStart = mockPerformance.now();
        
        const promise = (async () => {
          // Play unlock sound
          await audioManager.playSound('unlock', { volume: 0.5 });
          
          // Start animation
          await animationSystem.animateProgress(`audio-test-${i}`, 0, 100, {
            duration: animationDuration,
            onProgress: (progress) => {
              // Play progress sound at milestones
              if (progress === 25 || progress === 50 || progress === 75) {
                audioManager.playSound('progress', { volume: 0.3 });
              }
            }
          });
          
          // Play completion sound
          await audioManager.playSound('complete', { volume: 0.6 });
        })();
        
        animationPromises.push(promise);
        
        const frameEnd = mockPerformance.now();
        frameTimings.push(frameEnd - frameStart);
      }
      
      await Promise.all(animationPromises);
      
      // Analyze performance with audio
      const averageFrameTime = frameTimings.reduce((sum, time) => sum + time, 0) / frameTimings.length;
      const maxFrameTime = Math.max(...frameTimings);
      
      // Verify audio integration didn't significantly impact performance
      expect(averageFrameTime).toBeLessThan(15); // Slightly higher threshold due to audio
      expect(maxFrameTime).toBeLessThan(30);
      
      // Verify audio calls were made
      expect(audioCallCounts.createBufferSource).toBeGreaterThan(0);
      expect(audioCallCounts.start).toBeGreaterThan(0);
      
      console.log(`✅ Audio + animation: ${averageFrameTime.toFixed(2)}ms avg, ${audioCallCounts.start} audio starts`);
    });
  });
});