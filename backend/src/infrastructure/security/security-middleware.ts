/**
 * Comprehensive Security Middleware Stack
 * Enterprise-level security middleware for authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { TokenManager } from '@/infrastructure/auth/token-manager';
import { RBACService } from '@/infrastructure/auth/rbac-service';
import { TwoFactorService } from '@/infrastructure/auth/two-factor-service';
import { sessionManager } from '@/infrastructure/cache/session-manager';
import { rateLimiter } from '@/infrastructure/security/rate-limiter';
import { auditService } from '@/infrastructure/audit/audit-service';
import { AuthenticationError, AuthorizationError } from '@/application/middlewares/error-handler';
import { logger } from '@/shared/utils/logger';

export interface SecurityContext {
  user: {
    id: string;
    email: string;
    role: string;
    subscriptionTier: string;
    isMainProfile: boolean;
    parentUserId?: string;
    twoFactorEnabled: boolean;
  };
  session: {
    sessionId: string;
    deviceId?: string;
    ipAddress: string;
    userAgent?: string;
  };
  permissions: string[];
}

export class SecurityMiddleware {
  private prisma: PrismaClient;
  private tokenManager: TokenManager;
  private rbacService: RBACService;
  private twoFactorService: TwoFactorService;

  constructor(
    prisma: PrismaClient,
    tokenManager: TokenManager,
    rbacService: RBACService,
    twoFactorService: TwoFactorService
  ) {
    this.prisma = prisma;
    this.tokenManager = tokenManager;
    this.rbacService = rbacService;
    this.twoFactorService = twoFactorService;
  }

  /**
   * Enhanced authentication middleware with session validation
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Access token required');
      }

      const token = authHeader.substring(7);
      
      // Verify token and get payload
      const payload = await this.tokenManager.verifyAccessToken(token);
      
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          subscriptionTier: true,
          isMainProfile: true,
          parentUserId: true,
          twoFactorEnabled: true,
          emailVerified: true,
        },
      });

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      if (user.status !== 'active') {
        throw new AuthenticationError('Account is not active');
      }

      if (!user.emailVerified) {
        throw new AuthenticationError('Email not verified');
      }

      // Validate session
      const session = await sessionManager.getSession(payload.sessionId);
      if (!session) {
        throw new AuthenticationError('Session not found or expired');
      }

      // Set security context
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        isMainProfile: user.isMainProfile,
        parentUserId: user.parentUserId,
        twoFactorEnabled: user.twoFactorEnabled,
      };

      req.session = {
        sessionId: payload.sessionId,
        deviceId: payload.deviceId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      };

      // Update session activity
      await sessionManager.updateSessionActivity(payload.sessionId);

      // Update device last seen
      if (payload.deviceId) {
        await sessionManager.updateDeviceLastSeen(user.id, payload.deviceId);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Optional authentication - doesn't throw if no token
   */
  optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return this.authenticate(req, res, next);
      }

      next();
    } catch (error) {
      // For optional auth, continue without user if token is invalid
      next();
    }
  };

  /**
   * Role-based authorization middleware
   */
  requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        return next(new AuthenticationError('Authentication required'));
      }

      if (!allowedRoles.includes(req.user.role)) {
        auditService.logSecurityEvent({
          userId: req.user.id,
          action: 'unauthorized_access_attempt',
          threatLevel: 'medium',
          blocked: true,
          reason: `Insufficient role permissions. Required: ${allowedRoles.join(', ')}, Has: ${req.user.role}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            endpoint: req.path,
            method: req.method,
            allowedRoles,
            userRole: req.user.role,
          },
        });

        return next(new AuthorizationError('Insufficient permissions'));
      }

      next();
    };
  };

  /**
   * Permission-based authorization middleware
   */
  requirePermission = (resource: string, action: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          return next(new AuthenticationError('Authentication required'));
        }

        const hasPermission = await this.rbacService.hasPermission(
          req.user.id,
          resource,
          action
        );

        if (!hasPermission) {
          await auditService.logSecurityEvent({
            userId: req.user.id,
            action: 'unauthorized_access_attempt',
            threatLevel: 'medium',
            blocked: true,
            reason: `Missing permission: ${resource}.${action}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            metadata: {
              endpoint: req.path,
              method: req.method,
              requiredPermission: `${resource}.${action}`,
            },
          });

          return next(new AuthorizationError('Insufficient permissions'));
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  /**
   * Subscription tier authorization middleware
   */
  requireSubscriptionTier = (requiredTier: 'free' | 'premium' | 'ultra') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          return next(new AuthenticationError('Authentication required'));
        }

        const hasAccess = await this.rbacService.hasSubscriptionAccess(
          req.user.id,
          requiredTier
        );

        if (!hasAccess) {
          await auditService.logSecurityEvent({
            userId: req.user.id,
            action: 'subscription_access_denied',
            threatLevel: 'low',
            blocked: true,
            reason: `Insufficient subscription tier. Required: ${requiredTier}, Has: ${req.user.subscriptionTier}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            metadata: {
              endpoint: req.path,
              requiredTier,
              userTier: req.user.subscriptionTier,
            },
          });

          return next(new AuthorizationError('Subscription upgrade required'));
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  /**
   * 2FA requirement middleware for sensitive operations
   */
  require2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new AuthenticationError('Authentication required'));
      }

      const is2FAEnabled = await this.twoFactorService.is2FAEnabled(req.user.id);
      
      if (!is2FAEnabled) {
        return next(new AuthorizationError('Two-factor authentication required'));
      }

      // Check if 2FA was recently verified in this session
      const session = await sessionManager.getSession(req.session.sessionId);
      const twoFactorVerified = session?.metadata?.twoFactorVerified;
      const verifiedAt = session?.metadata?.twoFactorVerifiedAt;

      // Require re-verification if not verified in last 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      if (!twoFactorVerified || !verifiedAt || new Date(verifiedAt) < thirtyMinutesAgo) {
        return res.status(403).json({
          error: 'Two-Factor Authentication Required',
          message: 'Please verify your identity with 2FA',
          code: 'TWO_FACTOR_REQUIRED',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Device trust validation middleware
   */
  requireTrustedDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.session.deviceId) {
        return next(new AuthorizationError('Trusted device required'));
      }

      const device = await sessionManager.getDevice(req.user.id, req.session.deviceId);
      
      if (!device || !device.isTrusted) {
        await auditService.logSecurityEvent({
          userId: req.user.id,
          action: 'untrusted_device_access_attempt',
          threatLevel: 'medium',
          blocked: true,
          reason: 'Device not marked as trusted',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            deviceId: req.session.deviceId,
            endpoint: req.path,
          },
        });

        return next(new AuthorizationError('Device must be verified as trusted'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * IP whitelist middleware
   */
  requireWhitelistedIP = (allowedIPs: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const clientIP = req.ip;
      
      if (!allowedIPs.includes(clientIP)) {
        await auditService.logSecurityEvent({
          userId: req.user?.id,
          action: 'ip_access_denied',
          threatLevel: 'high',
          blocked: true,
          reason: `IP address not in whitelist: ${clientIP}`,
          ipAddress: clientIP,
          userAgent: req.get('User-Agent'),
          metadata: {
            endpoint: req.path,
            allowedIPs,
          },
        });

        return res.status(403).json({
          error: 'Access Denied',
          message: 'Your IP address is not authorized',
        });
      }

      next();
    };
  };

  /**
   * Geographic restriction middleware
   */
  requireGeography = (allowedCountries: string[], blockedCountries?: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const countryCode = req.get('CF-IPCountry') || req.get('X-Country-Code');
      
      if (!countryCode) {
        return next(); // Allow if country cannot be determined
      }

      if (blockedCountries && blockedCountries.includes(countryCode)) {
        await auditService.logSecurityEvent({
          userId: req.user?.id,
          action: 'geographic_access_denied',
          threatLevel: 'medium',
          blocked: true,
          reason: `Access from blocked country: ${countryCode}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            countryCode,
            endpoint: req.path,
            blockedCountries,
          },
        });

        return res.status(403).json({
          error: 'Geographic Restriction',
          message: 'Access from this location is not permitted',
        });
      }

      if (allowedCountries.length > 0 && !allowedCountries.includes(countryCode)) {
        await auditService.logSecurityEvent({
          userId: req.user?.id,
          action: 'geographic_access_denied',
          threatLevel: 'medium',
          blocked: true,
          reason: `Access from non-allowed country: ${countryCode}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            countryCode,
            endpoint: req.path,
            allowedCountries,
          },
        });

        return res.status(403).json({
          error: 'Geographic Restriction',
          message: 'Access from this location is not permitted',
        });
      }

      next();
    };
  };

  /**
   * Time-based access restriction middleware
   */
  requireTimeWindow = (allowedHours: { start: number; end: number }) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const currentHour = new Date().getHours();
      
      if (currentHour < allowedHours.start || currentHour > allowedHours.end) {
        return res.status(403).json({
          error: 'Time Restriction',
          message: `Access is only allowed between ${allowedHours.start}:00 and ${allowedHours.end}:00`,
        });
      }

      next();
    };
  };

  /**
   * Admin-only access with enhanced logging
   */
  adminOnly = [
    this.authenticate,
    this.requireRole(['admin']),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      await auditService.trackAdminAction(
        req.user!.id,
        `admin_access_${req.method.toLowerCase()}`,
        undefined,
        'admin_endpoint',
        req.path,
        undefined,
        undefined,
        req.ip,
        req.get('User-Agent')
      );
      next();
    },
  ];

  /**
   * Premium content access with all checks
   */
  premiumContentAccess = [
    this.authenticate,
    this.requireSubscriptionTier('premium'),
    this.requirePermission('premium', 'access'),
  ];

  /**
   * Sensitive operation protection
   */
  sensitiveOperation = [
    this.authenticate,
    this.require2FA,
    this.requireTrustedDevice,
  ];

  /**
   * Create combined security middleware
   */
  createSecurityStack = (options: {
    auth?: 'required' | 'optional';
    roles?: string[];
    permissions?: Array<{ resource: string; action: string }>;
    subscriptionTier?: 'free' | 'premium' | 'ultra';
    require2FA?: boolean;
    trustedDevice?: boolean;
    ipWhitelist?: string[];
    allowedCountries?: string[];
    blockedCountries?: string[];
    timeWindow?: { start: number; end: number };
    rateLimit?: any;
  } = {}) => {
    const middleware: any[] = [];

    // Rate limiting (if specified)
    if (options.rateLimit) {
      middleware.push(rateLimiter.createLimiter(options.rateLimit));
    }

    // Authentication
    if (options.auth === 'required') {
      middleware.push(this.authenticate);
    } else if (options.auth === 'optional') {
      middleware.push(this.optionalAuthenticate);
    }

    // IP whitelist
    if (options.ipWhitelist) {
      middleware.push(this.requireWhitelistedIP(options.ipWhitelist));
    }

    // Geographic restrictions
    if (options.allowedCountries || options.blockedCountries) {
      middleware.push(this.requireGeography(
        options.allowedCountries || [],
        options.blockedCountries
      ));
    }

    // Time window
    if (options.timeWindow) {
      middleware.push(this.requireTimeWindow(options.timeWindow));
    }

    // Role-based authorization
    if (options.roles) {
      middleware.push(this.requireRole(options.roles));
    }

    // Permission-based authorization
    if (options.permissions) {
      for (const permission of options.permissions) {
        middleware.push(this.requirePermission(permission.resource, permission.action));
      }
    }

    // Subscription tier
    if (options.subscriptionTier) {
      middleware.push(this.requireSubscriptionTier(options.subscriptionTier));
    }

    // 2FA requirement
    if (options.require2FA) {
      middleware.push(this.require2FA);
    }

    // Trusted device
    if (options.trustedDevice) {
      middleware.push(this.requireTrustedDevice);
    }

    return middleware;
  };
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: SecurityContext['user'];
      session?: SecurityContext['session'];
    }
  }
}