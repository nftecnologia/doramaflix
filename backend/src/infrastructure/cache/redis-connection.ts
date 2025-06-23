/**
 * Redis Connection
 * Manages Redis connection for caching and sessions
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

class RedisConnection {
  private static instance: RedisClientType | null = null;
  private static isConnected: boolean = false;

  static async connect(): Promise<RedisClientType> {
    if (this.instance && this.isConnected) {
      return this.instance;
    }

    try {
      this.instance = createClient({
        url: config.redis.url,
        password: config.redis.password,
        socket: {
          reconnectStrategy: (retries) => {
            // Exponential backoff: 2^retries * 1000ms, max 30 seconds
            const delay = Math.min(Math.pow(2, retries) * 1000, 30000);
            logger.info(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          },
          connectTimeout: 10000,
        },
      });

      // Event listeners
      this.instance.on('error', (error) => {
        logger.error('Redis Error', { error: error.message });
        this.isConnected = false;
      });

      this.instance.on('connect', () => {
        logger.info('Redis connecting...');
      });

      this.instance.on('ready', () => {
        logger.info('Redis ready for commands');
        this.isConnected = true;
      });

      this.instance.on('end', () => {
        logger.info('Redis connection ended');
        this.isConnected = false;
      });

      this.instance.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
        this.isConnected = false;
      });

      await this.instance.connect();

      logger.info('Redis connected successfully', {
        host: config.redis.host,
        port: config.redis.port,
      });

      return this.instance;
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : error,
        host: config.redis.host,
        port: config.redis.port,
      });
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  static getInstance(): RedisClientType {
    if (!this.instance) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.instance;
  }

  static isConnectionHealthy(): boolean {
    return this.isConnected && this.instance !== null;
  }

  static async healthCheck(): Promise<boolean> {
    if (!this.instance || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.instance.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }

  // Cache utility methods
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    const client = this.getInstance();
    const serializedValue = JSON.stringify(value);
    
    if (ttl) {
      await client.setEx(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
  }

  static async get<T = any>(key: string): Promise<T | null> {
    const client = this.getInstance();
    const value = await client.get(key);
    
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to parse Redis value', { key, error });
      return null;
    }
  }

  static async del(key: string): Promise<void> {
    const client = this.getInstance();
    await client.del(key);
  }

  static async exists(key: string): Promise<boolean> {
    const client = this.getInstance();
    const result = await client.exists(key);
    return result === 1;
  }

  static async expire(key: string, ttl: number): Promise<void> {
    const client = this.getInstance();
    await client.expire(key, ttl);
  }

  static async flushAll(): Promise<void> {
    const client = this.getInstance();
    await client.flushAll();
  }

  // Hash operations
  static async hSet(key: string, field: string, value: any): Promise<void> {
    const client = this.getInstance();
    await client.hSet(key, field, JSON.stringify(value));
  }

  static async hGet<T = any>(key: string, field: string): Promise<T | null> {
    const client = this.getInstance();
    const value = await client.hGet(key, field);
    
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to parse Redis hash value', { key, field, error });
      return null;
    }
  }

  static async hDel(key: string, field: string): Promise<void> {
    const client = this.getInstance();
    await client.hDel(key, field);
  }

  // Set operations
  static async sAdd(key: string, member: string): Promise<void> {
    const client = this.getInstance();
    await client.sAdd(key, member);
  }

  static async sRem(key: string, member: string): Promise<void> {
    const client = this.getInstance();
    await client.sRem(key, member);
  }

  static async sIsMember(key: string, member: string): Promise<boolean> {
    const client = this.getInstance();
    return await client.sIsMember(key, member);
  }

  static async sMembers(key: string): Promise<string[]> {
    const client = this.getInstance();
    return await client.sMembers(key);
  }

  // List operations
  static async lPush(key: string, value: any): Promise<void> {
    const client = this.getInstance();
    await client.lPush(key, JSON.stringify(value));
  }

  static async rPush(key: string, value: any): Promise<void> {
    const client = this.getInstance();
    await client.rPush(key, JSON.stringify(value));
  }

  static async lPop<T = any>(key: string): Promise<T | null> {
    const client = this.getInstance();
    const value = await client.lPop(key);
    
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to parse Redis list value', { key, error });
      return null;
    }
  }

  static async lRange<T = any>(key: string, start: number, stop: number): Promise<T[]> {
    const client = this.getInstance();
    const values = await client.lRange(key, start, stop);
    
    return values.map(value => {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        logger.error('Failed to parse Redis list value', { key, value, error });
        return null;
      }
    }).filter(Boolean) as T[];
  }
}

export { RedisConnection };