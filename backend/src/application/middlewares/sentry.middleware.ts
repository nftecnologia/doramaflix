// =============================================
// DORAMAFLIX - SENTRY MIDDLEWARE
// Integration middleware for Sentry error tracking
// =============================================

import { Request, Response, NextFunction } from 'express';
import { SentryUtils } from '../../shared/config/sentry';
import { logger } from '../../shared/utils/logger';

/**
 * Middleware to enhance Sentry context with request information
 */
export const sentryContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set user context if user is authenticated
  if (req.user) {
    SentryUtils.setUser({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      ip_address: req.ip,
    });
  }

  // Set request context
  SentryUtils.setContext('request', {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.get('user-agent'),
      'accept': req.get('accept'),
      'accept-language': req.get('accept-language'),
      'content-type': req.get('content-type'),
    },
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Set custom tags
  SentryUtils.setTag('endpoint', `${req.method} ${req.path}`);
  SentryUtils.setTag('ip', req.ip);
  SentryUtils.setTag('user_agent', req.get('user-agent') || 'unknown');

  // Add breadcrumb for the request
  SentryUtils.addBreadcrumb(
    `${req.method} ${req.path}`,
    'http.request',
    {
      method: req.method,
      url: req.url,
      query: req.query,
      ip: req.ip,
    }
  );

  next();
};

/**
 * Middleware to capture API response metrics
 */
export const sentryResponseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Capture original end method
  const originalEnd = res.end;

  // Override end method to capture response details
  res.end = function (chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Set response context
    SentryUtils.setContext('response', {
      status_code: statusCode,
      duration_ms: duration,
      content_length: res.get('content-length'),
      content_type: res.get('content-type'),
    });

    // Add response breadcrumb
    SentryUtils.addBreadcrumb(
      `Response ${statusCode} in ${duration}ms`,
      'http.response',
      {
        status_code: statusCode,
        duration_ms: duration,
      }
    );

    // Capture slow requests as performance issues
    if (duration > 5000) { // 5 seconds
      SentryUtils.captureMessage(
        `Slow API response: ${req.method} ${req.path}`,
        'warning',
        {
          duration_ms: duration,
          endpoint: `${req.method} ${req.path}`,
          status_code: statusCode,
        }
      );
    }

    // Capture 4xx and 5xx errors
    if (statusCode >= 400) {
      const level = statusCode >= 500 ? 'error' : 'warning';
      SentryUtils.captureMessage(
        `HTTP ${statusCode}: ${req.method} ${req.path}`,
        level,
        {
          status_code: statusCode,
          endpoint: `${req.method} ${req.path}`,
          duration_ms: duration,
          request_id: req.headers['x-request-id'],
        }
      );
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to capture authentication events
 */
export const sentryAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Capture authentication attempts
  if (req.path.includes('/auth/')) {
    SentryUtils.addBreadcrumb(
      `Authentication attempt: ${req.path}`,
      'auth',
      {
        path: req.path,
        method: req.method,
        ip: req.ip,
        user_agent: req.get('user-agent'),
      }
    );
  }

  next();
};

/**
 * Middleware to capture business events
 */
export const sentryBusinessMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Track important business events
  const businessEvents = {
    '/api/v1/users/register': 'user_registration',
    '/api/v1/auth/login': 'user_login',
    '/api/v1/courses/upload': 'content_upload',
    '/api/v1/payments/process': 'payment_processing',
    '/api/v1/subscriptions/create': 'subscription_creation',
  };

  const eventType = businessEvents[req.path as keyof typeof businessEvents];

  if (eventType) {
    SentryUtils.addBreadcrumb(
      `Business event: ${eventType}`,
      'business',
      {
        event_type: eventType,
        endpoint: req.path,
        method: req.method,
        user_id: req.user?.id,
        timestamp: new Date().toISOString(),
      }
    );

    // Set business context
    SentryUtils.setContext('business', {
      event_type: eventType,
      user_id: req.user?.id,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Error handler middleware that integrates with Sentry
 */
export const sentryErrorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error to our logger as well
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user_id: req.user?.id,
  });

  // Capture error with Sentry
  SentryUtils.captureException(error, {
    endpoint: `${req.method} ${req.path}`,
    user_id: req.user?.id,
    request_id: req.headers['x-request-id'],
    ip: req.ip,
    user_agent: req.get('user-agent'),
  });

  // Continue with normal error handling
  next(error);
};

/**
 * Utility function to create custom Sentry transactions
 */
export const createSentryTransaction = (name: string, op: string = 'http.server') => {
  return SentryUtils.startTransaction(name, op);
};

/**
 * Utility function to capture custom business metrics
 */
export const captureBusinessMetric = (
  metric: string,
  value: number,
  tags?: Record<string, string>
) => {
  SentryUtils.captureMessage(
    `Business metric: ${metric}`,
    'info',
    {
      metric,
      value,
      tags,
      timestamp: new Date().toISOString(),
    }
  );
};