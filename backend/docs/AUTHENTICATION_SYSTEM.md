# DoramaFlix Enterprise Authentication & Authorization System

## Overview

This document outlines the comprehensive enterprise-level authentication and authorization system implemented for DoramaFlix. The system provides advanced security features including OAuth integration, two-factor authentication, role-based access control, and sophisticated session management.

## 🔐 Core Features

### 1. Authentication Methods
- **Password-based authentication** with strong password policies
- **OAuth integration** (Google, Apple, Facebook, GitHub)
- **Two-Factor Authentication** (TOTP & Email-based)
- **Email verification** for account activation
- **Secure password reset** with time-limited tokens

### 2. Authorization & Access Control
- **Role-Based Access Control (RBAC)** with granular permissions
- **Subscription tier access control** (Free, Premium, Ultra)
- **Multi-profile support** for family accounts
- **Device trust management**
- **Geographic and time-based restrictions**

### 3. Security Features
- **Advanced rate limiting** with Redis
- **Session management** with Redis storage
- **Device tracking and fingerprinting**
- **Comprehensive audit logging**
- **Brute force protection**
- **IP whitelisting and geographic restrictions**

## 🏗️ Architecture

### Database Schema Enhancements

The system extends the base Prisma schema with advanced authentication tables:

```prisma
// Enhanced User model with 2FA and profiles
model User {
  // Core fields
  id                String     @id @default(uuid())
  email             String     @unique
  passwordHash      String?    // Optional for OAuth-only accounts
  
  // Profile information
  firstName         String
  lastName          String
  avatarUrl         String?
  
  // Access control
  role              UserRole   @default(basic)
  subscriptionTier  SubscriptionTier @default(free)
  
  // Security features
  twoFactorEnabled  Boolean    @default(false)
  twoFactorSecret   String?
  backupCodes       String[]   @default([])
  
  // Multi-profile support
  isMainProfile     Boolean    @default(true)
  parentUserId      String?
  maxProfiles       Int        @default(1)
  
  // Verification and reset tokens
  emailVerificationToken String?
  passwordResetToken     String?
  passwordResetExpires   DateTime?
  
  // Relationships
  oauthAccounts     OAuthAccount[]
  userSessions      UserSession[]
  devices           UserDevice[]
  twoFactorTokens   TwoFactorToken[]
  permissions       UserPermission[]
  // ... other relationships
}

// OAuth account linking
model OAuthAccount {
  provider          OAuthProvider
  providerAccountId String
  accessToken       String?
  refreshToken      String?
  // ... other OAuth fields
}

// Session management
model UserSession {
  sessionId String @unique
  status    SessionStatus @default(active)
  deviceId  String?
  ipAddress String
  // ... session metadata
}

// Device management
model UserDevice {
  deviceType    DeviceType
  deviceName    String
  deviceId      String
  isTrusted     Boolean @default(false)
  // ... device metadata
}
```

### Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Layer                      │
├─────────────────────────────────────────────────────────────┤
│  AuthService │ OAuthService │ TwoFactorService │ RBACService │
├─────────────────────────────────────────────────────────────┤
│          TokenManager │ SessionManager │ AuditService       │
├─────────────────────────────────────────────────────────────┤
│               SecurityMiddleware Stack                       │
├─────────────────────────────────────────────────────────────┤
│    RateLimiter │ EmailService │ PasswordResetService        │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation Details

### 1. Enhanced Token Management

**File:** `/src/infrastructure/auth/token-manager.ts`

Features:
- JWT access tokens with session validation
- Secure refresh token storage in database
- Device-specific token management
- Automatic token rotation
- Session linking for security

```typescript
// Generate token pair with device context
async generateTokenPair(user: UserData, deviceContext?: DeviceContext): Promise<TokenPair>

// Verify and validate access tokens
async verifyAccessToken(token: string): Promise<TokenPayload>

// Refresh tokens with security checks
async refreshTokenPair(refreshToken: string, deviceContext?: DeviceContext): Promise<TokenPair>
```

### 2. OAuth Integration

**File:** `/src/infrastructure/auth/oauth-service.ts`

Supported Providers:
- Google OAuth 2.0
- Facebook Login
- Apple Sign In
- GitHub OAuth (bonus)

```typescript
// Provider-specific authentication
async authenticateWithGoogle(accessToken: string): Promise<{profile: OAuthProfile, isNewUser: boolean}>
async authenticateWithFacebook(accessToken: string): Promise<{profile: OAuthProfile, isNewUser: boolean}>
async authenticateWithApple(idToken: string): Promise<{profile: OAuthProfile, isNewUser: boolean}>
```

