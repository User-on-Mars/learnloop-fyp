import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import cacheService from '../CacheService.js';

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  quit: jest.fn(),
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  flushAll: jest.fn(),
  info: jest.fn(),
  on: jest.fn()
};

// Mock createClient
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.isConnected = true;
    cacheService.client = mockRedisClient;
  });

  afterEach(() => {
    cacheService.isConnected = false;
    cacheService.client = null;
  });

  describe('Node State Caching', () => {
    it('should cache node state successfully', async () => {
      const nodeId = 'node123';
      const userId = 'user456';
      const nodeData = {
        id: nodeId,
        status: 'completed',
        title: 'Test Node'
      };

      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.cacheNodeState(nodeId, userId, nodeData);

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `node_state:${userId}:${nodeId}`,
        300, // default TTL
        expect.stringContaining('"status":"completed"')
      );
    });

    it('should retrieve cached node state', async () => {
      const nodeId = 'node123';
      const userId = 'user456';
      const cachedData = {
        id: nodeId,
        status: 'completed',
        cachedAt: '2023-01-01T00:00:00.000Z'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cacheService.getNodeState(nodeId, userId);

      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `node_state:${userId}:${nodeId}`
      );
    });

    it('should return null for non-existent cache entry', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.getNodeState('nonexistent', 'user123');

      expect(result).toBeNull();
    });
  });

  describe('Session Data Caching', () => {
    it('should cache session data with custom TTL', async () => {
      const sessionId = 'session123';
      const sessionData = {
        id: sessionId,
        status: 'active',
        startTime: new Date()
      };
      const customTTL = 1800;

      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.cacheSessionData(sessionId, sessionData, customTTL);

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `session_data:${sessionId}`,
        customTTL,
        expect.stringContaining('"status":"active"')
      );
    });

    it('should retrieve cached session data', async () => {
      const sessionId = 'session123';
      const cachedData = {
        id: sessionId,
        status: 'active',
        cachedAt: '2023-01-01T00:00:00.000Z'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cacheService.getSessionData(sessionId);

      expect(result).toEqual(cachedData);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate node cache', async () => {
      const nodeId = 'node123';
      const userId = 'user456';

      mockRedisClient.del.mockResolvedValue(2);

      const result = await cacheService.invalidateNodeCache(nodeId, userId);

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        `node_state:${userId}:${nodeId}`,
        `unlock_validation:${userId}:${nodeId}`
      ]);
    });

    it('should invalidate skill map cache and related nodes', async () => {
      const skillId = 'skill123';
      const userId = 'user456';

      mockRedisClient.keys.mockResolvedValueOnce(['node_state:user456:node1', 'node_state:user456:node2']);
      mockRedisClient.keys.mockResolvedValueOnce(['unlock_validation:user456:node1']);
      mockRedisClient.del.mockResolvedValue(5);

      const result = await cacheService.invalidateSkillMapCache(skillId, userId);

      expect(result).toBe(true);
      expect(mockRedisClient.keys).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        `skill_map:${userId}:${skillId}`,
        `user_progression:${userId}:${skillId}`,
        'node_state:user456:node1',
        'node_state:user456:node2',
        'unlock_validation:user456:node1'
      ]);
    });

    it('should handle cache invalidation when Redis is unavailable', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.invalidateNodeCache('node123', 'user456');

      expect(result).toBe(false);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('Skill Map Caching', () => {
    it('should cache skill map configuration', async () => {
      const skillId = 'skill123';
      const userId = 'user456';
      const skillMapData = {
        id: skillId,
        nodeLimit: 5,
        theme: 'pixel-art'
      };

      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.cacheSkillMap(skillId, userId, skillMapData);

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `skill_map:${userId}:${skillId}`,
        600, // 10 minutes TTL
        expect.stringContaining('"nodeLimit":5')
      );
    });
  });

  describe('User Progression Caching', () => {
    it('should cache user progression data', async () => {
      const userId = 'user456';
      const skillId = 'skill123';
      const progressionData = {
        completedNodes: 3,
        totalNodes: 5,
        progressPercentage: 60
      };

      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.cacheUserProgression(userId, skillId, progressionData);

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `user_progression:${userId}:${skillId}`,
        300, // default TTL
        expect.stringContaining('"progressPercentage":60')
      );
    });
  });

  describe('Unlock Validation Caching', () => {
    it('should cache unlock validation results', async () => {
      const nodeId = 'node123';
      const userId = 'user456';
      const validationResult = {
        isValid: true,
        reason: 'Previous node completed'
      };

      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.cacheUnlockValidation(nodeId, userId, validationResult);

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `unlock_validation:${userId}:${nodeId}`,
        60, // 1 minute TTL
        expect.stringContaining('"isValid":true')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.cacheNodeState('node123', 'user456', {});

      expect(result).toBe(false);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');

      const result = await cacheService.getNodeState('node123', 'user456');

      expect(result).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache statistics', async () => {
      const mockMemoryInfo = 'used_memory:1024000\nused_memory_human:1.00M';
      const mockKeyspaceInfo = 'db0:keys=100,expires=50';

      mockRedisClient.info.mockResolvedValueOnce(mockMemoryInfo);
      mockRedisClient.info.mockResolvedValueOnce(mockKeyspaceInfo);

      const stats = await cacheService.getStats();

      expect(stats).toEqual({
        connected: true,
        memory: mockMemoryInfo,
        keyspace: mockKeyspaceInfo,
        timestamp: expect.any(String)
      });
    });

    it('should return null when Redis is unavailable', async () => {
      cacheService.isConnected = false;

      const stats = await cacheService.getStats();

      expect(stats).toBeNull();
    });
  });

  describe('Cache Cleanup', () => {
    it('should clear all cache', async () => {
      mockRedisClient.flushAll.mockResolvedValue('OK');

      const result = await cacheService.clearAll();

      expect(result).toBe(true);
      expect(mockRedisClient.flushAll).toHaveBeenCalled();
    });
  });
});