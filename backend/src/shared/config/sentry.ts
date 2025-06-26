// =============================================
// DORAMAFLIX - SENTRY CONFIGURATION
// Error tracking and performance monitoring setup
// =============================================

import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';
import { environment } from './environment';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export const initSentry = (app: Express): void => {
  // Only initialize Sentry in production and staging
  if (environment.NODE_ENV === 'development') {
    return;
  }

  Sentry.init({
    dsn: environment.SENTRY_DSN,
    environment: environment.NODE_ENV,
    
    // Performance Monitoring
    tracesSampleRate: environment.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Performance profiling
    profilesSampleRate: environment.NODE_ENV === 'production' ? 0.05 : 1.0,
    
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Enable Express.js middleware tracing
      new Tracing.Integrations.Express({ app }),
      
      // Enable Prisma tracing
      new Tracing.Integrations.Prisma(),
      
      // Redis tracing (removed - not available in current version)
      
      // Enable performance profiling
      new ProfilingIntegration(),
      
      // Enable console integration
      new Sentry.Integrations.Console(),
      
      // Enable HTTP integration
      new Sentry.Integrations.Http(),
      
      // Enable OnUncaughtException integration
      new Sentry.Integrations.OnUncaughtException({
        exitEvenIfOtherHandlersAreRegistered: false,
      }),
      
      // Enable OnUnhandledRejection integration
      new Sentry.Integrations.OnUnhandledRejection({
        mode: 'warn',
      }),
    ],

    // Release tracking
    release: process.env.SENTRY_RELEASE || `doramaflix-backend@${process.env.npm_package_version}`,
    
    // Server name
    serverName: environment.SERVER_NAME || 'doramaflix-backend',
    
    // Additional tags
    initialScope: {
      tags: {
        component: 'backend',
        service: 'doramaflix-api',
        version: process.env.npm_package_version || '1.0.0',
      },
      user: {
        id: 'system',
        username: 'backend-service',
      },
    },

    // Sampling configuration
    beforeSend(event, hint) {
      // Filter out certain errors in development
      if (environment.NODE_ENV === 'development') {
        return null;
      }

      // Filter out health check errors
      if (event.request?.url?.includes('/health')) {
        return null;
      }

      // Filter out common bot requests
      const userAgent = (hint.originalException as any)?.request?.headers?.['user-agent'] || 
                       event.request?.headers?.['user-agent'] || '';
      if (userAgent.includes('bot') || userAgent.includes('crawler')) {
        return null;
      }

      // Add custom context
      event.contexts = {
        ...event.contexts,
        app: {
          name: 'DoramaFlix Backend',
          version: process.env.npm_package_version || '1.0.0',
        },
        runtime: {
          name: 'node',
          version: process.version,
        },
      };

      return event;
    },

    // Transaction filtering
    beforeSendTransaction(event) {
      // Sample transactions in production
      if (environment.NODE_ENV === 'production') {
        // Only send 10% of health check transactions
        if (event.transaction?.includes('/health') && Math.random() > 0.1) {
          return null;
        }
      }

      return event;
    },
  });

  // The request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler({
    user: ['id', 'username', 'email'],
    request: ['method', 'url', 'headers', 'query_string'],
    ip: true,
  }));

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
};

/**
 * Setup Sentry error handler middleware (should be added after all routes)
 */
export const setupSentryErrorHandler = (app: Express): void => {
  if (environment.NODE_ENV === 'development') {
    return;
  }

  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all 4xx and 5xx errors
      const status = typeof error.status === 'string' ? parseInt(error.status, 10) : error.status;
      return status >= 400;
    },
  }));
};

/**
 * Custom Sentry utilities
 */
export const SentryUtils = {
  /**
   * Capture exception with additional context
   */
  captureException: (error: Error, context?: Record<string, any>) => {
    if (environment.NODE_ENV === 'development') {
      console.error('Sentry Exception:', error, context);
      return;
    }

    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureException(error);
    });
  },

  /**
   * Capture message with level and context
   */
  captureMessage: (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
    if (environment.NODE_ENV === 'development') {
      console.log(`Sentry Message [${level}]:`, message, context);
      return;
    }

    Sentry.withScope((scope) => {
      scope.setLevel(level);
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureMessage(message);
    });
  },

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb: (message: string, category?: string, data?: Record<string, any>) => {
    if (environment.NODE_ENV === 'development') {
      console.log(`Sentry Breadcrumb [${category}]:`, message, data);
      return;
    }

    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      level: 'info',
      data,
      timestamp: Date.now() / 1000,
    });
  },

  /**
   * Set user context
   */
  setUser: (user: { id: string; username?: string; email?: string; ip_address?: string }) => {
    Sentry.setUser(user);
  },

  /**
   * Set tags
   */
  setTag: (key: string, value: string) => {
    Sentry.setTag(key, value);
  },

  /**
   * Set context
   */
  setContext: (key: string, context: Record<string, any>) => {
    Sentry.setContext(key, context);
  },

  /**
   * Start transaction for performance monitoring
   */
  startTransaction: (name: string, op?: string) => {
    if (environment.NODE_ENV === 'development') {
      return {
        setTag: () => {},
        setData: () => {},
        finish: () => {},
      };
    }

    return Sentry.startTransaction({ name, op });
  },

  /**
   * Configure scope for specific operation
   */
  withScope: (callback: (scope: Sentry.Scope) => void) => {
    if (environment.NODE_ENV === 'development') {
      return;
    }

    Sentry.withScope(callback);
  },
};

export { Sentry };