### 3. Two-Factor Authentication

**File:** `/src/infrastructure/auth/two-factor-service.ts`

Features:
- Time-based One-Time Passwords (TOTP)
- Email-based verification codes
- Backup codes for recovery
- QR code generation for authenticator apps

```typescript
// Setup 2FA
async setupTOTP(userId: string): Promise<TotpSetupData>

// Enable 2FA after verification
async enable2FA(userId: string, secret: string, totpCode: string, backupCodes: string[]): Promise<void>

// Verify 2FA codes
async verify2FACode(userId: string, code: string, type: 'totp' | 'email' | 'backup_codes'): Promise<boolean>
```

### 4. Role-Based Access Control (RBAC)

**File:** `/src/infrastructure/auth/rbac-service.ts`

Permission System:
- Resource-based permissions (e.g., `content.create`, `users.manage`)
- Role hierarchies with inheritance
- Direct user permissions
- Subscription tier access control

```typescript
// Check user permissions
async hasPermission(userId: string, resource: string, action: string): Promise<boolean>

// Get all user permissions
async getUserPermissions(userId: string): Promise<UserPermissions>

// Manage roles and permissions
async createRole(name: string, description: string, permissionNames: string[]): Promise<Role>
```

### 5. Advanced Rate Limiting

**File:** `/src/infrastructure/security/rate-limiter.ts`

Features:
- Redis-based sliding window rate limiting
- Endpoint-specific rate limits
- Adaptive rate limiting based on user trust score
- Geographic rate limiting
- Burst protection with multiple time windows

```typescript
// Create specialized rate limiters
createLoginLimiter()      // 5 attempts per 15 minutes
createRegistrationLimiter() // 3 registrations per hour per IP
create2FALimiter()        // 10 attempts per 15 minutes
createPasswordResetLimiter() // 3 attempts per hour
```

### 6. Session Management

**File:** `/src/infrastructure/cache/session-manager.ts`

Features:
- Redis-based session storage
- Device tracking and management
- Session expiration and cleanup
- Multi-device support
- Session revocation

```typescript
// Session operations
async createSession(sessionId: string, sessionData: SessionData): Promise<void>
async getSession(sessionId: string): Promise<SessionData | null>
async revokeUserSessions(userId: string, keepCurrentSession?: string): Promise<void>

// Device management
async registerDevice(userId: string, deviceInfo: DeviceInfo): Promise<void>
async getUserDevices(userId: string): Promise<DeviceInfo[]>
```

### 7. Comprehensive Audit Logging

**File:** `/src/infrastructure/audit/audit-service.ts`

Features:
- Security event logging
- User action tracking
- Failed login attempt monitoring
- Suspicious activity detection
- Compliance audit trails

```typescript
// Audit logging
async logAuthEvent(event: AuthAuditEvent): Promise<void>
async logSecurityEvent(event: SecurityEvent): Promise<void>
async trackLoginAttempt(email: string, ipAddress: string, userAgent: string, success: boolean): Promise<void>
```

### 8. Email Service Integration

**File:** `/src/infrastructure/email/email-service.ts`

Features:
- Handlebars template system
- Security-focused email templates
- Multi-language support ready
- Email verification and password reset flows

Templates:
- Welcome email with verification
- Password reset instructions
- Two-factor authentication codes
- Security alerts and login notifications
- Account lockout notifications

## 🛡️ Security Middleware Stack

**File:** `/src/infrastructure/security/security-middleware.ts`

The security middleware provides layered protection:

```typescript
// Authentication middleware
authenticate()           // Verify JWT and session
optionalAuthenticate()   // Optional auth for public endpoints

// Authorization middleware
requireRole(['admin'])              // Role-based access
requirePermission('content', 'create') // Permission-based access
requireSubscriptionTier('premium')   // Subscription access

// Security middleware
require2FA()            // Two-factor authentication required
requireTrustedDevice()  // Device must be marked as trusted
requireWhitelistedIP()  // IP whitelist enforcement
requireGeography()      // Geographic restrictions
requireTimeWindow()     // Time-based access control

// Combined security stacks
adminOnly              // Admin + enhanced logging
premiumContentAccess   // Premium subscription + permissions
sensitiveOperation     // 2FA + trusted device + audit
```

## 📚 API Endpoints

### Authentication Endpoints

#### Public Endpoints
```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
POST /api/v1/auth/oauth/login
```

