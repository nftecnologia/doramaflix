/**
 * Enhanced Authentication Controller
 * Comprehensive authentication endpoints with OAuth, 2FA, and advanced security features
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/application/services/auth.service';
import { TwoFactorService } from '@/infrastructure/auth/two-factor-service';
import { OAuthService } from '@/infrastructure/auth/oauth-service';
import { RBACService } from '@/infrastructure/auth/rbac-service';
import { PasswordResetService } from '@/infrastructure/auth/password-reset-service';
import { auditService } from '@/infrastructure/audit/audit-service';
import { asyncHandler } from '@/application/middlewares/error-handler';
import { validateRequest } from '@/application/middlewares/validation.middleware';
import { authValidationSchemas } from '@/presentation/validators/auth.validators';

export class EnhancedAuthController {
  private authService: AuthService;
  private twoFactorService: TwoFactorService;
  private oauthService: OAuthService;
  private rbacService: RBACService;
  private passwordResetService: PasswordResetService;
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    this.authService = new AuthService(undefined as any, this.prisma); // UserRepository will be injected
    this.twoFactorService = new TwoFactorService(this.prisma);
    this.oauthService = new OAuthService(this.prisma);
    this.rbacService = new RBACService(this.prisma);
    this.passwordResetService = new PasswordResetService(this.prisma);
  }

  // Basic Authentication Endpoints
  register = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body;
    const deviceInfo = {
      deviceId: req.get('X-Device-ID') || 'unknown',
      deviceType: req.get('X-Device-Type') || 'web',
      deviceName: req.get('X-Device-Name') || 'Unknown Device',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      location: req.get('X-Location'),
    };

    const result = await this.authService.register(
      { ...data, deviceInfo },
      req.ip
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'User registered successfully. Please check your email to verify your account.',
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const credentials = req.body;
    const deviceInfo = {
      deviceId: req.get('X-Device-ID') || 'unknown',
      deviceType: req.get('X-Device-Type') || 'web',
      deviceName: req.get('X-Device-Name') || 'Unknown Device',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      location: req.get('X-Location'),
    };

    const result = await this.authService.login(
      { ...credentials, deviceInfo },
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      data: result,
      message: result.requiresTwoFactor ? 'Two-factor authentication required' : 'Login successful',
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const deviceInfo = {
      deviceId: req.get('X-Device-ID') || 'unknown',
      deviceType: req.get('X-Device-Type') || 'web',
      deviceName: req.get('X-Device-Name') || 'Unknown Device',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      location: req.get('X-Location'),
    };

    const tokens = await this.authService.refreshToken(refreshToken, deviceInfo);

    res.json({
      success: true,
      data: { tokens },
      message: 'Tokens refreshed successfully',
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const sessionId = req.session?.sessionId;

    if (userId) {
      await this.authService.logout(
        userId,
        sessionId,
        req.ip,
        req.get('User-Agent')
      );
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  });

  // Profile Management
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;

    res.json({
      success: true,
      data: { user },
      message: 'Profile retrieved successfully',
    });
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    await this.authService.changePassword(
      userId,
      currentPassword,
      newPassword,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  });

  // Email Verification
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    await this.authService.verifyEmail(token);

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  });

  resendEmailVerification = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    await this.authService.resendEmailVerification(
      email,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'If an account with that email exists, a verification email has been sent',
    });
  });

  // Password Reset
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    await this.authService.requestPasswordReset(
      email,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
    });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    await this.authService.resetPassword(
      token,
      newPassword,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  });

  verifyResetToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    const status = await this.passwordResetService.verifyResetToken(token);

    res.json({
      success: true,
      data: status,
      message: status.isValid ? 'Token is valid' : 'Token is invalid or expired',
    });
  });

  // OAuth Authentication
  oauthLogin = asyncHandler(async (req: Request, res: Response) => {
    const { provider, accessToken, idToken } = req.body;
    const deviceInfo = {
      deviceId: req.get('X-Device-ID') || 'unknown',
      deviceType: req.get('X-Device-Type') || 'web',
      deviceName: req.get('X-Device-Name') || 'Unknown Device',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      location: req.get('X-Location'),
    };

    const result = await this.authService.loginWithOAuth(
      { provider, accessToken, idToken, deviceInfo },
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      data: result,
      message: 'OAuth login successful',
    });
  });

  unlinkOAuth = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { provider } = req.params;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    await this.oauthService.unlinkOAuthAccount(userId, provider);

    res.json({
      success: true,
      message: `${provider} account unlinked successfully`,
    });
  });

  getOAuthAccounts = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const accounts = await this.oauthService.getUserOAuthAccounts(userId);

    res.json({
      success: true,
      data: { accounts },
      message: 'OAuth accounts retrieved successfully',
    });
  });

  // Two-Factor Authentication
  setup2FA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const setupData = await this.twoFactorService.setupTOTP(userId);

    res.json({
      success: true,
      data: setupData,
      message: '2FA setup initiated. Please scan the QR code with your authenticator app.',
    });
  });

  enable2FA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { secret, totpCode, backupCodes } = req.body;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    await this.twoFactorService.enable2FA(userId, secret, totpCode, backupCodes);

    res.json({
      success: true,
      message: '2FA enabled successfully',
    });
  });

  disable2FA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword } = req.body;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    await this.twoFactorService.disable2FA(userId, currentPassword);

    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  });

  verify2FA = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { code, type } = req.body;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const isValid = await this.twoFactorService.verify2FACode(userId, code, type);

    res.json({
      success: true,
      data: { valid: isValid },
      message: isValid ? '2FA code verified' : 'Invalid 2FA code',
    });
  });

  generate2FABackupCodes = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const backupCodes = await this.twoFactorService.generateNewBackupCodes(userId);

    res.json({
      success: true,
      data: { backupCodes },
      message: 'New backup codes generated. Please store them securely.',
    });
  });

  get2FAStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const status = await this.twoFactorService.get2FAStatus(userId);

    res.json({
      success: true,
      data: status,
      message: '2FA status retrieved successfully',
    });
  });

  // Session Management
  getSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const sessions = await this.authService.getUserSessions(userId);

    res.json({
      success: true,
      data: { sessions },
      message: 'Sessions retrieved successfully',
    });
  });

  revokeSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    await this.authService.revokeSession(userId, sessionId);

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  });

  revokeAllSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const currentSessionId = req.session?.sessionId;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    await this.authService.revokeAllSessions(userId, currentSessionId);

    res.json({
      success: true,
      message: 'All other sessions revoked successfully',
    });
  });

  // Device Management
  getDevices = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const devices = await this.authService.getUserDevices(userId);

    res.json({
      success: true,
      data: { devices },
      message: 'Devices retrieved successfully',
    });
  });

  revokeDevice = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { deviceId } = req.params;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    await this.authService.revokeDevice(userId, deviceId);

    res.json({
      success: true,
      message: 'Device revoked successfully',
    });
  });

  trustDevice = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { deviceId } = req.params;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    await this.authService.trustDevice(userId, deviceId);

    res.json({
      success: true,
      message: 'Device marked as trusted',
    });
  });

  // Permissions and Roles
  getUserPermissions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const permissions = await this.rbacService.getUserPermissions(userId);

    res.json({
      success: true,
      data: permissions,
      message: 'User permissions retrieved successfully',
    });
  });

  checkPermission = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { resource, action } = req.params;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const hasPermission = await this.rbacService.hasPermission(userId, resource, action);

    res.json({
      success: true,
      data: { hasPermission },
      message: hasPermission ? 'Permission granted' : 'Permission denied',
    });
  });

  // Audit and Security
  getAuditTrail = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { limit = 50, offset = 0, category } = req.query;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const auditTrail = await auditService.getUserAuditTrail(
      userId,
      Number(limit),
      Number(offset),
      category as string
    );

    res.json({
      success: true,
      data: { auditTrail },
      message: 'Audit trail retrieved successfully',
    });
  });

  // Token Verification
  verifyToken = asyncHandler(async (req: Request, res: Response) => {
    // If we reach here, the token is valid (middleware already verified it)
    res.json({
      success: true,
      data: { valid: true, user: req.user },
      message: 'Token is valid',
    });
  });

  // Admin endpoints (for role management, etc.)
  getAllRoles = asyncHandler(async (req: Request, res: Response) => {
    const roles = await this.rbacService.getAllRoles();

    res.json({
      success: true,
      data: { roles },
      message: 'Roles retrieved successfully',
    });
  });

  getAllPermissions = asyncHandler(async (req: Request, res: Response) => {
    const permissions = await this.rbacService.getAllPermissions();

    res.json({
      success: true,
      data: { permissions },
      message: 'Permissions retrieved successfully',
    });
  });

  // Statistics (admin only)
  getAuthStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const [auditStats, rbacStats, passwordResetStats, twoFactorStats] = await Promise.all([
      auditService.getAuditStats(start, end),
      this.rbacService.getRBACStats(),
      this.passwordResetService.getPasswordResetStats(start, end),
      this.twoFactorService.get2FAStats(),
    ]);

    res.json({
      success: true,
      data: {
        audit: auditStats,
        rbac: rbacStats,
        passwordReset: passwordResetStats,
        twoFactor: twoFactorStats,
      },
      message: 'Authentication statistics retrieved successfully',
    });
  });
}

// Factory function with validation middleware
export const createEnhancedAuthController = () => {
  const controller = new EnhancedAuthController();

  return {
    // Basic Authentication
    register: [
      validateRequest(authValidationSchemas.register),
      controller.register,
    ],
    login: [
      validateRequest(authValidationSchemas.login),
      controller.login,
    ],
    refreshToken: [
      validateRequest(authValidationSchemas.refreshToken),
      controller.refreshToken,
    ],
    logout: controller.logout,
    
    // Profile Management
    getProfile: controller.getProfile,
    changePassword: [
      validateRequest(authValidationSchemas.changePassword),
      controller.changePassword,
    ],

    // Email Verification
    verifyEmail: [
      validateRequest(authValidationSchemas.verifyEmail),
      controller.verifyEmail,
    ],
    resendEmailVerification: controller.resendEmailVerification,

    // Password Reset
    forgotPassword: [
      validateRequest(authValidationSchemas.forgotPassword),
      controller.forgotPassword,
    ],
    resetPassword: [
      validateRequest(authValidationSchemas.resetPassword),
      controller.resetPassword,
    ],
    verifyResetToken: controller.verifyResetToken,

    // OAuth
    oauthLogin: controller.oauthLogin,
    unlinkOAuth: controller.unlinkOAuth,
    getOAuthAccounts: controller.getOAuthAccounts,

    // 2FA
    setup2FA: controller.setup2FA,
    enable2FA: controller.enable2FA,
    disable2FA: controller.disable2FA,
    verify2FA: controller.verify2FA,
    generate2FABackupCodes: controller.generate2FABackupCodes,
    get2FAStatus: controller.get2FAStatus,

    // Session Management
    getSessions: controller.getSessions,
    revokeSession: controller.revokeSession,
    revokeAllSessions: controller.revokeAllSessions,

    // Device Management
    getDevices: controller.getDevices,
    revokeDevice: controller.revokeDevice,
    trustDevice: controller.trustDevice,

    // Permissions
    getUserPermissions: controller.getUserPermissions,
    checkPermission: controller.checkPermission,

    // Audit
    getAuditTrail: controller.getAuditTrail,

    // Token Verification
    verifyToken: controller.verifyToken,

    // Admin
    getAllRoles: controller.getAllRoles,
    getAllPermissions: controller.getAllPermissions,
    getAuthStats: controller.getAuthStats,
  };
};