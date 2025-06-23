/**
 * Authentication Service
 * Handles JWT authentication and user management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '@/shared/config/environment';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  TokenPair, 
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UserProfile,
  AuthenticationError,
  ValidationError,
  ConflictError,
  NotFoundError,
  ServiceResult
} from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  async register(data: RegisterRequest, ip?: string): Promise<ServiceResult<AuthResponse>> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });
      
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user with Prisma
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'student',
          status: 'pending_verification',
        }
      });

      // Generate tokens and refresh token record
      const tokens = await this.generateTokens(user);
      
      // Store refresh token in database
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: await this.hashRefreshToken(tokens.refreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }
      });

      // Log registration
      logger.info('User registered', { userId: user.id, email: user.email, ip });

      return {
        success: true,
        data: {
          user: this.toUserProfile(user),
          tokens,
        }
      };
    } catch (error) {
      logger.error('Registration failed', { error: error.message, email: data.email, ip });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Registration failed')
      };
    }
  }

  async login(credentials: LoginRequest, ip?: string): Promise<ServiceResult<AuthResponse>> {
    try {
      const { email, password } = credentials;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        logger.warn('Login failed - user not found', { email, ip });
        throw new AuthenticationError('Invalid credentials');
      }

      // Check if user is active
      if (user.status !== 'active') {
        logger.warn('Login failed - account inactive', { userId: user.id, email, ip });
        throw new AuthenticationError('Account is not active');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        logger.warn('Login failed - invalid password', { userId: user.id, email, ip });
        throw new AuthenticationError('Invalid credentials');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);
      
      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: await this.hashRefreshToken(tokens.refreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
      });

      logger.info('User logged in successfully', { userId: user.id, email, ip });

      return {
        success: true,
        data: {
          user: this.toUserProfile(user),
          tokens,
        }
      };
    } catch (error) {
      logger.error('Login failed', { error: error.message, email: credentials.email, ip });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Login failed')
      };
    }
  }

  async refreshToken(request: RefreshTokenRequest): Promise<ServiceResult<TokenPair>> {
    try {
      const { refreshToken } = request;
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.security.jwt.refreshSecret) as JWTPayload;
      
      // Check if refresh token exists in database and is not revoked
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          userId: decoded.userId,
          revoked: false,
          expiresAt: { gt: new Date() }
        },
        include: { user: true }
      });

      if (!tokenRecord || !tokenRecord.user || tokenRecord.user.status !== 'active') {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Verify token hash
      const isTokenValid = await bcrypt.compare(refreshToken, tokenRecord.tokenHash);
      if (!isTokenValid) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Revoke old refresh token
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revoked: true }
      });

      // Generate new tokens
      const newTokens = await this.generateTokens(tokenRecord.user);
      
      // Store new refresh token
      await prisma.refreshToken.create({
        data: {
          userId: tokenRecord.user.id,
          tokenHash: await this.hashRefreshToken(newTokens.refreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
      });

      return {
        success: true,
        data: newTokens
      };
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Token refresh failed')
      };
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<ServiceResult<void>> {
    try {
      if (refreshToken) {
        // Revoke specific refresh token
        const decoded = jwt.verify(refreshToken, config.security.jwt.refreshSecret) as JWTPayload;
        await prisma.refreshToken.updateMany({
          where: {
            userId: decoded.userId,
            revoked: false
          },
          data: { revoked: true }
        });
      } else {
        // Revoke all user's refresh tokens
        await prisma.refreshToken.updateMany({
          where: { userId, revoked: false },
          data: { revoked: true }
        });
      }

      logger.info('User logged out', { userId });
      
      return { success: true };
    } catch (error) {
      logger.error('Logout failed', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Logout failed')
      };
    }
  }

  async verifyToken(token: string): Promise<ServiceResult<UserProfile>> {
    try {
      const decoded = jwt.verify(token, config.security.jwt.secret) as JWTPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || user.status !== 'active') {
        throw new AuthenticationError('Invalid token');
      }

      return {
        success: true,
        data: this.toUserProfile(user)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Token verification failed')
      };
    }
  }

  async changePassword(userId: string, request: ChangePasswordRequest): Promise<ServiceResult<void>> {
    try {
      const { currentPassword, newPassword } = request;
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      // Revoke all refresh tokens to force re-login
      await prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true }
      });

      logger.info('Password changed', { userId });

      return { success: true };
    } catch (error) {
      logger.error('Password change failed', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Password change failed')
      };
    }
  }

  async forgotPassword(request: ForgotPasswordRequest): Promise<ServiceResult<void>> {
    try {
      const { email } = request;
      
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if email exists or not
        logger.info('Password reset requested for non-existent email', { email });
        return { success: true };
      }

      // Generate password reset token (implement email sending in production)
      const resetToken = uuidv4();
      
      // In production, store this token and send email
      logger.info('Password reset requested', { userId: user.id, email, resetToken });

      return { success: true };
    } catch (error) {
      logger.error('Password reset request failed', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Password reset request failed')
      };
    }
  }

  async resetPassword(request: ResetPasswordRequest): Promise<ServiceResult<void>> {
    try {
      // In production, verify the reset token here
      const { token, password } = request;
      
      // For now, just implement the password update logic
      // This would need proper token validation in production
      
      logger.info('Password reset completed', { token });

      return { success: true };
    } catch (error) {
      logger.error('Password reset failed', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Password reset failed')
      };
    }
  }

  private async generateTokens(user: any): Promise<TokenPair> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.security.jwt.secret, {
      expiresIn: config.security.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(payload, config.security.jwt.refreshSecret, {
      expiresIn: config.security.jwt.refreshExpiresIn,
    });

    // Calculate expiration time in seconds
    const expiresIn = this.parseExpirationTime(config.security.jwt.expiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.security.bcrypt.saltRounds);
  }

  private async hashRefreshToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  private parseExpirationTime(expiresIn: string): number {
    // Convert jwt expiration string to seconds
    const timeUnits: { [key: string]: number } = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400,
      'w': 604800,
    };

    const match = expiresIn.match(/^(\d+)([smhdw])$/);
    if (!match) return 3600; // Default 1 hour

    const [, value, unit] = match;
    return parseInt(value) * (timeUnits[unit] || 3600);
  }

  private toUserProfile(user: any): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}