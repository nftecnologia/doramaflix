// =============================================
// DORAMAFLIX - SENTRY SERVER CONFIGURATION
// Error tracking configuration for Next.js server-side
// =============================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  
  integrations: [
    // HTTP integration
    new Sentry.Integrations.Http({ tracing: true }),
    
    // Node.js integrations
    new Sentry.Integrations.OnUncaughtException({
      exitEvenIfOtherHandlersAreRegistered: false,
    }),
    
    new Sentry.Integrations.OnUnhandledRejection({
      mode: 'warn',
    }),
  ],

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || `doramaflix-frontend@${process.env.npm_package_version}`,
  
  // Server name
  serverName: process.env.SERVER_NAME || 'doramaflix-frontend',
  
  // Initial scope
  initialScope: {
    tags: {
      component: 'frontend-ssr',
      service: 'doramaflix-web-server',
      version: process.env.npm_package_version || '1.0.0',
    },
  },

  // Filter events
  beforeSend(event, hint) {
    // Don't send in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Add server context
    event.contexts = {
      ...event.contexts,
      app: {
        name: 'DoramaFlix Frontend SSR',
        version: process.env.npm_package_version || '1.0.0',
      },
      runtime: {
        name: 'node',
        version: process.version,
      },
    };

    return event;
  },

  // Filter transactions
  beforeSendTransaction(event) {
    // Sample API route transactions in production
    if (process.env.NODE_ENV === 'production') {
      // Only send 5% of API route transactions
      if (event.transaction?.includes('/api/') && Math.random() > 0.05) {
        return null;
      }
    }

    return event;
  },
});