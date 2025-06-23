// =============================================
// DORAMAFLIX - REDIS CACHE MANAGER
// =============================================

import Redis from 'ioredis';
import { logger } from '../../shared/utils/logger';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  showFriendlyErrorStack: boolean;
}

interface CacheKeyConfig {
  prefix: string;
  separator: string;
  defaultTTL: number;
}

export class RedisCacheManager {
  private redis: Redis;
  private keyConfig: CacheKeyConfig;

  constructor(config: CacheConfig) {
    this.keyConfig = {
      prefix: 'doramaflix',
      separator: ':',
      defaultTTL: 3600, // 1 hour
    };

    this.redis = new Redis({
      ...config,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      lazyConnect: config.lazyConnect || true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis connection established');
    });

    this.redis.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
  }

  private buildKey(namespace: string, key: string): string {
    return `${this.keyConfig.prefix}${this.keyConfig.separator}${namespace}${this.keyConfig.separator}${key}`;
  }

  // =============================================
  // GENERIC CACHE OPERATIONS
  // =============================================

  async get<T>(namespace: string, key: string): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(namespace, key);
      const result = await this.redis.get(cacheKey);
      
      if (!result) {
        return null;
      }

      return JSON.parse(result) as T;
    } catch (error) {
      logger.error(`Cache get error for ${namespace}:${key}:`, error);
      return null;
    }
  }

  async set(namespace: string, key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(namespace, key);
      const serializedValue = JSON.stringify(value);
      const cacheTTL = ttl || this.keyConfig.defaultTTL;

      await this.redis.setex(cacheKey, cacheTTL, serializedValue);
      return true;
    } catch (error) {
      logger.error(`Cache set error for ${namespace}:${key}:`, error);
      return false;
    }
  }

  async del(namespace: string, key: string): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(namespace, key);
      const result = await this.redis.del(cacheKey);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for ${namespace}:${key}:`, error);
      return false;
    }
  }

  async exists(namespace: string, key: string): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(namespace, key);
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for ${namespace}:${key}:`, error);
      return false;
    }
  }

  async expire(namespace: string, key: string, ttl: number): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(namespace, key);
      const result = await this.redis.expire(cacheKey, ttl);
      return result === 1;
    } catch (error) {
      logger.error(`Cache expire error for ${namespace}:${key}:`, error);
      return false;
    }
  }

  // =============================================
  // DRAMA-SPECIFIC CACHE OPERATIONS
  // =============================================

  // Content caching
  async getCourse(courseId: string) {
    return this.get('course', courseId);
  }

  async setCourse(courseId: string, course: any, ttl = 7200): Promise<boolean> {
    return this.set('course', courseId, course, ttl);
  }

  async getEpisode(episodeId: string) {
    return this.get('episode', episodeId);
  }

  async setEpisode(episodeId: string, episode: any, ttl = 3600): Promise<boolean> {
    return this.set('episode', episodeId, episode, ttl);
  }

  // Popular content caching
  async getPopularContent(origin?: string, limit = 50) {
    const key = origin ? `popular:${origin}:${limit}` : `popular:all:${limit}`;
    return this.get('content', key);
  }

  async setPopularContent(content: any[], origin?: string, limit = 50, ttl = 1800): Promise<boolean> {
    const key = origin ? `popular:${origin}:${limit}` : `popular:all:${limit}`;
    return this.set('content', key, content, ttl);
  }

  // Search results caching
  async getSearchResults(query: string, filters: any = {}) {
    const filterKey = Object.keys(filters).sort().map(k => `${k}:${filters[k]}`).join('|');
    const key = `search:${Buffer.from(query).toString('base64')}:${Buffer.from(filterKey).toString('base64')}`;
    return this.get('search', key);
  }

  async setSearchResults(query: string, filters: any = {}, results: any[], ttl = 900): Promise<boolean> {
    const filterKey = Object.keys(filters).sort().map(k => `${k}:${filters[k]}`).join('|');
    const key = `search:${Buffer.from(query).toString('base64')}:${Buffer.from(filterKey).toString('base64')}`;
    return this.set('search', key, results, ttl);
  }

  // User-specific caching
  async getUserProgress(userId: string, courseId: string) {
    return this.get('progress', `${userId}:${courseId}`);
  }

  async setUserProgress(userId: string, courseId: string, progress: any, ttl = 300): Promise<boolean> {
    return this.set('progress', `${userId}:${courseId}`, progress, ttl);
  }

  async getUserFavorites(userId: string) {
    return this.get('favorites', userId);
  }

  async setUserFavorites(userId: string, favorites: any[], ttl = 1800): Promise<boolean> {
    return this.set('favorites', userId, favorites, ttl);
  }

  async getUserRecommendations(userId: string) {
    return this.get('recommendations', userId);
  }

  async setUserRecommendations(userId: string, recommendations: any[], ttl = 3600): Promise<boolean> {
    return this.set('recommendations', userId, recommendations, ttl);
  }

  // =============================================
  // SESSION AND AUTH CACHING
  // =============================================

  async getSession(sessionId: string) {
    return this.get('session', sessionId);
  }

  async setSession(sessionId: string, sessionData: any, ttl = 86400): Promise<boolean> {
    return this.set('session', sessionId, sessionData, ttl);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.del('session', sessionId);
  }

  async getUserSessions(userId: string) {
    return this.get('user_sessions', userId);
  }

  async setUserSessions(userId: string, sessions: string[], ttl = 86400): Promise<boolean> {
    return this.set('user_sessions', userId, sessions, ttl);
  }

  // =============================================
  // ANALYTICS CACHING
  // =============================================

  async getTrendingContent(period: 'daily' | 'weekly' | 'monthly' = 'daily', category?: string) {
    const key = category ? `trending:${period}:${category}` : `trending:${period}`;
    return this.get('analytics', key);
  }

  async setTrendingContent(
    content: any[], 
    period: 'daily' | 'weekly' | 'monthly' = 'daily', 
    category?: string,
    ttl = 1800
  ): Promise<boolean> {
    const key = category ? `trending:${period}:${category}` : `trending:${period}`;
    return this.set('analytics', key, content, ttl);
  }

  async getContentStats(contentId: string) {
    return this.get('stats', contentId);
  }

  async setContentStats(contentId: string, stats: any, ttl = 300): Promise<boolean> {
    return this.set('stats', contentId, stats, ttl);
  }

  // =============================================
  // BATCH OPERATIONS
  // =============================================

  async mget(namespace: string, keys: string[]): Promise<(any | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.buildKey(namespace, key));
      const results = await this.redis.mget(...cacheKeys);
      
      return results.map(result => {
        if (!result) return null;
        try {
          return JSON.parse(result);
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error(`Cache mget error for ${namespace}:`, error);
      return keys.map(() => null);
    }
  }

  async mset(namespace: string, keyValuePairs: Array<{key: string, value: any, ttl?: number}>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      keyValuePairs.forEach(({key, value, ttl}) => {
        const cacheKey = this.buildKey(namespace, key);
        const serializedValue = JSON.stringify(value);
        const cacheTTL = ttl || this.keyConfig.defaultTTL;
        
        pipeline.setex(cacheKey, cacheTTL, serializedValue);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error(`Cache mset error for ${namespace}:`, error);
      return false;
    }
  }

  // =============================================
  // PATTERN-BASED OPERATIONS
  // =============================================

  async deletePattern(namespace: string, pattern: string): Promise<number> {
    try {
      const searchPattern = this.buildKey(namespace, pattern);
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      logger.error(`Cache deletePattern error for ${namespace}:${pattern}:`, error);
      return 0;
    }
  }

  async getKeysByPattern(namespace: string, pattern: string): Promise<string[]> {
    try {
      const searchPattern = this.buildKey(namespace, pattern);
      const keys = await this.redis.keys(searchPattern);
      
      // Remove prefix to return clean keys
      return keys.map(key => {
        const prefix = `${this.keyConfig.prefix}${this.keyConfig.separator}${namespace}${this.keyConfig.separator}`;
        return key.replace(prefix, '');
      });
    } catch (error) {
      logger.error(`Cache getKeysByPattern error for ${namespace}:${pattern}:`, error);
      return [];
    }
  }

  // =============================================
  // CACHE INVALIDATION
  // =============================================

  async invalidateUserCache(userId: string): Promise<void> {
    try {
      await Promise.all([
        this.deletePattern('progress', `${userId}:*`),
        this.deletePattern('favorites', userId),
        this.deletePattern('recommendations', userId),
        this.deletePattern('user_sessions', userId),
      ]);
    } catch (error) {
      logger.error(`Error invalidating user cache for ${userId}:`, error);
    }
  }

  async invalidateContentCache(contentId: string): Promise<void> {
    try {
      await Promise.all([
        this.del('course', contentId),
        this.deletePattern('episode', `${contentId}:*`),
        this.deletePattern('stats', contentId),
        this.deletePattern('content', 'popular:*'),
        this.deletePattern('analytics', 'trending:*'),
      ]);
    } catch (error) {
      logger.error(`Error invalidating content cache for ${contentId}:`, error);
    }
  }

  async invalidateSearchCache(): Promise<void> {
    try {
      await this.deletePattern('search', '*');
    } catch (error) {
      logger.error('Error invalidating search cache:', error);
    }
  }

  // =============================================
  // HEALTH CHECK AND STATS
  // =============================================

  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  async getInfo(): Promise<string> {
    try {
      return await this.redis.info();
    } catch (error) {
      logger.error('Redis info failed:', error);
      return '';
    }
  }

  async flushdb(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      logger.error('Redis flushdb failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      logger.error('Redis disconnect failed:', error);
    }
  }
}

// =============================================
// CACHE FACTORY AND INSTANCE
// =============================================

export const createCacheManager = (config: CacheConfig): RedisCacheManager => {
  return new RedisCacheManager(config);
};

// Default instance (will be configured from environment)
let cacheManager: RedisCacheManager | null = null;

export const getCacheManager = (): RedisCacheManager => {
  if (!cacheManager) {
    const config: CacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    };

    cacheManager = new RedisCacheManager(config);
  }

  return cacheManager;
};

export default getCacheManager;