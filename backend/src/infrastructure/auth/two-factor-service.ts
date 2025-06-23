/**
 * Two-Factor Authentication Service
 * Handles TOTP, SMS, Email and Backup Codes for 2FA
 */

import { randomBytes, createHmac } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { sessionManager } from '@/infrastructure/cache/session-manager';
import { emailService } from '@/infrastructure/email/email-service';
import { logger } from '@/shared/utils/logger';

export interface TotpSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorChallenge {
  challengeId: string;
  type: 'totp' | 'email' | 'sms' | 'backup_codes';
  expiresAt: Date;
}

export class TwoFactorService {
  private prisma: PrismaClient;
  private readonly TOTP_WINDOW = 30; // 30 seconds
  private readonly TOTP_DIGITS = 6;
  private readonly CODE_EXPIRY = 300; // 5 minutes in seconds

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generate TOTP secret and QR code for setup
   */
  async setupTOTP(userId: string): Promise<TotpSetupData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate a random secret
    const secret = this.generateSecret();
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    
    // Create QR code data (in production, use a QR code library)
    const qrCodeData = this.generateQRCodeData(user.email, secret);
    
    return {
      secret,
      qrCode: qrCodeData,
      backupCodes,
    };
  }

  /**
   * Enable 2FA for user after verification
   */
  async enable2FA(
    userId: string,
    secret: string,
    totpCode: string,
    backupCodes: string[]
  ): Promise<void> {
    // Verify the TOTP code first
    const isValid = this.verifyTOTP(secret, totpCode);
    if (!isValid) {
      throw new Error('Invalid TOTP code');
    }

    // Hash backup codes before storing
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    // Update user with 2FA settings
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        backupCodes: hashedBackupCodes,
      },
    });

    logger.info('2FA enabled for user', { userId });
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId: string, currentPassword: string): Promise<void> {
    // In a real implementation, verify the current password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
    });

    // Clear any pending 2FA tokens
    await this.prisma.twoFactorToken.deleteMany({
      where: { userId },
    });

    logger.info('2FA disabled for user', { userId });
  }

  /**
   * Generate 2FA challenge for login
   */
  async generate2FAChallenge(userId: string): Promise<TwoFactorChallenge> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new Error('2FA not enabled for user');
    }

    const challengeId = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.CODE_EXPIRY * 1000);

    // For email-based 2FA, generate and send code
    if (!user.twoFactorSecret) {
      const code = this.generateEmailCode();
      
      // Store the code
      await this.prisma.twoFactorToken.create({
        data: {
          userId,
          type: 'email',
          token: code,
          expiresAt,
        },
      });

      // Send email
      await emailService.sendTwoFactorCode({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        code,
        expiresIn: '5 minutes',
        appName: 'DoramaFlix',
      });

      return {
        challengeId,
        type: 'email',
        expiresAt,
      };
    }

    // For TOTP-based 2FA
    return {
      challengeId,
      type: 'totp',
      expiresAt,
    };
  }

  /**
   * Verify 2FA code
   */
  async verify2FACode(
    userId: string,
    code: string,
    type: 'totp' | 'email' | 'backup_codes'
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true,
      },
    });

    if (!user || !user.twoFactorEnabled) {
      return false;
    }

    switch (type) {
      case 'totp':
        if (!user.twoFactorSecret) {
          return false;
        }
        return this.verifyTOTP(user.twoFactorSecret, code);

      case 'email':
        return this.verifyEmailCode(userId, code);

      case 'backup_codes':
        return this.verifyBackupCode(userId, code, user.backupCodes);

      default:
        return false;
    }
  }

  /**
   * Generate new backup codes
   */
  async generateNewBackupCodes(userId: string): Promise<string[]> {
    const newCodes = this.generateBackupCodes();
    const hashedCodes = newCodes.map(code => this.hashBackupCode(code));

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        backupCodes: hashedCodes,
      },
    });

    logger.info('New backup codes generated', { userId });
    return newCodes;
  }

  /**
   * Check if user has 2FA enabled
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return user?.twoFactorEnabled || false;
  }

  /**
   * Get 2FA status and available methods
   */
  async get2FAStatus(userId: string): Promise<{
    enabled: boolean;
    methods: string[];
    backupCodesRemaining: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const methods: string[] = [];
    if (user.twoFactorSecret) {
      methods.push('totp');
    } else {
      methods.push('email');
    }

    if (user.backupCodes.length > 0) {
      methods.push('backup_codes');
    }

    return {
      enabled: user.twoFactorEnabled,
      methods,
      backupCodesRemaining: user.backupCodes.length,
    };
  }

  // Private helper methods
  private generateSecret(): string {
    return randomBytes(20).toString('base32');
  }

  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString().substr(2, 8);
      codes.push(code);
    }
    return codes;
  }

  private generateEmailCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateQRCodeData(email: string, secret: string): string {
    // In production, use a QR code library like 'qrcode'
    const issuer = 'DoramaFlix';
    const otpauthUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
    return otpauthUrl;
  }

  private verifyTOTP(secret: string, token: string): boolean {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(currentTimestamp / this.TOTP_WINDOW);

    // Check current time window and one window before/after for clock skew
    for (let i = -1; i <= 1; i++) {
      const testTimestamp = timeStep + i;
      const expectedToken = this.generateTOTP(secret, testTimestamp);
      
      if (this.constantTimeCompare(token, expectedToken)) {
        return true;
      }
    }

    return false;
  }

  private generateTOTP(secret: string, timeStep: number): string {
    const secretBuffer = Buffer.from(secret, 'base32');
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(timeStep));

    const hmac = createHmac('sha1', secretBuffer);
    hmac.update(timeBuffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0xf;
    const code = ((digest[offset] & 0x7f) << 24) |
                 ((digest[offset + 1] & 0xff) << 16) |
                 ((digest[offset + 2] & 0xff) << 8) |
                 (digest[offset + 3] & 0xff);

    return (code % Math.pow(10, this.TOTP_DIGITS)).toString().padStart(this.TOTP_DIGITS, '0');
  }

  private async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const token = await this.prisma.twoFactorToken.findFirst({
      where: {
        userId,
        type: 'email',
        token: code,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!token) {
      return false;
    }

    // Mark token as used
    await this.prisma.twoFactorToken.update({
      where: { id: token.id },
      data: { used: true },
    });

    return true;
  }

  private async verifyBackupCode(
    userId: string,
    code: string,
    hashedCodes: string[]
  ): Promise<boolean> {
    const hashedInputCode = this.hashBackupCode(code);
    const codeIndex = hashedCodes.findIndex(hashedCode => 
      this.constantTimeCompare(hashedCode, hashedInputCode)
    );

    if (codeIndex === -1) {
      return false;
    }

    // Remove the used backup code
    const updatedCodes = hashedCodes.filter((_, index) => index !== codeIndex);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        backupCodes: updatedCodes,
      },
    });

    logger.info('Backup code used', { userId, remainingCodes: updatedCodes.length });
    return true;
  }

  private hashBackupCode(code: string): string {
    return createHmac('sha256', 'backup-code-salt').update(code).digest('hex');
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Clean up expired 2FA tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.twoFactorToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Get 2FA statistics
   */
  async get2FAStats(): Promise<{
    totalUsers: number;
    users2FAEnabled: number;
    totpUsers: number;
    emailUsers: number;
  }> {
    const [totalUsers, users2FAEnabled, totpUsers, emailUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { twoFactorEnabled: true },
      }),
      this.prisma.user.count({
        where: {
          twoFactorEnabled: true,
          twoFactorSecret: { not: null },
        },
      }),
      this.prisma.user.count({
        where: {
          twoFactorEnabled: true,
          twoFactorSecret: null,
        },
      }),
    ]);

    return {
      totalUsers,
      users2FAEnabled,
      totpUsers,
      emailUsers,
    };
  }
}