// =============================================
// DORAMAFLIX - SENTRY EDGE CONFIGURATION
// Error tracking configuration for Next.js Edge Runtime
// =============================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || `doramaflix-frontend@${process.env.npm_package_version}`,
  
  // Initial scope
  initialScope: {
    tags: {
      component: 'frontend-edge',
      service: 'doramaflix-web-edge',
      version: process.env.npm_package_version || '1.0.0',
    },
  },

  // Filter events
  beforeSend(event) {
    // Don't send in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Add edge context
    event.contexts = {
      ...event.contexts,
      app: {
        name: 'DoramaFlix Frontend Edge',
        version: process.env.npm_package_version || '1.0.0',
      },
      runtime: {
        name: 'edge',
      },
    };

    return event;
  },
});