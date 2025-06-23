// =============================================
// DORAMAFLIX - CACHE STRATEGIES
// =============================================

import { getCacheManager } from './redis-cache-manager';
import { logger } from '../../shared/utils/logger';

interface CacheOptions {
  ttl?: number;
  skipCache?: boolean;
  refreshCache?: boolean;
}

interface CacheKey {
  namespace: string;
  key: string;
}

// =============================================
// CACHE DECORATOR FOR FUNCTIONS
// =============================================

export function Cacheable(cacheKey: (args: any[]) => CacheKey, options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const { namespace, key } = cacheKey(args);
      const cacheManager = getCacheManager();
      
      // Skip cache if requested
      if (options.skipCache) {
        return method.apply(this, args);
      }

      try {
        // Try to get from cache first
        if (!options.refreshCache) {
          const cachedResult = await cacheManager.get(namespace, key);
          if (cachedResult !== null) {
            logger.debug(`Cache hit for ${namespace}:${key}`);
            return cachedResult;
          }
        }

        // Execute the method
        logger.debug(`Cache miss for ${namespace}:${key}, executing method`);
        const result = await method.apply(this, args);

        // Cache the result
        if (result !== null && result !== undefined) {
          await cacheManager.set(namespace, key, result, options.ttl);
          logger.debug(`Cached result for ${namespace}:${key}`);
        }

        return result;
      } catch (error) {
        logger.error(`Error in cache strategy for ${namespace}:${key}:`, error);
        // Fallback to direct method execution
        return method.apply(this, args);
      }
    };
  };
}

// =============================================
// CACHE INVALIDATION STRATEGIES
// =============================================

export class CacheInvalidationStrategy {
  private cacheManager = getCacheManager();

  // Invalidate related caches when content is updated
  async invalidateContentRelatedCaches(contentId: string): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.invalidateContentCache(contentId),
        this.cacheManager.deletePattern('content', 'popular:*'),
        this.cacheManager.deletePattern('analytics', 'trending:*'),
        this.cacheManager.deletePattern('search', '*'),
      ]);
      
      logger.info(`Invalidated content-related caches for content ${contentId}`);
    } catch (error) {
      logger.error(`Failed to invalidate content-related caches for ${contentId}:`, error);
    }
  }

  // Invalidate user-specific caches
  async invalidateUserRelatedCaches(userId: string): Promise<void> {
    try {
      await this.cacheManager.invalidateUserCache(userId);
      logger.info(`Invalidated user-related caches for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to invalidate user-related caches for ${userId}:`, error);
    }
  }

  // Invalidate search caches
  async invalidateSearchCaches(): Promise<void> {
    try {
      await this.cacheManager.invalidateSearchCache();
      logger.info('Invalidated all search caches');
    } catch (error) {
      logger.error('Failed to invalidate search caches:', error);
    }
  }

  // Invalidate analytics caches
  async invalidateAnalyticsCaches(): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.deletePattern('analytics', '*'),
        this.cacheManager.deletePattern('stats', '*'),
      ]);
      
      logger.info('Invalidated all analytics caches');
    } catch (error) {
      logger.error('Failed to invalidate analytics caches:', error);
    }
  }
}

// =============================================
// CACHE WARMING STRATEGIES
// =============================================

export class CacheWarmingStrategy {
  private cacheManager = getCacheManager();

  // Warm popular content cache
  async warmPopularContentCache(): Promise<void> {
    try {
      // This would typically call your service methods to preload popular content
      // Example implementation would go here
      logger.info('Started warming popular content cache');
      
      const origins = ['korean', 'japanese', 'chinese'];
      const limits = [20, 50, 100];
      
      for (const origin of origins) {
        for (const limit of limits) {
          // You would call your actual service method here
          // const popularContent = await this.contentService.getPopularByOrigin(origin, limit);
          // await this.cacheManager.setPopularContent(popularContent, origin, limit);
        }
      }
      
      logger.info('Completed warming popular content cache');
    } catch (error) {
      logger.error('Failed to warm popular content cache:', error);
    }
  }

  // Warm trending content cache
  async warmTrendingContentCache(): Promise<void> {
    try {
      logger.info('Started warming trending content cache');
      
      const periods = ['daily', 'weekly', 'monthly'] as const;
      const categories = ['korean', 'japanese', 'chinese', 'romance', 'action'];
      
      for (const period of periods) {
        // Global trending
        // const globalTrending = await this.analyticsService.getTrendingContent(period);
        // await this.cacheManager.setTrendingContent(globalTrending, period);
        
        // Category-specific trending
        for (const category of categories) {
          // const categoryTrending = await this.analyticsService.getTrendingContent(period, category);
          // await this.cacheManager.setTrendingContent(categoryTrending, period, category);
        }
      }
      
      logger.info('Completed warming trending content cache');
    } catch (error) {
      logger.error('Failed to warm trending content cache:', error);
    }
  }

