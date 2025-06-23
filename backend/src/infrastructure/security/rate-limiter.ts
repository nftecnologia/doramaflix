/**
 * Advanced Rate Limiter Service
 * Redis-based rate limiting with multiple strategies and protection levels
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import { config } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class AdvancedRateLimiter {
  private redisClient: RedisClientType;
  private readonly PREFIX = 'rate_limit:';

  constructor() {
    this.redisClient = createClient({
      url: config.redis.url,
      password: config.redis.password,
    });

    this.redisClient.on('error', (err) => {
      logger.error('Redis rate limiter error:', err);
    });
  }

  async connect(): Promise<void> {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.redisClient.isOpen) {
      await this.redisClient.disconnect();
    }
  }

  /**
   * Create rate limiting middleware
   */
  createLimiter(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = config.keyGenerator ? config.keyGenerator(req) : this.defaultKeyGenerator(req);
        const fullKey = this.PREFIX + key;

        const result = await this.checkLimit(fullKey, config);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
        res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

        if (result.current > config.maxRequests) {
          res.setHeader('Retry-After', Math.ceil(result.retryAfter! / 1000));
          
          if (config.onLimitReached) {
            config.onLimitReached(req, res);
          }

          logger.warn('Rate limit exceeded', {
            key,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            current: result.current,
            limit: config.maxRequests,
          });

          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil(result.retryAfter! / 1000),
          });
        }

        next();
      } catch (error) {
        logger.error('Rate limiter error:', error);
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }

  /**
   * Login rate limiter - more restrictive
   */
  createLoginLimiter() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per window
      keyGenerator: (req) => `login:${req.ip}:${req.body.email || 'unknown'}`,
      onLimitReached: (req, res) => {
        logger.warn('Login rate limit exceeded', {
          ip: req.ip,
          email: req.body.email,
          userAgent: req.get('User-Agent'),
        });
      },
    });
  }

  /**
   * Password reset rate limiter
   */
  createPasswordResetLimiter() {
    return this.createLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 attempts per hour
      keyGenerator: (req) => `password_reset:${req.ip}:${req.body.email || 'unknown'}`,
    });
  }

  /**
   * Registration rate limiter
   */
  createRegistrationLimiter() {
    return this.createLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 registrations per hour per IP
      keyGenerator: (req) => `registration:${req.ip}`,
    });
  }

  /**
   * 2FA verification rate limiter
   */
  create2FALimiter() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // 10 attempts per window
      keyGenerator: (req) => `2fa:${req.ip}:${req.user?.id || 'unknown'}`,
    });
  }

  /**
   * API rate limiter - general endpoints
   */
  createAPILimiter() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // 1000 requests per window
      keyGenerator: (req) => `api:${req.ip}:${req.user?.id || 'anonymous'}`,
    });
  }

  /**
   * Upload rate limiter
   */
  createUploadLimiter() {
    return this.createLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 uploads per hour
      keyGenerator: (req) => `upload:${req.user?.id || req.ip}`,
    });
  }

  /**
   * Premium content rate limiter
   */
  createPremiumContentLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
      keyGenerator: (req) => `premium:${req.user?.id}`,
    });
  }

  /**
   * Adaptive rate limiter - adjusts based on user behavior
   */
  createAdaptiveLimiter(baseConfig: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const userKey = req.user?.id || req.ip;
      const trustScore = await this.getUserTrustScore(userKey);
      
      // Adjust limits based on trust score
      const adjustedConfig = {
        ...baseConfig,
        maxRequests: Math.floor(baseConfig.maxRequests * (1 + trustScore)),
      };

      return this.createLimiter(adjustedConfig)(req, res, next);
    };
  }

  /**
   * Burst protection - allows short bursts but enforces longer-term limits
   */
  createBurstProtection(shortConfig: RateLimitConfig, longConfig: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = shortConfig.keyGenerator ? shortConfig.keyGenerator(req) : this.defaultKeyGenerator(req);
      
      // Check both short and long-term limits
      const [shortResult, longResult] = await Promise.all([
        this.checkLimit(this.PREFIX + 'short:' + key, shortConfig),
        this.checkLimit(this.PREFIX + 'long:' + key, longConfig),
      ]);

      // Use the most restrictive limit
      const restrictiveResult = shortResult.current > shortConfig.maxRequests ? shortResult : longResult;

      if (restrictiveResult.current > restrictiveResult.limit) {
        res.setHeader('Retry-After', Math.ceil(restrictiveResult.retryAfter! / 1000));
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(restrictiveResult.retryAfter! / 1000),
        });
      }

      next();
    };
  }

  /**
   * Geographic rate limiting
   */
  createGeographicLimiter(config: RateLimitConfig & { restrictedCountries?: string[] }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const country = req.get('CF-IPCountry') || req.get('X-Country-Code');
      
      if (config.restrictedCountries && country && config.restrictedCountries.includes(country)) {
        // Apply stricter limits for restricted countries
        const restrictedConfig = {
          ...config,
          maxRequests: Math.floor(config.maxRequests * 0.5), // 50% of normal limit
        };
        
        return this.createLimiter(restrictedConfig)(req, res, next);
      }

      return this.createLimiter(config)(req, res, next);
    };
  }

  /**
   * Check current rate limit status without incrementing
   */
  async checkLimitStatus(key: string, windowMs: number): Promise<RateLimitInfo | null> {
    const fullKey = this.PREFIX + key;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const count = await this.redisClient.zCount(fullKey, windowStart, '+inf');
      const resetTime = now + windowMs;

      return {
        limit: 0, // Will need to be provided by caller
        current: count,
        remaining: 0, // Will need to be calculated by caller
        resetTime,
      };
    } catch (error) {
      logger.error('Error checking rate limit status:', error);
      return null;
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(key: string): Promise<void> {
    const fullKey = this.PREFIX + key;
    await this.redisClient.del(fullKey);
    logger.info('Rate limit reset', { key });
  }

  /**
   * Get rate limit stats
   */
  async getRateLimitStats(): Promise<{
    totalKeys: number;
    topLimitedIPs: Array<{ ip: string; count: number }>;
    topLimitedUsers: Array<{ userId: string; count: number }>;
  }> {
    const keys = await this.redisClient.keys(this.PREFIX + '*');
    
    // This is a simplified version - in production, you'd want to maintain
    // separate counters for statistics
    return {
      totalKeys: keys.length,
      topLimitedIPs: [], // Would need additional implementation
      topLimitedUsers: [], // Would need additional implementation
    };
  }

  // Private helper methods
  private async checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use sliding window with sorted sets
    const pipeline = this.redisClient.multi();
    
    // Remove expired entries
    pipeline.zRemRangeByScore(key, '-inf', windowStart);
    
    // Add current request
    pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    
    // Count requests in window
    pipeline.zCard(key);
    
    // Set expiry
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));

    const results = await pipeline.exec();
    const count = results[2][1] as number;

    const resetTime = now + config.windowMs;
    const remaining = Math.max(0, config.maxRequests - count);
    const retryAfter = count > config.maxRequests ? config.windowMs : undefined;

    return {
      limit: config.maxRequests,
      current: count,
      remaining,
      resetTime,
      retryAfter,
    };
  }

  private defaultKeyGenerator(req: Request): string {
    return `${req.ip}:${req.user?.id || 'anonymous'}`;
  }

  private async getUserTrustScore(userKey: string): Promise<number> {
    // Simplified trust score calculation
    // In production, this would consider factors like:
    // - Account age
    // - Verification status
    // - Past behavior
    // - Subscription status
    // Returns a value between -1 (very untrusted) and 1 (very trusted)
    
    try {
      const trustKey = `trust_score:${userKey}`;
      const score = await this.redisClient.get(trustKey);
      return score ? parseFloat(score) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Update user trust score based on behavior
   */
  async updateTrustScore(userKey: string, delta: number): Promise<void> {
    const trustKey = `trust_score:${userKey}`;
    const currentScore = await this.getUserTrustScore(userKey);
    const newScore = Math.max(-1, Math.min(1, currentScore + delta));
    
    await this.redisClient.setEx(trustKey, 30 * 24 * 60 * 60, newScore.toString()); // 30 days
  }

  /**
   * Clean up expired rate limit data
   */
  async cleanup(): Promise<void> {
    const keys = await this.redisClient.keys(this.PREFIX + '*');
    const now = Date.now();
    
    for (const key of keys) {
      // Remove expired entries from sorted sets
      await this.redisClient.zRemRangeByScore(key, '-inf', now - (24 * 60 * 60 * 1000)); // 24 hours ago
    }
    
    logger.info('Rate limiter cleanup completed', { keysProcessed: keys.length });
  }
}

// Singleton instance
export const rateLimiter = new AdvancedRateLimiter();