/**
 * Session Manager Service
 * Redis-based session management for authentication
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: string;
  deviceName: string;
  userAgent?: string;
  ipAddress: string;
  location?: string;
  isTrusted: boolean;
}

export class SessionManager {
  private redisClient: RedisClientType;
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly DEVICE_PREFIX = 'device:';
  private readonly FAILED_ATTEMPTS_PREFIX = 'failed_attempts:';
  private readonly RATE_LIMIT_PREFIX = 'rate_limit:';

  constructor() {
    this.redisClient = createClient({
      url: config.redis.url,
      password: config.redis.password,
    });

    this.redisClient.on('error', (err) => {
      logger.error('Redis session manager error:', err);
    });

    this.redisClient.on('connect', () => {
      logger.info('Redis session manager connected');
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

  // Session Management
  async createSession(sessionId: string, sessionData: SessionData): Promise<void> {
    const key = this.SESSION_PREFIX + sessionId;
    const userSessionsKey = this.USER_SESSIONS_PREFIX + sessionData.userId;
    
    // Store session data
    await this.redisClient.setEx(
      key,
      Math.floor((sessionData.expiresAt.getTime() - Date.now()) / 1000),
      JSON.stringify(sessionData)
    );

    // Add to user's active sessions
    await this.redisClient.sAdd(userSessionsKey, sessionId);
    await this.redisClient.expire(userSessionsKey, 30 * 24 * 60 * 60); // 30 days
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = this.SESSION_PREFIX + sessionId;
    const data = await this.redisClient.get(key);
    
    if (!data) {
      return null;
    }

    try {
      const sessionData = JSON.parse(data) as SessionData;
      
      // Check if session is expired
      if (new Date(sessionData.expiresAt) < new Date()) {
        await this.deleteSession(sessionId);
        return null;
      }

      return {
        ...sessionData,
        createdAt: new Date(sessionData.createdAt),
        lastActivity: new Date(sessionData.lastActivity),
        expiresAt: new Date(sessionData.expiresAt),
      };
    } catch (error) {
      logger.error('Error parsing session data:', error);
      return null;
    }
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return;
    }

    session.lastActivity = new Date();
    await this.createSession(sessionId, session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    const key = this.SESSION_PREFIX + sessionId;
    
    await this.redisClient.del(key);

    if (session) {
      const userSessionsKey = this.USER_SESSIONS_PREFIX + session.userId;
      await this.redisClient.sRem(userSessionsKey, sessionId);
    }
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
    const sessionIds = await this.redisClient.sMembers(userSessionsKey);
    
    const sessions: SessionData[] = [];
    
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      } else {
        // Clean up invalid session reference
        await this.redisClient.sRem(userSessionsKey, sessionId);
      }
    }

    return sessions;
  }

  async revokeUserSessions(userId: string, keepCurrentSession?: string): Promise<void> {
    const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
    const sessionIds = await this.redisClient.sMembers(userSessionsKey);
    
    for (const sessionId of sessionIds) {
      if (keepCurrentSession && sessionId === keepCurrentSession) {
        continue;
      }
      
      await this.deleteSession(sessionId);
    }
  }

  // Device Management
  async registerDevice(userId: string, deviceInfo: DeviceInfo): Promise<void> {
    const key = this.DEVICE_PREFIX + userId + ':' + deviceInfo.deviceId;
    
    await this.redisClient.setEx(
      key,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify({
        ...deviceInfo,
        registeredAt: new Date(),
        lastSeen: new Date(),
      })
    );
  }

  async getDevice(userId: string, deviceId: string): Promise<DeviceInfo | null> {
    const key = this.DEVICE_PREFIX + userId + ':' + deviceId;
    const data = await this.redisClient.get(key);
    
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error parsing device data:', error);
      return null;
    }
  }

  async updateDeviceLastSeen(userId: string, deviceId: string): Promise<void> {
    const device = await this.getDevice(userId, deviceId);
    if (!device) {
      return;
    }

    const key = this.DEVICE_PREFIX + userId + ':' + deviceId;
    await this.redisClient.setEx(
      key,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify({
        ...device,
        lastSeen: new Date(),
      })
    );
  }

  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    const pattern = this.DEVICE_PREFIX + userId + ':*';
    const keys = await this.redisClient.keys(pattern);
    
    const devices: DeviceInfo[] = [];
    
    for (const key of keys) {
      const data = await this.redisClient.get(key);
      if (data) {
        try {
          devices.push(JSON.parse(data));
        } catch (error) {
          logger.error('Error parsing device data:', error);
        }
      }
    }

    return devices;
  }

  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const key = this.DEVICE_PREFIX + userId + ':' + deviceId;
    await this.redisClient.del(key);

    // Also revoke all sessions for this device
    const sessions = await this.getUserSessions(userId);
    for (const session of sessions) {
      if (session.deviceId === deviceId) {
        await this.deleteSession(session.userId + ':' + session.deviceId);
      }
    }
  }

  // Rate Limiting & Security
  async recordFailedAttempt(identifier: string, ttl: number = 900): Promise<number> {
    const key = this.FAILED_ATTEMPTS_PREFIX + identifier;
    const count = await this.redisClient.incr(key);
    
    if (count === 1) {
      await this.redisClient.expire(key, ttl);
    }
    
    return count;
  }

  async getFailedAttempts(identifier: string): Promise<number> {
    const key = this.FAILED_ATTEMPTS_PREFIX + identifier;
    const count = await this.redisClient.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async clearFailedAttempts(identifier: string): Promise<void> {
    const key = this.FAILED_ATTEMPTS_PREFIX + identifier;
    await this.redisClient.del(key);
  }

  async isRateLimited(identifier: string, maxAttempts: number, windowMs: number): Promise<boolean> {
    const key = this.RATE_LIMIT_PREFIX + identifier;
    const count = await this.redisClient.incr(key);
    
    if (count === 1) {
      await this.redisClient.expire(key, Math.floor(windowMs / 1000));
    }
    
    return count > maxAttempts;
  }

  async getRateLimitInfo(identifier: string): Promise<{ count: number; ttl: number }> {
    const key = this.RATE_LIMIT_PREFIX + identifier;
    const [count, ttl] = await Promise.all([
      this.redisClient.get(key),
      this.redisClient.ttl(key),
    ]);
    
    return {
      count: count ? parseInt(count, 10) : 0,
      ttl: ttl > 0 ? ttl : 0,
    };
  }

  // Utility Methods
  async cleanupExpiredSessions(): Promise<void> {
    const pattern = this.SESSION_PREFIX + '*';
    const keys = await this.redisClient.keys(pattern);
    
    for (const key of keys) {
      const sessionId = key.replace(this.SESSION_PREFIX, '');
      const session = await this.getSession(sessionId);
      
      if (!session) {
        await this.redisClient.del(key);
      }
    }
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalDevices: number;
  }> {
    const [sessionKeys, deviceKeys] = await Promise.all([
      this.redisClient.keys(this.SESSION_PREFIX + '*'),
      this.redisClient.keys(this.DEVICE_PREFIX + '*'),
    ]);

    let activeSessions = 0;
    for (const key of sessionKeys) {
      const sessionId = key.replace(this.SESSION_PREFIX, '');
      const session = await this.getSession(sessionId);
      if (session) {
        activeSessions++;
      }
    }

    return {
      totalSessions: sessionKeys.length,
      activeSessions,
      totalDevices: deviceKeys.length,
    };
  }
}

// Singleton instance
export const sessionManager = new SessionManager();