#### Authenticated Endpoints
```http
GET  /api/v1/auth/me
POST /api/v1/auth/logout
PUT  /api/v1/auth/change-password
GET  /api/v1/auth/permissions
GET  /api/v1/auth/audit
```

#### OAuth Management
```http
GET    /api/v1/auth/oauth/accounts
DELETE /api/v1/auth/oauth/:provider
```

#### Two-Factor Authentication
```http
GET  /api/v1/auth/2fa/status
POST /api/v1/auth/2fa/setup
POST /api/v1/auth/2fa/enable
POST /api/v1/auth/2fa/disable
POST /api/v1/auth/2fa/verify
POST /api/v1/auth/2fa/backup-codes
```

#### Session Management
```http
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:sessionId
DELETE /api/v1/auth/sessions
```

#### Device Management
```http
GET    /api/v1/auth/devices
DELETE /api/v1/auth/devices/:deviceId
PUT    /api/v1/auth/devices/:deviceId/trust
```

#### Admin Endpoints
```http
GET /api/v1/auth/admin/roles
GET /api/v1/auth/admin/permissions
GET /api/v1/auth/admin/stats
```

## 🔒 Security Best Practices Implemented

### 1. Password Security
- Bcrypt with configurable salt rounds (default: 12)
- Strong password policy enforcement
- Password history to prevent reuse
- Secure password reset with time-limited tokens

### 2. Session Security
- Secure session IDs generated with crypto.randomBytes
- Session fixation protection
- Automatic session expiration
- Device-specific session management

### 3. Token Security
- Short-lived access tokens (15 minutes default)
- Longer-lived refresh tokens with secure storage
- Token rotation on refresh
- Secure token storage with hashing

### 4. Rate Limiting
- Multiple rate limiting strategies
- IP-based and user-based limits
- Exponential backoff for repeated failures
- Geographic rate limiting support

### 5. Input Validation
- Comprehensive Zod schema validation
- SQL injection prevention
- XSS protection
- CSRF protection ready

### 6. Audit & Monitoring
- Comprehensive audit logging
- Security event monitoring
- Failed attempt tracking
- Suspicious activity detection

## 🚀 Getting Started

### 1. Environment Configuration

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/doramaflix"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets
JWT_SECRET="your-super-secure-jwt-secret-min-32-chars"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-min-32-chars"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="noreply@doramaflix.com"

# OAuth Credentials (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed initial data (roles, permissions)
npm run db:seed
```

### 3. Initialize Default Permissions

```typescript
import { RBACService } from '@/infrastructure/auth/rbac-service';

const rbacService = new RBACService(prisma);
await rbacService.initializeDefaultPermissions();
```

### 4. Start Services

```bash
# Start Redis
redis-server

# Start the application
npm run dev
```

## 📊 Monitoring & Analytics

### Health Checks
- Authentication service health endpoint
- Redis connection monitoring
- Database connection health
- Email service connectivity

### Metrics Tracking
- Authentication success/failure rates
- 2FA adoption rates
- OAuth provider usage
- Session duration analytics
- Device trust metrics

### Security Monitoring
- Failed login attempt patterns
- Suspicious IP activity
- Geographic anomalies
- Rate limit violations
- Account takeover attempts

## 🔧 Configuration Options

### Rate Limiting Configuration
```typescript
// Customize rate limits in environment config
export const rateLimitConfig = {
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  registration: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  passwordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  api: { windowMs: 15 * 60 * 1000, maxRequests: 1000 },
};
```

### Session Configuration
```typescript
export const sessionConfig = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  sessionExpiry: '24h',
  cleanupInterval: '1h',
};
```

### Security Configuration
```typescript
export const securityConfig = {
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  twoFactor: {
    codeExpiry: 300, // 5 minutes
    backupCodesCount: 10,
  },
  audit: {
    retentionDays: 90,
    logLevel: 'info',
  },
};
```

## 🎯 Next Steps

### Pending Implementation Items
1. **Multi-profile system** for family accounts
2. **Advanced subscription tier controls**
3. **Biometric authentication** support
4. **Advanced device fingerprinting**
5. **Real-time security monitoring dashboard**

### Integration Points
- Frontend authentication hooks and contexts
- API client authentication handling
- Mobile app authentication flows
- Third-party service integrations

### Scalability Considerations
- Horizontal scaling with Redis Cluster
- Database read replicas for session data
- CDN integration for static assets
- Microservices architecture migration path

This comprehensive authentication system provides enterprise-level security while maintaining developer-friendly APIs and extensive customization options.