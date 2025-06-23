/**
 * Password Reset Service
 * Secure password reset implementation with email verification and token management
 */

import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { emailService } from '@/infrastructure/email/email-service';
import { auditService } from '@/infrastructure/audit/audit-service';
import { sessionManager } from '@/infrastructure/cache/session-manager';
import { config } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

export interface PasswordResetRequest {
  email: string;
  ipAddress: string;
  userAgent?: string;
}

export interface PasswordResetData {
  token: string;
  newPassword: string;
  ipAddress: string;
  userAgent?: string;
}

export interface PasswordResetStatus {
  isValid: boolean;
  email?: string;
  expiresAt?: Date;
  attempts?: number;
}

export class PasswordResetService {
  private prisma: PrismaClient;
  private readonly TOKEN_EXPIRY_HOURS = 2; // 2 hours
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
  private readonly MAX_REQUESTS_PER_HOUR = 3;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Request password reset - generates secure token and sends email
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    const { email, ipAddress, userAgent } = data;

    // Check rate limiting for this IP/email combination
    await this.checkRateLimit(email, ipAddress);

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        passwordResetToken: true,
        passwordResetExpires: true,
      },
    });

    // Log the attempt regardless of whether user exists (for security)
    await auditService.logAuthEvent({
      userId: user?.id,
      action: 'password_reset_requested',
      email,
      ipAddress,
      userAgent,
      success: !!user,
      failureReason: user ? undefined : 'user_not_found',
      severity: 'medium',
    });

    // Don't reveal if email exists or not - always return success
    if (!user) {
      logger.info('Password reset requested for non-existent email', { email, ipAddress });
      return;
    }

    // Check if user account is active
    if (user.status !== 'active' && user.status !== 'pending_verification') {
      logger.warn('Password reset requested for inactive account', {
        userId: user.id,
        email,
        status: user.status,
        ipAddress,
      });
      return;
    }

    // Check if there's already a valid reset token
    if (user.passwordResetToken && user.passwordResetExpires && user.passwordResetExpires > new Date()) {
      logger.info('Password reset token already exists and is valid', {
        userId: user.id,
        email,
        expiresAt: user.passwordResetExpires,
      });
      
      // Don't send a new email, but log the duplicate request
      await auditService.logSecurityEvent({
        userId: user.id,
        action: 'duplicate_password_reset_request',
        threatLevel: 'low',
        blocked: false,
        reason: 'Valid reset token already exists',
        ipAddress,
        userAgent,
        metadata: { email },
      });
      
      return;
    }

    // Generate secure token
    const token = this.generateSecureToken();
    const hashedToken = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Store hashed token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt,
      },
    });

    // Generate reset URL
    const resetUrl = `${config.app.url}/auth/reset-password?token=${token}`;

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        resetUrl,
        expiresIn: `${this.TOKEN_EXPIRY_HOURS} hours`,
        appName: config.app.name,
        appUrl: config.app.url,
      });

      logger.info('Password reset email sent', {
        userId: user.id,
        email: user.email,
        expiresAt,
      });
    } catch (error) {
      logger.error('Failed to send password reset email', {
        userId: user.id,
        email: user.email,
        error,
      });

      // Clear the reset token if email failed
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Verify password reset token
   */
  async verifyResetToken(token: string): Promise<PasswordResetStatus> {
    const hashedToken = this.hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        passwordResetExpires: true,
      },
    });

    if (!user) {
      return { isValid: false };
    }

    return {
      isValid: true,
      email: user.email,
      expiresAt: user.passwordResetExpires!,
    };
  }

  /**
   * Reset password using valid token
   */
  async resetPassword(data: PasswordResetData): Promise<void> {
    const { token, newPassword, ipAddress, userAgent } = data;

    // Verify token
    const tokenStatus = await this.verifyResetToken(token);
    if (!tokenStatus.isValid) {
      await auditService.logSecurityEvent({
        action: 'invalid_password_reset_attempt',
        threatLevel: 'medium',
        blocked: true,
        reason: 'Invalid or expired reset token',
        ipAddress,
        userAgent,
        metadata: { token: token.substring(0, 8) + '...' },
      });

      throw new Error('Invalid or expired reset token');
    }

    const hashedToken = this.hashToken(token);

    // Find user with the token
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new Error('Invalid reset token');
    }

    // Validate new password strength
    this.validatePassword(newPassword);

    // Check if new password is different from current password
    if (user.passwordHash && await bcrypt.compare(newPassword, user.passwordHash)) {
      await auditService.logSecurityEvent({
        userId: user.id,
        action: 'password_reset_same_password',
        threatLevel: 'low',
        blocked: true,
        reason: 'New password is the same as current password',
        ipAddress,
        userAgent,
        metadata: { email: user.email },
      });

      throw new Error('New password must be different from your current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, config.security.bcrypt.saltRounds);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        // Update status to active if it was pending verification
        status: user.email ? 'active' : undefined,
      },
    });

    // Revoke all existing sessions and refresh tokens for security
    await sessionManager.revokeUserSessions(user.id);
    
    // Also revoke refresh tokens in database
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });

    // Log successful password reset
    await auditService.logAuthEvent({
      userId: user.id,
      action: 'password_reset_completed',
      email: user.email,
      ipAddress,
      userAgent,
      success: true,
      severity: 'high',
    });

    // Send confirmation email
    try {
      await emailService.sendPasswordChanged(user.email, {
        firstName: user.firstName,
        lastName: user.lastName,
        appName: config.app.name,
        appUrl: config.app.url,
      });
    } catch (error) {
      logger.error('Failed to send password changed confirmation email', {
        userId: user.id,
        email: user.email,
        error,
      });
      // Don't throw error here as password was successfully changed
    }

    logger.info('Password reset completed successfully', {
      userId: user.id,
      email: user.email,
      ipAddress,
    });
  }

  /**
   * Cancel/invalidate password reset token
   */
  async cancelPasswordReset(email: string, userId?: string): Promise<void> {
    const whereClause = userId ? { id: userId } : { email: email.toLowerCase() };

    const user = await this.prisma.user.findUnique({
      where: whereClause,
      select: { id: true, email: true },
    });

    if (!user) {
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await auditService.logAuthEvent({
      userId: user.id,
      action: 'password_reset_cancelled',
      email: user.email,
      success: true,
      severity: 'low',
    });

    logger.info('Password reset cancelled', {
      userId: user.id,
      email: user.email,
    });
  }

  /**
   * Clean up expired password reset tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    const result = await this.prisma.user.updateMany({
      where: {
        passwordResetExpires: {
          lt: new Date(),
        },
        passwordResetToken: {
          not: null,
        },
      },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    logger.info('Cleaned up expired password reset tokens', {
      tokensCleared: result.count,
    });
  }

  /**
   * Get password reset statistics
   */
  async getPasswordResetStats(startDate: Date, endDate: Date): Promise<{
    totalRequests: number;
    completedResets: number;
    failedAttempts: number;
    currentPendingTokens: number;
  }> {
    const [totalRequests, completedResets, failedAttempts, currentPendingTokens] = await Promise.all([
      this.prisma.userAudit.count({
        where: {
          action: 'password_reset_requested',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.userAudit.count({
        where: {
          action: 'password_reset_completed',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.userAudit.count({
        where: {
          action: 'invalid_password_reset_attempt',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.user.count({
        where: {
          passwordResetToken: { not: null },
          passwordResetExpires: { gt: new Date() },
        },
      }),
    ]);

    return {
      totalRequests,
      completedResets,
      failedAttempts,
      currentPendingTokens,
    };
  }

  // Private helper methods
  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  private async checkRateLimit(email: string, ipAddress: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;

    // Check rate limiting by email
    const emailAttempts = await this.prisma.userAudit.count({
      where: {
        action: 'password_reset_requested',
        newValues: {
          path: ['email'],
          equals: email,
        },
        createdAt: {
          gte: new Date(windowStart),
        },
      },
    });

    if (emailAttempts >= this.MAX_REQUESTS_PER_HOUR) {
      await auditService.logSecurityEvent({
        action: 'password_reset_rate_limit_exceeded',
        threatLevel: 'medium',
        blocked: true,
        reason: `Too many password reset requests for email: ${email}`,
        ipAddress,
        metadata: {
          email,
          attempts: emailAttempts,
          windowHours: this.RATE_LIMIT_WINDOW / (60 * 60 * 1000),
        },
      });

      throw new Error('Too many password reset requests. Please try again later.');
    }

    // Check rate limiting by IP
    const ipAttempts = await this.prisma.userAudit.count({
      where: {
        action: 'password_reset_requested',
        ipAddress,
        createdAt: {
          gte: new Date(windowStart),
        },
      },
    });

    if (ipAttempts >= this.MAX_REQUESTS_PER_HOUR * 2) { // Allow slightly more per IP
      await auditService.logSecurityEvent({
        action: 'password_reset_ip_rate_limit_exceeded',
        threatLevel: 'medium',
        blocked: true,
        reason: `Too many password reset requests from IP: ${ipAddress}`,
        ipAddress,
        metadata: {
          attempts: ipAttempts,
          windowHours: this.RATE_LIMIT_WINDOW / (60 * 60 * 1000),
        },
      });

      throw new Error('Too many password reset requests from this location. Please try again later.');
    }
  }
}