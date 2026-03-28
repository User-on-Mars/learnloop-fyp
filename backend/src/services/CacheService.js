import { createClient } from 'redis';

/**
 * CacheService - Redis caching layer for performance optimization
 * 
 * Provides caching for:
 * - Node state data for frequent queries
 * - Session data for active sessions
 * - Skill map configurations
 * - User progression data
 * 
 * Implements cache invalidation strategies to maintain data consistency
 * Requirements: 7.5, 6.3
 */
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes default TTL
    this.keyPrefixes = {
      NODE_STATE: 'node_state:',
      SESSION_DATA: 'session_data:',
      SKILL_MAP: 'skill_map:',
      USER_PROGRESSION: 'user_progression:',
      UNLOCK_VALIDATION: 'unlock_validation:'
    };
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      // Check if Redis should be disabled
      if (process.env.DISABLE_REDIS === 'true') {
        console.log('Redis disabled via environment variable');
        this.isConnected = false;
        return;
      }

      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis Client Ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      // Don't throw the error, just log it and continue without Redis
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return this.isConnected && this.client;
  }

  /**
   * Cache node state data
   */
  async cacheNodeState(nodeId, userId, nodeData, ttl = this.defaultTTL) {
    if (!this.isAvailable()) return false;

    try {
      const key = `${this.keyPrefixes.NODE_STATE}${userId}:${nodeId}`;
      const value = JSON.stringify({
        ...nodeData,
        cachedAt: new Date().toISOString()
      });
      
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Error caching node state:', error);
      return false;
    }
  }

  /**
   * Get cached node state
   */
  async getNodeState(nodeId, userId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${this.keyPrefixes.NODE_STATE}${userId}:${nodeId}`;
      const cached = await this.client.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached node state:', error);
      return null;
    }
  }

  /**
   * Cache session data
   */
  async cacheSessionData(sessionId, sessionData, ttl = 1800) { // 30 minutes for active sessions
    if (!this.isAvailable()) return false;

    try {
      const key = `${this.keyPrefixes.SESSION_DATA}${sessionId}`;
      const value = JSON.stringify({
        ...sessionData,
        cachedAt: new Date().toISOString()
      });
      
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Error caching session data:', error);
      return false;
    }
  }

  /**
   * Get cached session data
   */
  async getSessionData(sessionId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${this.keyPrefixes.SESSION_DATA}${sessionId}`;
      const cached = await this.client.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached session data:', error);
      return null;
    }
  }

  /**
   * Cache skill map configuration
   */
  async cacheSkillMap(skillId, userId, skillMapData, ttl = 600) { // 10 minutes
    if (!this.isAvailable()) return false;

    try {
      const key = `${this.keyPrefixes.SKILL_MAP}${userId}:${skillId}`;
      const value = JSON.stringify({
        ...skillMapData,
        cachedAt: new Date().toISOString()
      });
      
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Error caching skill map:', error);
      return false;
    }
  }

  /**
   * Get cached skill map
   */
  async getSkillMap(skillId, userId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${this.keyPrefixes.SKILL_MAP}${userId}:${skillId}`;
      const cached = await this.client.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached skill map:', error);
      return null;
    }
  }

  /**
   * Cache user progression data
   */
  async cacheUserProgression(userId, skillId, progressionData, ttl = this.defaultTTL) {
    if (!this.isAvailable()) return false;

    try {
      const key = `${this.keyPrefixes.USER_PROGRESSION}${userId}:${skillId}`;
      const value = JSON.stringify({
        ...progressionData,
        cachedAt: new Date().toISOString()
      });
      
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Error caching user progression:', error);
      return false;
    }
  }

  /**
   * Get cached user progression
   */
  async getUserProgression(userId, skillId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${this.keyPrefixes.USER_PROGRESSION}${userId}:${skillId}`;
      const cached = await this.client.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached user progression:', error);
      return null;
    }
  }

  /**
   * Cache unlock validation results
   */
  async cacheUnlockValidation(nodeId, userId, validationResult, ttl = 60) { // 1 minute for validation cache
    if (!this.isAvailable()) return false;

    try {
      const key = `${this.keyPrefixes.UNLOCK_VALIDATION}${userId}:${nodeId}`;
      const value = JSON.stringify({
        ...validationResult,
        cachedAt: new Date().toISOString()
      });
      
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Error caching unlock validation:', error);
      return false;
    }
  }

  /**
   * Get cached unlock validation
   */
  async getUnlockValidation(nodeId, userId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `${this.keyPrefixes.UNLOCK_VALIDATION}${userId}:${nodeId}`;
      const cached = await this.client.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached unlock validation:', error);
      return null;
    }
  }

  /**
   * Invalidate cache for a specific node
   */
  async invalidateNodeCache(nodeId, userId) {
    if (!this.isAvailable()) return false;

    try {
      const keys = [
        `${this.keyPrefixes.NODE_STATE}${userId}:${nodeId}`,
        `${this.keyPrefixes.UNLOCK_VALIDATION}${userId}:${nodeId}`
      ];
      
      await this.client.del(keys);
      return true;
    } catch (error) {
      console.error('Error invalidating node cache:', error);
      return false;
    }
  }

  /**
   * Invalidate cache for a skill map
   */
  async invalidateSkillMapCache(skillId, userId) {
    if (!this.isAvailable()) return false;

    try {
      const keys = [
        `${this.keyPrefixes.SKILL_MAP}${userId}:${skillId}`,
        `${this.keyPrefixes.USER_PROGRESSION}${userId}:${skillId}`
      ];
      
      // Also invalidate all node states for this skill
      const nodePattern = `${this.keyPrefixes.NODE_STATE}${userId}:*`;
      const unlockPattern = `${this.keyPrefixes.UNLOCK_VALIDATION}${userId}:*`;
      
      const nodeKeys = await this.client.keys(nodePattern);
      const unlockKeys = await this.client.keys(unlockPattern);
      
      const allKeys = [...keys, ...nodeKeys, ...unlockKeys];
      
      if (allKeys.length > 0) {
        await this.client.del(allKeys);
      }
      
      return true;
    } catch (error) {
      console.error('Error invalidating skill map cache:', error);
      return false;
    }
  }

  /**
   * Invalidate session cache
   */
  async invalidateSessionCache(sessionId) {
    if (!this.isAvailable()) return false;

    try {
      const key = `${this.keyPrefixes.SESSION_DATA}${sessionId}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Error invalidating session cache:', error);
      return false;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll() {
    if (!this.isAvailable()) return false;

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error('Error clearing all cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isAvailable()) return null;

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;