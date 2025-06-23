// =============================================
// DORAMAFLIX - SENTRY CLIENT CONFIGURATION
// Error tracking configuration for frontend
// =============================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Replay sampling
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    // Browser integrations
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.nextRouterInstrumentation(
        // @ts-ignore - Next.js router will be available
        typeof window !== 'undefined' ? window.next?.router : undefined
      ),
      tracePropagationTargets: [
        'localhost',
        'doramaflix.com',
        'api.doramaflix.com',
        /^\//,
      ],
    }),
    
    // Session Replay
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: true,
      maskAllInputs: true,
      networkDetailAllowUrls: [
        'https://api.doramaflix.com',
        'https://doramaflix.com',
      ],
    }),
  ],

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || `doramaflix-frontend@${process.env.npm_package_version}`,
  
  // Initial scope
  initialScope: {
    tags: {
      component: 'frontend',
      service: 'doramaflix-web',
      version: process.env.npm_package_version || '1.0.0',
    },
  },

  // Filter certain errors
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Filter out network errors from ad blockers
    if (event.exception?.values?.[0]?.type === 'NetworkError') {
      return null;
    }

    // Filter out ResizeObserver errors (common browser bug)
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop limit exceeded')) {
      return null;
    }

    // Filter out script loading errors (usually from extensions)
    if (event.exception?.values?.[0]?.type === 'SyntaxError' && 
        event.exception?.values?.[0]?.value?.includes('Unexpected token')) {
      return null;
    }

    // Add additional context
    event.contexts = {
      ...event.contexts,
      app: {
        name: 'DoramaFlix Frontend',
        version: process.env.npm_package_version || '1.0.0',
      },
      browser: {
        name: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    };

    return event;
  },

  // Filter transactions
  beforeSendTransaction(event) {
    // Sample page load transactions in production
    if (process.env.NODE_ENV === 'production') {
      // Only send 10% of pageload transactions
      if (event.transaction?.includes('pageload') && Math.random() > 0.1) {
        return null;
      }
    }

    return event;
  },
});