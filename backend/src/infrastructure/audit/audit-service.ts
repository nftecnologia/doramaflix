/**
 * Audit Service
 * Comprehensive audit logging system for security events and user actions
 */

import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/shared/utils/logger';

export interface AuditEvent {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'auth' | 'user' | 'content' | 'system' | 'payment' | 'security';
}

export interface SecurityEvent extends AuditEvent {
  threatLevel?: 'low' | 'medium' | 'high' | 'critical';
  blocked?: boolean;
  reason?: string;
  countryCode?: string;
  deviceFingerprint?: string;
}

export interface AuthAuditEvent extends AuditEvent {
  email?: string;
  loginMethod?: 'password' | 'oauth' | '2fa';
  success?: boolean;
  failureReason?: string;
  sessionId?: string;
  deviceId?: string;
}

export class AuditService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(event: AuthAuditEvent): Promise<void> {
    try {
      await this.prisma.userAudit.create({
        data: {
          userId: event.userId,
          action: event.action,
          resourceType: 'auth',
          resourceId: event.sessionId,
          oldValues: null,
          newValues: {
            email: event.email,
            loginMethod: event.loginMethod,
            success: event.success,
            failureReason: event.failureReason,
            deviceId: event.deviceId,
            ...event.metadata,
          },
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        },
      });

      // Also log to application logger with appropriate level
      const logLevel = this.getLogLevel(event);
      logger[logLevel]('Auth event', {
        action: event.action,
        userId: event.userId,
        email: event.email,
        success: event.success,
        ipAddress: event.ipAddress,
        ...event.metadata,
      });
    } catch (error) {
      logger.error('Failed to log auth event:', error);
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await this.prisma.userAudit.create({
        data: {
          userId: event.userId,
          action: event.action,
          resourceType: 'security',
          resourceId: null,
          oldValues: null,
          newValues: {
            threatLevel: event.threatLevel,
            blocked: event.blocked,
            reason: event.reason,
            countryCode: event.countryCode,
            deviceFingerprint: event.deviceFingerprint,
            ...event.metadata,
          },
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        },
      });

      // Log critical security events at error level
      const logLevel = event.threatLevel === 'critical' ? 'error' : 'warn';
      logger[logLevel]('Security event', {
        action: event.action,
        threatLevel: event.threatLevel,
        blocked: event.blocked,
        ipAddress: event.ipAddress,
        ...event.metadata,
      });
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  /**
   * Log user action events
   */
  async logUserAction(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.userAudit.create({
        data: {
          userId: event.userId!,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          oldValues: event.oldValues,
          newValues: event.newValues,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        },
      });

      logger.info('User action', {
        action: event.action,
        userId: event.userId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        ...event.metadata,
      });
    } catch (error) {
      logger.error('Failed to log user action:', error);
    }
  }

