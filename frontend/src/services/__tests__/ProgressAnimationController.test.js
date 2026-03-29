/**
 * ProgressAnimationController Tests
 * 
 * Tests for progress update animations and celebration effects
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ProgressAnimationController from '../ProgressAnimationController.js';

// Mock DOM methods
const mockProgressElement = {
  style: {},
  querySelector: vi.fn(() => ({ style: {} })),
  querySelectorAll: vi.fn(() => []),
  appendChild: vi.fn(),
  removeChild: vi.fn()
};

const mockDocument = {
  getElementById: vi.fn(() => mockProgressElement),
  querySelector: vi.fn(() => mockProgressElement),
  createElement: vi.fn(() => mockProgressElement),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
};

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now())
};

// Mock requestAnimationFrame
let animationFrameCallbacks = [];
const mockRequestAnimationFrame = vi.fn((callback) => {
  const id = animationFrameCallbacks.length;
  animationFrameCallbacks.push(callback);
  return id;
});

// Setup global mocks
global.document = mockDocument;
global.performance = mockPerformance;
global.requestAnimationFrame = mockRequestAnimationFrame;

describe('ProgressAnimationController', () => {
  let controller;

  beforeEach(() => {
    controller = new ProgressAnimationController({
      animationDuration: 500,
      celebrationDuration: 1000
    });
    
    // Reset mocks
    vi.clearAllMocks();
    animationFrameCallbacks = [];
    mockPerformance.now.mockReturnValue(1000);
  });

  afterEach(() => {
    controller.clearAll();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultController = new ProgressAnimationController();
      
      expect(defaultController.animationDuration).toBe(1000);
      expect(defaultController.celebrationDuration).toBe(3000);
      expect(defaultController.activeProgressAnimations).toBeInstanceOf(Map);
      expect(defaultController.celebrationEffects).toBeInstanceOf(Map);
    });

    it('should initialize with custom options', () => {
      expect(controller.animationDuration).toBe(500);
      expect(controller.celebrationDuration).toBe(1000);
    });

    it('should initialize performance tracker', () => {
      expect(controller.performanceTracker).toEqual({
        animationsCompleted: 0,
        averageDuration: 0,
        celebrationsTriggered: 0
      });
    });
  });

  describe('Progress Animation', () => {
    beforeEach(() => {
      mockDocument.getElementById.mockReturnValue(mockProgressElement);
      mockProgressElement.querySelector.mockReturnValue({ style: {} });
    });

    it('should animate progress update successfully', async () => {
      let progressCallback = null;
      let completeCallback = null;
      
      const animationPromise = controller.animateProgressUpdate('test-progress', 0, 100, {
        duration: 100,
        onProgress: (progress, animationProgress) => {
          progressCallback = { progress, animationProgress };
        },
        onComplete: (finalProgress) => {
          completeCallback = finalProgress;
        }
      });

      // Simulate animation frames
      setTimeout(() => {
        animationFrameCallbacks.forEach(callback => {
          if (callback) {
            mockPerformance.now.mockReturnValue(mockPerformance.now() + 50);
            callback(mockPerformance.now());
          }
        });
      }, 10);

      const result = await animationPromise;
      
      expect(result).toBe(true);
      expect(progressCallback).toBeTruthy();
      expect(completeCallback).toBe(100);
    });

    it('should prevent multiple animations on same element', async () => {
      const animation1Promise = controller.animateProgressUpdate('test-progress', 0, 50, { duration: 1000 });
      const animation2Promise = controller.animateProgressUpdate('test-progress', 50, 100, { duration: 1000 });
      
      expect(controller.activeProgressAnimations.has('test-progress')).toBe(true);
      
      // Complete animations
      setTimeout(() => {
        animationFrameCallbacks.forEach(callback => {
          if (callback) callback(mockPerformance.now() + 1100);
        });
      }, 10);

      await Promise.all([animation1Promise, animation2Promise]);
    });

    it('should handle invalid progress values', async () => {
      const result = await controller.animateProgressUpdate('test-progress', -10, 150);
      
      // Should clamp values to 0-100 range
      const animation = controller._createProgressAnimation({
        elementId: 'test-progress',
        fromProgress: -10,
        toProgress: 150,
        duration: 1000
      });
      
      expect(animation.fromProgress).toBe(0);
      expect(animation.toProgress).toBe(100);
    });
  });

  describe('Easing Functions', () => {
    it('should apply easeIn correctly', () => {
      const result = controller._applyEasing(0.5, 'easeIn');
      expect(result).toBe(0.25); // 0.5^2
    });

    it('should apply easeOut correctly', () => {
      const result = controller._applyEasing(0.5, 'easeOut');
      expect(result).toBe(0.75); // 1 - (1-0.5)^2
    });

    it('should apply easeInOut correctly', () => {
      const result1 = controller._applyEasing(0.25, 'easeInOut');
      const result2 = controller._applyEasing(0.75, 'easeInOut');
      
      expect(result1).toBeLessThan(0.25);
      expect(result2).toBeGreaterThan(0.75);
    });

    it('should apply bounce easing', () => {
      const result = controller._applyEasing(0.8, 'bounce');
      expect(result).toBeTypeOf('number');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should return linear for unknown easing', () => {
      const result = controller._applyEasing(0.5, 'unknown');
      expect(result).toBe(0.5);
    });
  });

  describe('Celebration System', () => {
    beforeEach(() => {
      mockDocument.createElement.mockReturnValue(mockProgressElement);
    });

    it('should trigger session completion celebration', async () => {
      const sessionData = {
        reflection: { understanding: 4, difficulty: 3 },
        duration: 1800000 // 30 minutes
      };

      let celebrationComplete = false;
      const celebrationPromise = controller.triggerSessionCompletionCelebration('test-session', sessionData, {
        duration: 100,
        onComplete: () => { celebrationComplete = true; }
      });

      // Simulate animation frames
      setTimeout(() => {
        animationFrameCallbacks.forEach(callback => {
          if (callback) {
            mockPerformance.now.mockReturnValue(mockPerformance.now() + 50);
            callback(mockPerformance.now());
          }
        });
      }, 10);

      const result = await celebrationPromise;
      
      expect(result).toBe(true);
      expect(celebrationComplete).toBe(true);
      expect(controller.performanceTracker.celebrationsTriggered).toBe(1);
    });

    it('should calculate celebration intensity correctly', () => {
      const sessionData1 = {
        reflection: { understanding: 5, difficulty: 1 },
        duration: 3600000 // 1 hour
      };
      
      const sessionData2 = {
        reflection: { understanding: 2, difficulty: 4 },
        duration: 600000 // 10 minutes
      };

      const intensity1 = controller._calculateCelebrationIntensity(sessionData1);
      const intensity2 = controller._calculateCelebrationIntensity(sessionData2);
      
      expect(intensity1).toBeGreaterThan(intensity2);
      expect(intensity1).toBeLessThanOrEqual(1.0);
      expect(intensity2).toBeGreaterThanOrEqual(0.5);
    });

    it('should create celebration sequence with correct phases', () => {
      const config = {
        sessionId: 'test-session',
        sessionData: {},
        duration: 2000,
        intensity: 0.8
      };

      const celebration = controller._createCelebrationSequence(config);

      expect(celebration.sessionId).toBe('test-session');
      expect(celebration.phases).toHaveLength(4);
      expect(celebration.phases[0].name).toBe('buildup');
      expect(celebration.phases[1].name).toBe('burst');
      expect(celebration.phases[2].name).toBe('celebration');
      expect(celebration.phases[3].name).toBe('settle');
      
      // Check phase durations sum to total
      const totalPhaseDuration = celebration.phases.reduce((sum, phase) => sum + phase.duration, 0);
      expect(totalPhaseDuration).toBe(2000);
    });

    it('should create confetti particles', () => {
      const celebration = {
        intensity: 0.8,
        confettiParticles: []
      };

      controller._createConfettiParticles(celebration);

      expect(celebration.confettiParticles.length).toBeGreaterThan(0);
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('State Transitions', () => {
    beforeEach(() => {
      mockDocument.querySelector.mockReturnValue(mockProgressElement);
    });

    it('should animate state transition successfully', async () => {
      let transitionComplete = false;
      
      const result = await controller.animateStateTransition('test-node', 'locked', 'not_started', {
        duration: 100,
        onComplete: () => { transitionComplete = true; }
      });

      expect(result).toBe(true);
      expect(transitionComplete).toBe(true);
    });

    it('should get correct transition effects', () => {
      const effects1 = controller._getStateTransitionEffects('locked', 'not_started');
      const effects2 = controller._getStateTransitionEffects('in_progress', 'completed');
      const effects3 = controller._getStateTransitionEffects('unknown', 'locked');

      expect(effects1).toContain('unlock_glow');
      expect(effects2).toContain('completion_burst');
      expect(effects3).toEqual(['fade_transition']);
    });

    it('should apply transition effects to element', () => {
      const config = { nodeId: 'test-node' };
      
      controller._applyTransitionEffect(mockProgressElement, 'unlock_glow', config);
      expect(mockProgressElement.style.filter).toContain('drop-shadow');
      
      controller._applyTransitionEffect(mockProgressElement, 'scale_bounce', config);
      expect(mockProgressElement.style.transform).toContain('scale');
      
      controller._applyTransitionEffect(mockProgressElement, 'completion_burst', config);
      expect(mockProgressElement.style.filter).toContain('brightness');
    });
  });

  describe('Sparkle Effects', () => {
    beforeEach(() => {
      mockProgressElement.querySelectorAll.mockReturnValue([]);
    });

    it('should generate sparkle positions', () => {
      const positions = controller._generateSparklePositions();
      
      expect(positions).toHaveLength(10);
      positions.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThanOrEqual(100);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThanOrEqual(100);
        expect(pos.delay).toBeGreaterThanOrEqual(0);
      });
    });

    it('should update progress sparkles', () => {
      const animation = {
        currentProgress: 50,
        showSparkles: true
      };

      controller._updateProgressSparkles(mockProgressElement, animation, 0.5);

      expect(mockProgressElement.appendChild).toHaveBeenCalled();
    });
  });

  describe('Performance Tracking', () => {
    it('should update performance metrics', () => {
      const initialCount = controller.performanceTracker.animationsCompleted;
      
      controller._updateProgressPerformanceMetrics(100);
      
      expect(controller.performanceTracker.averageDuration).toBeGreaterThan(0);
    });

    it('should return performance statistics', () => {
      const stats = controller.getPerformanceStats();

      expect(stats).toHaveProperty('animationsCompleted');
      expect(stats).toHaveProperty('averageDuration');
      expect(stats).toHaveProperty('celebrationsTriggered');
      expect(stats).toHaveProperty('activeProgressAnimations');
      expect(stats).toHaveProperty('activeCelebrations');
    });
  });

  describe('Animation Control', () => {
    it('should stop progress animation', async () => {
      const animationPromise = controller.animateProgressUpdate('test-progress', 0, 100, { duration: 1000 });
      
      expect(controller.activeProgressAnimations.has('test-progress')).toBe(true);
      
      await controller.stopProgressAnimation('test-progress');
      
      expect(controller.activeProgressAnimations.has('test-progress')).toBe(false);
    });

    it('should clear all animations', () => {
      controller.activeProgressAnimations.set('progress1', { isActive: true });
      controller.celebrationEffects.set('celebration1', { isActive: true });
      
      controller.clearAll();
      
      expect(controller.activeProgressAnimations.size).toBe(0);
      expect(controller.celebrationEffects.size).toBe(0);
    });
  });

  describe('Fallback Handling', () => {
    it('should handle missing element gracefully', async () => {
      mockDocument.getElementById.mockReturnValue(null);
      
      const result = await controller.animateProgressUpdate('nonexistent-element', 0, 100);
      
      // Should still return true even if element not found
      expect(result).toBe(true);
    });

    it('should handle animation failure with fallback', () => {
      mockDocument.getElementById.mockReturnValue(mockProgressElement);
      
      controller._handleProgressAnimationFailure('test-progress', 0, 100);
      
      // Should set progress directly as fallback
      const progressBar = mockProgressElement.querySelector('.progress-bar') || mockProgressElement;
      expect(progressBar.style.width).toBe('100%');
    });
  });

  describe('Progress Frame Rendering', () => {
    beforeEach(() => {
      mockDocument.getElementById.mockReturnValue(mockProgressElement);
      mockProgressElement.querySelector.mockReturnValue({ style: {} });
    });

    it('should render progress frame correctly', () => {
      const animation = {
        elementId: 'test-progress',
        currentProgress: 50,
        showSparkles: true,
        onProgress: vi.fn()
      };

      controller._renderProgressFrame(animation, 0.5);

      const progressBar = mockProgressElement.querySelector('.progress-bar') || mockProgressElement;
      expect(progressBar.style.width).toBe('50%');
      expect(progressBar.style.boxShadow).toContain('rgba(59, 130, 246');
      expect(animation.onProgress).toHaveBeenCalledWith(50, 0.5);
    });
  });
});