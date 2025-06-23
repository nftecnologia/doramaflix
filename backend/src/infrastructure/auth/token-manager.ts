/**
 * Enhanced Token Manager Service
 * Advanced JWT token management with refresh token storage and validation
 */

import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '@/shared/config/environment';
import { sessionManager, SessionData } from '@/infrastructure/cache/session-manager';
import { logger } from '@/shared/utils/logger';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  subscriptionTier: string;
  isMainProfile: boolean;
  parentUserId?: string;
  sessionId: string;
  deviceId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface RefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DeviceContext {
  deviceId: string;
  deviceType: string;
  deviceName: string;
  ipAddress: string;
  userAgent?: string;
  location?: string;
  isTrusted?: boolean;
}

export class TokenManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(
    user: {
      id: string;
      email: string;
      role: string;
      subscriptionTier: string;
      isMainProfile: boolean;
      parentUserId?: string;
    },
    deviceContext?: DeviceContext
  ): Promise<TokenPair> {
    // Generate unique session ID
    const sessionId = this.generateSessionId();
    
    // Create access token payload
    const accessTokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      isMainProfile: user.isMainProfile,
      parentUserId: user.parentUserId,
      sessionId,
      deviceId: deviceContext?.deviceId,
    };

    // Generate tokens
    const accessToken = jwt.sign(accessTokenPayload, config.security.jwt.secret, {
      expiresIn: config.security.jwt.expiresIn,
      issuer: config.app.name,
      audience: config.app.url,
    });

    const refreshTokenValue = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshTokenValue);

    // Calculate expiration dates
    const accessTokenExp = this.getTokenExpiration(config.security.jwt.expiresIn);
    const refreshTokenExp = this.getTokenExpiration(config.security.jwt.refreshExpiresIn);

    // Store refresh token in database
    await this.storeRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExp,
      deviceId: deviceContext?.deviceId,
      ipAddress: deviceContext?.ipAddress,
      userAgent: deviceContext?.userAgent,
    });

    // Create session in Redis
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      deviceId: deviceContext?.deviceId,
      ipAddress: deviceContext?.ipAddress,
      userAgent: deviceContext?.userAgent,
      location: deviceContext?.location,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: accessTokenExp,
    };

    await sessionManager.createSession(sessionId, sessionData);

    // Register device if provided
    if (deviceContext) {
      await sessionManager.registerDevice(user.id, {
        deviceId: deviceContext.deviceId,
        deviceType: deviceContext.deviceType,
        deviceName: deviceContext.deviceName,
        userAgent: deviceContext.userAgent,
        ipAddress: deviceContext.ipAddress,
        location: deviceContext.location,
        isTrusted: deviceContext.isTrusted || false,
      });
    }

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: config.security.jwt.expiresIn,
      refreshExpiresIn: config.security.jwt.refreshExpiresIn,
    };
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, config.security.jwt.secret, {
        issuer: config.app.name,
        audience: config.app.url,
      }) as TokenPayload;

      // Verify session is still active
      const session = await sessionManager.getSession(decoded.sessionId);
      if (!session) {
        throw new Error('Session not found or expired');
      }

      // Update session activity
      await sessionManager.updateSessionActivity(decoded.sessionId);

      // Update device last seen if applicable
      if (decoded.deviceId) {
        await sessionManager.updateDeviceLastSeen(decoded.userId, decoded.deviceId);
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Refresh token pair using refresh token
   */
  async refreshTokenPair(
    refreshToken: string,
    deviceContext?: DeviceContext
  ): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);

    // Find refresh token in database
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      throw new Error('Invalid or expired refresh token');
    }

    // Revoke the used refresh token
    await this.revokeRefreshToken(storedToken.id);

    // Generate new token pair
    return this.generateTokenPair(
      {
        id: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
        subscriptionTier: storedToken.user.subscriptionTier,
        isMainProfile: storedToken.user.isMainProfile,
        parentUserId: storedToken.user.parentUserId,
      },
      deviceContext
    );
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revoked: true },
    });
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string, keepCurrentToken?: string): Promise<void> {
    const whereClause: any = {
      userId,
      revoked: false,
    };

    if (keepCurrentToken) {
      whereClause.id = {
        not: keepCurrentToken,
      };
    }

    await this.prisma.refreshToken.updateMany({
      where: whereClause,
      data: { revoked: true },
    });

    // Also revoke sessions
    await sessionManager.revokeUserSessions(userId, keepCurrentToken);
  }

  /**
   * Revoke tokens for specific device
   */
  async revokeDeviceTokens(userId: string, deviceId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        deviceId,
        revoked: false,
      },
      data: { revoked: true },
    });

    await sessionManager.revokeDevice(userId, deviceId);
  }

  /**
   * Get active refresh tokens for user
   */
  async getUserActiveTokens(userId: string): Promise<RefreshTokenData[]> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        deviceId: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    return tokens.map(token => ({
      ...token,
      ipAddress: token.ipAddress?.toString(),
    }));
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate 2FA backup codes
   */
  generate2FABackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-digit code
      const code = Math.random().toString().substr(2, 8);
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    // Delete expired refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    // Cleanup expired sessions
    await sessionManager.cleanupExpiredSessions();
  }

  /**
   * Get token statistics
   */
  async getTokenStats(): Promise<{
    activeRefreshTokens: number;
    expiredRefreshTokens: number;
    revokedRefreshTokens: number;
    activeSessions: number;
  }> {
    const [activeTokens, expiredTokens, revokedTokens, sessionStats] = await Promise.all([
      this.prisma.refreshToken.count({
        where: {
          revoked: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      }),
      this.prisma.refreshToken.count({
        where: {
          revoked: false,
          expiresAt: {
            lt: new Date(),
          },
        },
      }),
      this.prisma.refreshToken.count({
        where: {
          revoked: true,
        },
      }),
      sessionManager.getSessionStats(),
    ]);

    return {
      activeRefreshTokens: activeTokens,
      expiredRefreshTokens: expiredTokens,
      revokedRefreshTokens: revokedTokens,
      activeSessions: sessionStats.activeSessions,
    };
  }

  // Private helper methods
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getTokenExpiration(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      throw new Error('Invalid token expiration format');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        throw new Error('Invalid token expiration unit');
    }
  }

  private async storeRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        deviceId: data.deviceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}