  /**
   * Log system events
   */
  async logSystemEvent(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.systemLog.create({
        data: {
          level: this.mapSeverityToLogLevel(event.severity || 'low'),
          message: event.action,
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          endpoint: event.metadata?.endpoint,
          method: event.metadata?.method,
          statusCode: event.metadata?.statusCode,
          responseTime: event.metadata?.responseTime,
          metadata: {
            resourceType: event.resourceType,
            resourceId: event.resourceId,
            ...event.metadata,
          },
        },
      });

      const logLevel = this.getLogLevel(event);
      logger[logLevel]('System event', {
        action: event.action,
        severity: event.severity,
        ...event.metadata,
      });
    } catch (error) {
      logger.error('Failed to log system event:', error);
    }
  }

  /**
   * Create audit middleware for automatic request logging
   */
  createAuditMiddleware() {
    return (req: Request, res: any, next: any) => {
      const startTime = Date.now();

      // Override res.json to capture response
      const originalJson = res.json;
      res.json = function (body: any) {
        const responseTime = Date.now() - startTime;
        
        // Log request
        void auditService.logSystemEvent({
          action: 'http_request',
          userId: req.user?.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: res.statusCode >= 400 ? 'medium' : 'low',
          metadata: {
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            query: req.query,
            params: req.params,
          },
        });

        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Track login attempts and detect suspicious patterns
   */
  async trackLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    await this.logAuthEvent({
      action: success ? 'login_success' : 'login_failed',
      email,
      ipAddress,
      userAgent,
      success,
      failureReason,
      loginMethod: 'password',
      severity: success ? 'low' : 'medium',
    });

    // Check for suspicious patterns if login failed
    if (!success) {
      await this.detectSuspiciousActivity(email, ipAddress);
    }
  }

  /**
   * Track password changes
   */
  async trackPasswordChange(userId: string, ipAddress: string, userAgent: string): Promise<void> {
    await this.logAuthEvent({
      userId,
      action: 'password_changed',
      ipAddress,
      userAgent,
      success: true,
      severity: 'medium',
    });
  }

  /**
   * Track 2FA events
   */
  async track2FAEvent(
    userId: string,
    action: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    method?: string
  ): Promise<void> {
    await this.logAuthEvent({
      userId,
      action,
      ipAddress,
      userAgent,
      success,
      loginMethod: '2fa',
      severity: success ? 'low' : 'medium',
      metadata: { method },
    });
  }

  /**
   * Track OAuth events
   */
  async trackOAuthEvent(
    action: string,
    provider: string,
    userId?: string,
    email?: string,
    ipAddress?: string,
    userAgent?: string,
    success?: boolean
  ): Promise<void> {
    await this.logAuthEvent({
      userId,
      action,
      email,
      ipAddress,
      userAgent,
      success,
      loginMethod: 'oauth',
      severity: 'low',
      metadata: { provider },
    });
  }

  /**
   * Track subscription events
   */
  async trackSubscriptionEvent(
    userId: string,
    action: string,
    subscriptionId: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logUserAction({
      userId,
      action,
      resourceType: 'subscription',
      resourceId: subscriptionId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      severity: 'medium',
      category: 'payment',
    });
  }

  /**
   * Track content access
   */
  async trackContentAccess(
    userId: string,
    contentId: string,
    contentType: string,
    action: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logUserAction({
      userId,
      action,
      resourceType: contentType,
      resourceId: contentId,
      ipAddress,
      userAgent,
      severity: 'low',
      category: 'content',
    });
  }

  /**
   * Track admin actions
   */
  async trackAdminAction(
    adminId: string,
    action: string,
    targetUserId?: string,
    resourceType?: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logUserAction({
      userId: adminId,
      action,
      resourceType,
      resourceId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      severity: 'high',
      category: 'system',
      metadata: { targetUserId },
    });
  }

  /**
   * Get audit trail for a user
   */
  async getUserAuditTrail(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    category?: string
  ): Promise<any[]> {
    const whereClause: any = { userId };
    
    if (category) {
      whereClause.resourceType = category;
    }

    return this.prisma.userAudit.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        oldValues: true,
        newValues: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get security events for investigation
   */
  async getSecurityEvents(
    startDate: Date,
    endDate: Date,
    threatLevel?: string,
    limit: number = 100
  ): Promise<any[]> {
    const whereClause: any = {
      resourceType: 'security',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (threatLevel) {
      whereClause.newValues = {
        path: ['threatLevel'],
        equals: threatLevel,
      };
    }

    return this.prisma.userAudit.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    authEvents: number;
    securityEvents: number;
    failedLogins: number;
    suspiciousActivities: number;
    uniqueIPs: number;
  }> {
    const [
      totalEvents,
      authEvents,
      securityEvents,
      failedLogins,
      suspiciousActivities,
      uniqueIPsResult,
    ] = await Promise.all([
      this.prisma.userAudit.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.userAudit.count({
        where: {
          resourceType: 'auth',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.userAudit.count({
        where: {
          resourceType: 'security',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.userAudit.count({
        where: {
          action: 'login_failed',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.userAudit.count({
        where: {
          resourceType: 'security',
          createdAt: { gte: startDate, lte: endDate },
          newValues: {
            path: ['threatLevel'],
            in: ['high', 'critical'],
          },
        },
      }),
      this.prisma.userAudit.groupBy({
        by: ['ipAddress'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ipAddress: { not: null },
        },
      }),
    ]);

    return {
      totalEvents,
      authEvents,
      securityEvents,
      failedLogins,
      suspiciousActivities,
      uniqueIPs: uniqueIPsResult.length,
    };
  }

  // Private helper methods
  private async detectSuspiciousActivity(email: string, ipAddress: string): Promise<void> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Check for multiple failed login attempts
    const recentFailures = await this.prisma.userAudit.count({
      where: {
        action: 'login_failed',
        newValues: {
          path: ['email'],
          equals: email,
        },
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
    });

    if (recentFailures >= 5) {
      await this.logSecurityEvent({
        action: 'suspicious_login_pattern',
        threatLevel: 'high',
        blocked: false,
        reason: 'Multiple failed login attempts',
        ipAddress,
        metadata: {
          email,
          failureCount: recentFailures,
          timeWindow: '5 minutes',
        },
      });
    }

    // Check for login attempts from multiple IPs
    const recentIPCount = await this.prisma.userAudit.groupBy({
      by: ['ipAddress'],
      where: {
        newValues: {
          path: ['email'],
          equals: email,
        },
        createdAt: {
          gte: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour
        },
      },
    });

    if (recentIPCount.length >= 5) {
      await this.logSecurityEvent({
        action: 'multiple_ip_login_attempts',
        threatLevel: 'medium',
        blocked: false,
        reason: 'Login attempts from multiple IP addresses',
        ipAddress,
        metadata: {
          email,
          ipCount: recentIPCount.length,
          timeWindow: '1 hour',
        },
      });
    }
  }

  private getLogLevel(event: AuditEvent): 'debug' | 'info' | 'warn' | 'error' {
    switch (event.severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
      default:
        return 'info';
    }
  }

  private mapSeverityToLogLevel(severity: string): 'debug' | 'info' | 'warn' | 'error' | 'fatal' {
    switch (severity) {
      case 'critical':
        return 'fatal';
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
      default:
        return 'info';
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const [userAuditDeleted, systemLogDeleted] = await Promise.all([
      this.prisma.userAudit.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      }),
      this.prisma.systemLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      }),
    ]);

    logger.info('Audit logs cleanup completed', {
      userAuditDeleted: userAuditDeleted.count,
      systemLogDeleted: systemLogDeleted.count,
      retentionDays,
    });
  }
}

// Singleton instance
export const auditService = new AuditService(new PrismaClient());