/**
 * AudioManager Tests
 * 
 * Tests for Web Audio API sound effects and audio management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AudioManager from '../AudioManager.js';

// Mock Web Audio API
const mockAudioBuffer = {
  duration: 1.0,
  sampleRate: 44100,
  numberOfChannels: 1,
  getChannelData: vi.fn(() => new Float32Array(44100))
};

const mockBufferSource = {
  buffer: null,
  playbackRate: { value: 1.0 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null
};

const mockGainNode = {
  gain: { value: 1.0 },
  connect: vi.fn()
};

const mockBiquadFilter = {
  type: 'lowpass',
  frequency: { value: 1000 },
  Q: { value: 1 },
  connect: vi.fn()
};

const mockConvolver = {
  buffer: null,
  connect: vi.fn()
};

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  sampleRate: 44100,
  destination: {},
  createBuffer: vi.fn(() => mockAudioBuffer),
  createBufferSource: vi.fn(() => mockBufferSource),
  createGain: vi.fn(() => mockGainNode),
  createBiquadFilter: vi.fn(() => mockBiquadFilter),
  createConvolver: vi.fn(() => mockConvolver),
  decodeAudioData: vi.fn(() => Promise.resolve(mockAudioBuffer)),
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve())
};

// Mock fetch for loading audio files
const mockFetch = vi.fn(() => Promise.resolve({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
}));

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now())
};

// Mock document for event listeners
const mockDocument = {
  addEventListener: vi.fn()
};

// Setup global mocks
global.AudioContext = vi.fn(() => mockAudioContext);
global.webkitAudioContext = vi.fn(() => mockAudioContext);
global.fetch = mockFetch;
global.performance = mockPerformance;
global.document = mockDocument;

describe('AudioManager', () => {
  let audioManager;

  beforeEach(() => {
    audioManager = new AudioManager({
      masterVolume: 0.8,
      sfxVolume: 0.7,
      muted: false
    });
    
    // Reset mocks
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(1000);
  });

  afterEach(() => {
    audioManager.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      const defaultManager = new AudioManager();
      
      expect(defaultManager.settings.masterVolume).toBe(0.7);
      expect(defaultManager.settings.sfxVolume).toBe(0.8);
      expect(defaultManager.settings.musicVolume).toBe(0.5);
      expect(defaultManager.settings.muted).toBe(false);
    });

    it('should initialize with custom settings', () => {
      expect(audioManager.settings.masterVolume).toBe(0.8);
      expect(audioManager.settings.sfxVolume).toBe(0.7);
      expect(audioManager.settings.muted).toBe(false);
    });

    it('should create audio context', () => {
      expect(global.AudioContext).toHaveBeenCalled();
      expect(audioManager.audioContext).toBe(mockAudioContext);
      expect(audioManager.masterGainNode).toBe(mockGainNode);
    });

    it('should handle audio context creation failure', () => {
      global.AudioContext = vi.fn(() => { throw new Error('Not supported'); });
      
      const manager = new AudioManager();
      
      expect(manager.audioContext).toBeNull();
    });

    it('should set up event listeners for user interaction', () => {
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), { once: true });
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { once: true });
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), { once: true });
    });
  });

  describe('Sound Loading', () => {
    it('should load sound from URL successfully', async () => {
      const result = await audioManager.loadSound('test-sound', 'http://example.com/sound.mp3');
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://example.com/sound.mp3');
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(audioManager.soundBuffers.has('test-sound')).toBe(true);
    });

    it('should handle URL loading failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await audioManager.loadSound('test-sound', 'http://example.com/missing.mp3');
      
      expect(result).toBe(false);
      expect(audioManager.performanceTracker.loadErrors).toBe(1);
    });

    it('should generate procedural sound successfully', async () => {
      const soundConfig = {
        type: 'sine',
        frequency: 440,
        duration: 0.5,
        envelope: { attack: 0.1, decay: 0.1, sustain: 0.7, release: 0.3 }
      };

      const result = await audioManager.loadSound('procedural-sound', soundConfig);
      
      expect(result).toBe(true);
      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
      expect(audioManager.soundBuffers.has('procedural-sound')).toBe(true);
    });

    it('should handle invalid sound source', async () => {
      const result = await audioManager.loadSound('invalid-sound', 123);
      
      expect(result).toBe(false);
      expect(audioManager.performanceTracker.loadErrors).toBe(1);
    });
  });

  describe('Procedural Sound Generation', () => {
    it('should generate sine wave correctly', () => {
      const sample = audioManager._generateWaveformSample('sine', 440, 0.5, {});
      expect(sample).toBeTypeOf('number');
      expect(sample).toBeGreaterThanOrEqual(-1);
      expect(sample).toBeLessThanOrEqual(1);
    });

    it('should generate square wave correctly', () => {
      const sample = audioManager._generateWaveformSample('square', 440, 0.5, {});
      expect(sample).toBeTypeOf('number');
      expect(Math.abs(sample)).toBe(1); // Square wave should be -1 or 1
    });

    it('should generate sawtooth wave correctly', () => {
      const sample = audioManager._generateWaveformSample('sawtooth', 440, 0.5, {});
      expect(sample).toBeTypeOf('number');
      expect(sample).toBeGreaterThanOrEqual(-1);
      expect(sample).toBeLessThanOrEqual(1);
    });

    it('should generate noise correctly', () => {
      const sample = audioManager._generateWaveformSample('noise', 440, 0.5, {});
      expect(sample).toBeTypeOf('number');
      expect(sample).toBeGreaterThanOrEqual(-1);
      expect(sample).toBeLessThanOrEqual(1);
    });

    it('should generate chord correctly', () => {
      const config = { frequencies: [440, 550, 660] };
      const sample = audioManager._generateWaveformSample('chord', 440, 0.5, config);
      expect(sample).toBeTypeOf('number');
      expect(sample).toBeGreaterThanOrEqual(-1);
      expect(sample).toBeLessThanOrEqual(1);
    });

    it('should calculate envelope correctly', () => {
      const envelope = { attack: 0.2, decay: 0.2, sustain: 0.6, release: 0.2 };
      
      // Attack phase
      const attackSample = audioManager._calculateEnvelope(0.1, 1.0, envelope);
      expect(attackSample).toBeLessThan(1);
      
      // Sustain phase
      const sustainSample = audioManager._calculateEnvelope(0.5, 1.0, envelope);
      expect(sustainSample).toBe(0.6);
      
      // Release phase
      const releaseSample = audioManager._calculateEnvelope(0.9, 1.0, envelope);
      expect(releaseSample).toBeLessThan(0.6);
    });
  });

  describe('Sound Playback', () => {
    beforeEach(async () => {
      // Load a test sound
      await audioManager.loadSound('test-sound', {
        type: 'sine',
        frequency: 440,
        duration: 0.5
      });
    });

    it('should play sound successfully', async () => {
      const soundId = await audioManager.playSound('test-sound', { volume: 0.5 });
      
      expect(soundId).toBeTypeOf('string');
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockBufferSource.start).toHaveBeenCalled();
      expect(audioManager.activeSounds.has(soundId)).toBe(true);
    });

    it('should handle muted playback', async () => {
      audioManager.setMuted(true);
      
      const soundId = await audioManager.playSound('test-sound');
      
      expect(soundId).toBeNull();
    });

    it('should handle missing sound', async () => {
      const soundId = await audioManager.playSound('nonexistent-sound');
      
      expect(soundId).toBeNull();
    });

    it('should handle audio context not available', async () => {
      audioManager.audioContext = null;
      
      const soundId = await audioManager.playSound('test-sound');
      
      expect(soundId).toBeNull();
    });

    it('should apply pitch adjustment', async () => {
      const soundId = await audioManager.playSound('test-sound', { pitch: 1.5 });
      
      expect(mockBufferSource.playbackRate.value).toBe(1.5);
    });

    it('should apply volume control', async () => {
      await audioManager.playSound('test-sound', { volume: 0.3 });
      
      const expectedVolume = 0.3 * audioManager.settings.sfxVolume;
      expect(mockGainNode.gain.value).toBe(expectedVolume);
    });
  });

  describe('Specialized Sound Methods', () => {
    beforeEach(async () => {
      await audioManager.loadSound('unlock', audioManager._generateUnlockSound());
      await audioManager.loadSound('progress', audioManager._generateProgressSound());
      await audioManager.loadSound('completion', audioManager._generateCompletionSound());
    });

    it('should play unlock sound with correct parameters', async () => {
      const soundId = await audioManager.playUnlockSound({ volume: 0.9, pitch: 1.2 });
      
      expect(soundId).toBeTypeOf('string');
      expect(mockBufferSource.playbackRate.value).toBe(1.2);
    });

    it('should play progress sound with pitch based on progress', async () => {
      const soundId = await audioManager.playProgressSound(0.7, { volume: 0.5 });
      
      expect(soundId).toBeTypeOf('string');
      const expectedPitch = 0.8 + (0.7 * 0.6); // basePitch + (progress * pitchRange)
      expect(mockBufferSource.playbackRate.value).toBe(expectedPitch);
    });

    it('should play completion sound with intensity calculation', async () => {
      const sessionData = {
        reflection: { understanding: 4, difficulty: 2 }
      };
      
      const soundId = await audioManager.playCompletionSound(sessionData, { volume: 0.8 });
      
      expect(soundId).toBeTypeOf('string');
    });
  });

  describe('Sound Control', () => {
    let soundId;

    beforeEach(async () => {
      await audioManager.loadSound('test-sound', {
        type: 'sine',
        frequency: 440,
        duration: 0.5
      });
      soundId = await audioManager.playSound('test-sound');
    });

    it('should stop specific sound', () => {
      expect(audioManager.activeSounds.has(soundId)).toBe(true);
      
      audioManager.stopSound(soundId);
      
      expect(mockBufferSource.stop).toHaveBeenCalled();
      expect(audioManager.activeSounds.has(soundId)).toBe(false);
    });

    it('should stop all sounds', () => {
      audioManager.stopAllSounds();
      
      expect(audioManager.activeSounds.size).toBe(0);
    });

    it('should handle stopping non-existent sound', () => {
      expect(() => {
        audioManager.stopSound('nonexistent-id');
      }).not.toThrow();
    });
  });

  describe('Volume and Settings Management', () => {
    it('should set master volume', () => {
      audioManager.setMasterVolume(0.5);
      
      expect(audioManager.settings.masterVolume).toBe(0.5);
      expect(mockGainNode.gain.value).toBe(0.5);
    });

    it('should clamp master volume to valid range', () => {
      audioManager.setMasterVolume(1.5);
      expect(audioManager.settings.masterVolume).toBe(1.0);
      
      audioManager.setMasterVolume(-0.5);
      expect(audioManager.settings.masterVolume).toBe(0.0);
    });

    it('should set SFX volume', () => {
      audioManager.setSfxVolume(0.6);
      
      expect(audioManager.settings.sfxVolume).toBe(0.6);
    });

    it('should set music volume', () => {
      audioManager.setMusicVolume(0.4);
      
      expect(audioManager.settings.musicVolume).toBe(0.4);
    });

    it('should toggle mute state', () => {
      audioManager.setMuted(true);
      
      expect(audioManager.settings.muted).toBe(true);
      expect(mockGainNode.gain.value).toBe(0);
      
      audioManager.setMuted(false);
      
      expect(audioManager.settings.muted).toBe(false);
      expect(mockGainNode.gain.value).toBe(audioManager.settings.masterVolume);
    });

    it('should update settings object', () => {
      const newSettings = {
        masterVolume: 0.9,
        sfxVolume: 0.8,
        muted: true
      };
      
      audioManager.updateSettings(newSettings);
      
      expect(audioManager.settings.masterVolume).toBe(0.9);
      expect(audioManager.settings.sfxVolume).toBe(0.8);
      expect(audioManager.settings.muted).toBe(true);
    });

    it('should get current settings', () => {
      const settings = audioManager.getSettings();
      
      expect(settings).toEqual(audioManager.settings);
      expect(settings).not.toBe(audioManager.settings); // Should be a copy
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', () => {
      audioManager._updateLatencyMetrics(15.5);
      
      expect(audioManager.performanceTracker.averageLatency).toBeGreaterThan(0);
    });

    it('should return performance statistics', () => {
      const stats = audioManager.getPerformanceStats();
      
      expect(stats).toHaveProperty('soundsPlayed');
      expect(stats).toHaveProperty('soundsLoaded');
      expect(stats).toHaveProperty('loadErrors');
      expect(stats).toHaveProperty('averageLatency');
      expect(stats).toHaveProperty('activeSounds');
      expect(stats).toHaveProperty('loadedSounds');
      expect(stats).toHaveProperty('audioContextState');
    });

    it('should calculate sound intensity correctly', () => {
      const sessionData1 = {
        reflection: { understanding: 5, difficulty: 1 }
      };
      
      const sessionData2 = {
        reflection: { understanding: 2, difficulty: 4 }
      };

      const intensity1 = audioManager._calculateSoundIntensity(sessionData1);
      const intensity2 = audioManager._calculateSoundIntensity(sessionData2);
      
      expect(intensity1).toBeGreaterThan(intensity2);
      expect(intensity1).toBeLessThanOrEqual(1.0);
      expect(intensity2).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('Audio Testing', () => {
    it('should test audio functionality successfully', async () => {
      await audioManager.loadSound('notification', audioManager._generateNotificationSound());
      
      const result = await audioManager.testAudio();
      
      expect(result).toBe(true);
    });

    it('should handle audio test failure', async () => {
      audioManager.audioContext = null;
      
      const result = await audioManager.testAudio();
      
      expect(result).toBe(false);
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources properly', () => {
      audioManager.dispose();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(audioManager.audioContext).toBeNull();
      expect(audioManager.soundBuffers.size).toBe(0);
      expect(audioManager.activeSounds.size).toBe(0);
    });
  });

  describe('Default Sound Generation', () => {
    it('should generate unlock sound configuration', () => {
      const config = audioManager._generateUnlockSound();
      
      expect(config.type).toBe('chord');
      expect(config.frequencies).toHaveLength(3);
      expect(config.duration).toBe(1.2);
      expect(config.envelope).toBeDefined();
    });

    it('should generate progress sound configuration', () => {
      const config = audioManager._generateProgressSound();
      
      expect(config.type).toBe('sine');
      expect(config.frequency).toBe(440);
      expect(config.duration).toBe(0.3);
    });

    it('should generate completion sound configuration', () => {
      const config = audioManager._generateCompletionSound();
      
      expect(config.type).toBe('chord');
      expect(config.frequencies).toHaveLength(4);
      expect(config.duration).toBe(2.0);
    });

    it('should generate all default sounds', () => {
      const unlockConfig = audioManager._generateUnlockSound();
      const progressConfig = audioManager._generateProgressSound();
      const completionConfig = audioManager._generateCompletionSound();
      const celebrationConfig = audioManager._generateCelebrationSound();
      const notificationConfig = audioManager._generateNotificationSound();
      const errorConfig = audioManager._generateErrorSound();
      const clickConfig = audioManager._generateClickSound();
      const hoverConfig = audioManager._generateHoverSound();
      
      expect(unlockConfig).toBeDefined();
      expect(progressConfig).toBeDefined();
      expect(completionConfig).toBeDefined();
      expect(celebrationConfig).toBeDefined();
      expect(notificationConfig).toBeDefined();
      expect(errorConfig).toBeDefined();
      expect(clickConfig).toBeDefined();
      expect(hoverConfig).toBeDefined();
    });
  });
});