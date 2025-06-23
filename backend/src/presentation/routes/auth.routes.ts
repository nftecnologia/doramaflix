/**
 * Enhanced Authentication Routes
 * Comprehensive auth routes with OAuth, 2FA, device management, and security features
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createEnhancedAuthController } from '@/application/controllers/enhanced-auth.controller';
import { SecurityMiddleware } from '@/infrastructure/security/security-middleware';
import { TokenManager } from '@/infrastructure/auth/token-manager';
import { RBACService } from '@/infrastructure/auth/rbac-service';
import { TwoFactorService } from '@/infrastructure/auth/two-factor-service';
import { rateLimiter } from '@/infrastructure/security/rate-limiter';
import { validateRequest } from '@/application/middlewares/validation.middleware';
import { authValidationSchemas } from '@/presentation/validators/auth.validators';

const router = Router();
const prisma = new PrismaClient();

// Initialize services
const tokenManager = new TokenManager(prisma);
const rbacService = new RBACService(prisma);
const twoFactorService = new TwoFactorService(prisma);
const securityMiddleware = new SecurityMiddleware(prisma, tokenManager, rbacService, twoFactorService);

// Initialize controller
const authController = createEnhancedAuthController();

// Rate limiters
const loginLimiter = rateLimiter.createLoginLimiter();
const registrationLimiter = rateLimiter.createRegistrationLimiter();
const passwordResetLimiter = rateLimiter.createPasswordResetLimiter();
const twoFactorLimiter = rateLimiter.create2FALimiter();
const apiLimiter = rateLimiter.createAPILimiter();

// ===========================
// PUBLIC ROUTES (No Auth Required)
// ===========================

// Basic Authentication
router.post('/register', registrationLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', apiLimiter, authController.refreshToken);

// Password Reset
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);
router.get('/reset-password/verify/:token', authController.verifyResetToken);

// Email Verification
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', apiLimiter, authController.resendEmailVerification);

// OAuth Authentication
router.post('/oauth/login', apiLimiter, authController.oauthLogin);

// Token Verification (public for API integration)
router.get('/verify-token', securityMiddleware.authenticate, authController.verifyToken);

// ===========================
// AUTHENTICATED ROUTES
// ===========================

// Profile Management
router.get('/me', securityMiddleware.authenticate, authController.getProfile);
router.post('/logout', securityMiddleware.authenticate, authController.logout);
router.put('/change-password', 
  securityMiddleware.authenticate,
  securityMiddleware.require2FA,
  authController.changePassword
);

// User Permissions
router.get('/permissions', securityMiddleware.authenticate, authController.getUserPermissions);
router.get('/permissions/check/:resource/:action', 
  securityMiddleware.authenticate, 
  authController.checkPermission
);

// Audit Trail
router.get('/audit', securityMiddleware.authenticate, authController.getAuditTrail);

// ===========================
// OAUTH MANAGEMENT
// ===========================

router.get('/oauth/accounts', securityMiddleware.authenticate, authController.getOAuthAccounts);
router.delete('/oauth/:provider', 
  securityMiddleware.authenticate,
  securityMiddleware.require2FA,
  authController.unlinkOAuth
);

// ===========================
// TWO-FACTOR AUTHENTICATION
// ===========================

router.get('/2fa/status', securityMiddleware.authenticate, authController.get2FAStatus);
router.post('/2fa/setup', securityMiddleware.authenticate, authController.setup2FA);
router.post('/2fa/enable', 
  securityMiddleware.authenticate,
  twoFactorLimiter,
  authController.enable2FA
);
router.post('/2fa/disable', 
  securityMiddleware.authenticate,
  securityMiddleware.require2FA,
  authController.disable2FA
);
router.post('/2fa/verify', 
  securityMiddleware.authenticate,
  twoFactorLimiter,
  authController.verify2FA
);
router.post('/2fa/backup-codes', 
  securityMiddleware.authenticate,
  securityMiddleware.require2FA,
  authController.generate2FABackupCodes
);

// ===========================
// SESSION MANAGEMENT
// ===========================

router.get('/sessions', securityMiddleware.authenticate, authController.getSessions);
router.delete('/sessions/:sessionId', 
  securityMiddleware.authenticate,
  authController.revokeSession
);
router.delete('/sessions', 
  securityMiddleware.authenticate,
  securityMiddleware.require2FA,
  authController.revokeAllSessions
);

// ===========================
// DEVICE MANAGEMENT
// ===========================

router.get('/devices', securityMiddleware.authenticate, authController.getDevices);
router.delete('/devices/:deviceId', 
  securityMiddleware.authenticate,
  authController.revokeDevice
);
router.put('/devices/:deviceId/trust', 
  securityMiddleware.authenticate,
  securityMiddleware.require2FA,
  authController.trustDevice
);

// ===========================
// ADMIN ROUTES
// ===========================

// Role and Permission Management
router.get('/admin/roles', 
  securityMiddleware.adminOnly,
  authController.getAllRoles
);
router.get('/admin/permissions', 
  securityMiddleware.adminOnly,
  authController.getAllPermissions
);

// Authentication Statistics
router.get('/admin/stats', 
  securityMiddleware.adminOnly,
  authController.getAuthStats
);

// ===========================
// ENHANCED SECURITY ROUTES
// ===========================

// Premium Content Access
router.use('/premium/*', 
  securityMiddleware.premiumContentAccess
);

// Sensitive Operations (requires 2FA + trusted device)
router.use('/sensitive/*', 
  securityMiddleware.sensitiveOperation
);

// Geographic Restrictions (example)
router.use('/restricted/*', 
  securityMiddleware.createSecurityStack({
    auth: 'required',
    allowedCountries: ['US', 'CA', 'GB'],
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
    },
  })
);

// Time-based Access (example - admin panel only during business hours)
router.use('/admin/restricted/*',
  securityMiddleware.createSecurityStack({
    auth: 'required',
    roles: ['admin'],
    timeWindow: { start: 9, end: 17 }, // 9 AM to 5 PM
  })
);

// ===========================
// HEALTH CHECK & MONITORING
// ===========================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Security Headers Middleware
router.use((req, res, next) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS for auth endpoints
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  next();
});

// Error handling for auth routes
router.use((error: any, req: any, res: any, next: any) => {
  // Log security-related errors
  if (error.name === 'AuthenticationError' || error.name === 'AuthorizationError') {
    console.error('Auth Error:', {
      error: error.message,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
    });
  }

  // Return appropriate error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: error.name || 'Error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

export default router;