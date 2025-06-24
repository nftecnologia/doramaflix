// =============================================
// DORAMAFLIX - SENTRY UTILITIES
// Frontend utilities for error tracking and monitoring
// =============================================

import * as Sentry from '@sentry/nextjs';
import React from 'react';

/**
 * Frontend Sentry utilities
 */
export const SentryUtils = {
  /**
   * Capture exception with additional context
   */
  captureException: (error: Error, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
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
    if (process.env.NODE_ENV === 'development') {
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
    if (process.env.NODE_ENV === 'development') {
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
  setUser: (user: { id: string; username?: string; email?: string }) => {
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
    if (process.env.NODE_ENV === 'development') {
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
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    Sentry.withScope(callback);
  },

  /**
   * Capture user action for analytics
   */
  captureUserAction: (action: string, data?: Record<string, any>) => {
    SentryUtils.addBreadcrumb(
      `User action: ${action}`,
      'user',
      {
        action,
        ...data,
        timestamp: new Date().toISOString(),
      }
    );
  },

  /**
   * Capture navigation event
   */
  captureNavigation: (from: string, to: string) => {
    SentryUtils.addBreadcrumb(
      `Navigation: ${from} → ${to}`,
      'navigation',
      {
        from,
        to,
        timestamp: new Date().toISOString(),
      }
    );
  },

  /**
   * Capture API call
   */
  captureApiCall: (method: string, url: string, status?: number, duration?: number) => {
    SentryUtils.addBreadcrumb(
      `API ${method} ${url}`,
      'http',
      {
        method,
        url,
        status_code: status,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }
    );

    // Capture errors for failed API calls
    if (status && status >= 400) {
      const level = status >= 500 ? 'error' : 'warning';
      SentryUtils.captureMessage(
        `API Error: ${method} ${url} - ${status}`,
        level,
        {
          method,
          url,
          status_code: status,
          duration_ms: duration,
        }
      );
    }
  },

  /**
   * Capture video playback events
   */
  captureVideoEvent: (event: string, videoId: string, data?: Record<string, any>) => {
    SentryUtils.addBreadcrumb(
      `Video ${event}: ${videoId}`,
      'video',
      {
        event,
        video_id: videoId,
        ...data,
        timestamp: new Date().toISOString(),
      }
    );
  },

  /**
   * Capture payment events
   */
  capturePaymentEvent: (event: string, data?: Record<string, any>) => {
    SentryUtils.addBreadcrumb(
      `Payment ${event}`,
      'payment',
      {
        event,
        ...data,
        timestamp: new Date().toISOString(),
      }
    );

    // Also capture as message for important payment events
    if (['payment_failed', 'payment_success', 'subscription_cancelled'].includes(event)) {
      const level = event === 'payment_failed' ? 'error' : 'info';
      SentryUtils.captureMessage(
        `Payment Event: ${event}`,
        level,
        data
      );
    }
  },

  /**
   * Capture performance metrics
   */
  capturePerformanceMetric: (metric: string, value: number, unit: string = 'ms') => {
    SentryUtils.addBreadcrumb(
      `Performance: ${metric} = ${value}${unit}`,
      'performance',
      {
        metric,
        value,
        unit,
        timestamp: new Date().toISOString(),
      }
    );

    // Capture slow operations as warnings
    if (unit === 'ms' && value > 5000) {
      SentryUtils.captureMessage(
        `Slow Operation: ${metric}`,
        'warning',
        {
          metric,
          value,
          unit,
        }
      );
    }
  },

  /**
   * Capture business metrics
   */
  captureBusinessMetric: (metric: string, value: number, tags?: Record<string, string>) => {
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
  },
};

/**
 * Error boundary utility for React components
 */
/**
 * Error boundary fallback component
 */
function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
        <p className="text-gray-400 mb-6">
          We're sorry, but something unexpected happened. Our team has been notified.
        </p>
        <button
          onClick={resetError}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

/**
 * Higher-order component that wraps components with Sentry error boundary
 */
export function withSentryErrorBoundary<P extends object>(Component: React.ComponentType<P>) {
  return Sentry.withErrorBoundary(Component, {
    fallback: ErrorFallback,
    beforeCapture: (scope: Sentry.Scope, error: Error | null) => {
      scope.setTag('errorBoundary', true);
      scope.setLevel('error');
    },
  });
}

export { Sentry };