  // Warm user recommendations cache for active users
  async warmUserRecommendationsCache(userIds: string[]): Promise<void> {
    try {
      logger.info(`Started warming recommendations cache for ${userIds.length} users`);
      
      const promises = userIds.map(async (userId) => {
        try {
          // const recommendations = await this.recommendationService.getUserRecommendations(userId);
          // await this.cacheManager.setUserRecommendations(userId, recommendations);
        } catch (error) {
          logger.error(`Failed to warm recommendations for user ${userId}:`, error);
        }
      });
      
      await Promise.all(promises);
      logger.info('Completed warming user recommendations cache');
    } catch (error) {
      logger.error('Failed to warm user recommendations cache:', error);
    }
  }
}

// =============================================
// CACHE HEALTH MONITORING
// =============================================

export class CacheHealthMonitor {
  private cacheManager = getCacheManager();

  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    latency: number;
    memoryUsage?: string;
    connectedClients?: string;
    totalConnections?: string;
  }> {
    try {
      const startTime = Date.now();
      const isConnected = await this.cacheManager.ping();
      const latency = Date.now() - startTime;

      if (!isConnected) {
        return {
          isHealthy: false,
          latency: -1,
        };
      }

      const info = await this.cacheManager.getInfo();
      const infoLines = info.split('\r\n');
      
      const getInfoValue = (key: string): string => {
        const line = infoLines.find(line => line.startsWith(key));
        return line ? line.split(':')[1] : 'unknown';
      };

      return {
        isHealthy: true,
        latency,
        memoryUsage: getInfoValue('used_memory_human'),
        connectedClients: getInfoValue('connected_clients'),
        totalConnections: getInfoValue('total_connections_received'),
      };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        isHealthy: false,
        latency: -1,
      };
    }
  }

  async getCacheStatistics(): Promise<{
    hitRate?: number;
    missRate?: number;
    keyCount?: number;
    avgTTL?: number;
  }> {
    try {
      const info = await this.cacheManager.getInfo();
      const infoLines = info.split('\r\n');
      
      const getInfoValue = (key: string): string => {
        const line = infoLines.find(line => line.startsWith(key));
        return line ? line.split(':')[1] : '0';
      };

      const keyspaceHits = parseInt(getInfoValue('keyspace_hits'));
      const keyspaceMisses = parseInt(getInfoValue('keyspace_misses'));
      const totalOperations = keyspaceHits + keyspaceMisses;
      
      return {
        hitRate: totalOperations > 0 ? (keyspaceHits / totalOperations) * 100 : 0,
        missRate: totalOperations > 0 ? (keyspaceMisses / totalOperations) * 100 : 0,
        keyCount: parseInt(getInfoValue('db0').match(/keys=(\d+)/)?.[1] || '0'),
      };
    } catch (error) {
      logger.error('Failed to get cache statistics:', error);
      return {};
    }
  }
}

// =============================================
// CACHE KEY GENERATORS
// =============================================

export const CacheKeys = {
  // Content keys
  course: (id: string): CacheKey => ({ namespace: 'course', key: id }),
  episode: (id: string): CacheKey => ({ namespace: 'episode', key: id }),
  popularContent: (origin?: string, limit = 50): CacheKey => ({
    namespace: 'content',
    key: origin ? `popular:${origin}:${limit}` : `popular:all:${limit}`
  }),
  
  // User keys
  userProgress: (userId: string, courseId: string): CacheKey => ({
    namespace: 'progress',
    key: `${userId}:${courseId}`
  }),
  userFavorites: (userId: string): CacheKey => ({
    namespace: 'favorites',
    key: userId
  }),
  userRecommendations: (userId: string): CacheKey => ({
    namespace: 'recommendations',
    key: userId
  }),
  
  // Search keys
  searchResults: (query: string, filters: any = {}): CacheKey => {
    const filterKey = Object.keys(filters).sort().map(k => `${k}:${filters[k]}`).join('|');
    const key = `search:${Buffer.from(query).toString('base64')}:${Buffer.from(filterKey).toString('base64')}`;
    return { namespace: 'search', key };
  },
  
  // Analytics keys
  trendingContent: (period: 'daily' | 'weekly' | 'monthly', category?: string): CacheKey => ({
    namespace: 'analytics',
    key: category ? `trending:${period}:${category}` : `trending:${period}`
  }),
  contentStats: (contentId: string): CacheKey => ({
    namespace: 'stats',
    key: contentId
  }),
};

// =============================================
// EXPORTED INSTANCES
// =============================================

export const cacheInvalidation = new CacheInvalidationStrategy();
export const cacheWarming = new CacheWarmingStrategy();
export const cacheHealth = new CacheHealthMonitor();

export default {
  Cacheable,
  CacheKeys,
  cacheInvalidation,
  cacheWarming,
  cacheHealth,
};