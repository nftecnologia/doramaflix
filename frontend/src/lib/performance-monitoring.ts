// =============================================
// DORAMAFLIX - PERFORMANCE MONITORING
// Web Vitals and performance tracking utilities
// =============================================

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'
import { SentryUtils } from './sentry'

/**
 * Performance thresholds based on Google's recommendations
 */
const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
}

/**
 * Web Vitals tracking and reporting
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private isInitialized = false
  private metrics: Record<string, number> = {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Initialize Web Vitals tracking
   */
  init() {
    if (this.isInitialized || typeof window === 'undefined') {
      return
    }

    this.isInitialized = true

    // Track Core Web Vitals
    onLCP(this.handleMetric.bind(this))
    onINP(this.handleMetric.bind(this))
    onCLS(this.handleMetric.bind(this))
    onFCP(this.handleMetric.bind(this))
    onTTFB(this.handleMetric.bind(this))

    // Track custom navigation timing
    this.trackNavigationTiming()

    // Track resource loading
    this.trackResourceTiming()

    // Track memory usage (if available)
    this.trackMemoryUsage()

    console.log('🚀 Performance monitoring initialized')
  }

  /**
   * Handle Web Vitals metrics
   */
  private handleMetric(metric: any) {
    const { name, value, id, navigationType } = metric
    
    this.metrics[name] = value

    // Determine performance rating
    const threshold = PERFORMANCE_THRESHOLDS[name as keyof typeof PERFORMANCE_THRESHOLDS]
    let rating = 'good'
    
    if (threshold) {
      if (value > threshold.needsImprovement) {
        rating = 'poor'
      } else if (value > threshold.good) {
        rating = 'needs-improvement'
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${name}: ${value} (${rating})`, metric)
    }

    // Send to Sentry
    SentryUtils.captureMessage(`Web Vital: ${name}`, 'info', {
      metric_name: name,
      metric_value: value,
      metric_id: id,
      metric_rating: rating,
      navigation_type: navigationType,
      url: window.location.href,
      user_agent: navigator.userAgent,
      connection_type: this.getConnectionType(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    })

    // Alert on poor performance
    if (rating === 'poor') {
      SentryUtils.captureMessage(`Poor Performance Alert: ${name}`, 'warning', {
        metric_name: name,
        metric_value: value,
        threshold: threshold?.needsImprovement,
        url: window.location.href,
      })
    }
  }

  /**
   * Track Navigation Timing API metrics
   */
  private trackNavigationTiming() {
    if (!('performance' in window) || !('getEntriesByType' in performance)) {
      return
    }

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      if (navigation) {
        const timings = {
          dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp_connect: navigation.connectEnd - navigation.connectStart,
          ssl_negotiation: navigation.connectEnd - navigation.secureConnectionStart,
          server_response: navigation.responseStart - navigation.requestStart,
          dom_processing: navigation.domContentLoadedEventStart - navigation.responseEnd,
          resource_loading: navigation.loadEventStart - navigation.domContentLoadedEventEnd,
          total_load_time: navigation.loadEventEnd - navigation.fetchStart,
        }

        SentryUtils.captureMessage('Navigation Timing', 'info', {
          ...timings,
          url: window.location.href,
          type: 'navigation-timing',
        })

        // Track slow page loads
        if (timings.total_load_time > 5000) {
          SentryUtils.captureMessage('Slow Page Load', 'warning', {
            load_time: timings.total_load_time,
            url: window.location.href,
            ...timings,
          })
        }
      }
    })
  }

  /**
   * Track Resource Timing for critical resources
   */
  private trackResourceTiming() {
    if (!('performance' in window)) {
      return
    }

    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      // Filter critical resources
      const criticalResources = resources.filter(resource => {
        const name = resource.name.toLowerCase()
        return (
          name.includes('.css') ||
          name.includes('.js') ||
          name.includes('font') ||
          name.includes('critical')
        )
      })

      // Track slow resources
      const slowResources = criticalResources.filter(resource => resource.duration > 2000)
      
      if (slowResources.length > 0) {
        SentryUtils.captureMessage('Slow Resource Loading', 'warning', {
          slow_resources: slowResources.map(r => ({
            name: r.name,
            duration: r.duration,
            size: r.transferSize,
          })),
          total_slow_resources: slowResources.length,
          url: window.location.href,
        })
      }

      // Track overall resource metrics
      const totalSize = resources.reduce((acc, r) => acc + (r.transferSize || 0), 0)
      const avgDuration = resources.reduce((acc, r) => acc + r.duration, 0) / resources.length

      SentryUtils.captureMessage('Resource Timing Summary', 'info', {
        total_resources: resources.length,
        total_size_bytes: totalSize,
        average_duration: avgDuration,
        critical_resources: criticalResources.length,
        slow_resources: slowResources.length,
        url: window.location.href,
      })
    })
  }

  /**
   * Track Memory Usage (if available)
   */
  private trackMemoryUsage() {
    // @ts-ignore - memory is not in standard types but exists in Chrome
    if ('memory' in performance) {
      const checkMemory = () => {
        // @ts-ignore
        const memory = performance.memory
        
        const memoryInfo = {
          used_js_heap_size: memory.usedJSHeapSize,
          total_js_heap_size: memory.totalJSHeapSize,
          js_heap_size_limit: memory.jsHeapSizeLimit,
          memory_usage_percent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        }

        // Alert on high memory usage
        if (memoryInfo.memory_usage_percent > 80) {
          SentryUtils.captureMessage('High Memory Usage', 'warning', {
            ...memoryInfo,
            url: window.location.href,
          })
        }

        return memoryInfo
      }

      // Check memory on initial load
      window.addEventListener('load', () => {
        const memoryInfo = checkMemory()
        SentryUtils.captureMessage('Initial Memory Usage', 'info', memoryInfo)
      })

      // Check memory periodically (every 5 minutes)
      setInterval(() => {
        checkMemory()
      }, 5 * 60 * 1000)
    }
  }

  /**
   * Get connection information
   */
  private getConnectionType(): string {
    // @ts-ignore - connection is not in standard types
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    
    if (!connection) {
      return 'unknown'
    }

    return connection.effectiveType || connection.type || 'unknown'
  }

  /**
   * Track custom performance metric
   */
  trackCustomMetric(name: string, value: number, unit: string = 'ms') {
    SentryUtils.capturePerformanceMetric(name, value, unit)

    if (process.env.NODE_ENV === 'development') {
      console.log(`📈 Custom Metric - ${name}: ${value}${unit}`)
    }
  }

  /**
   * Start performance timing for a custom operation
   */
  startTiming(name: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.trackCustomMetric(name, duration)
      return duration
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): Record<string, number> {
    return { ...this.metrics }
  }

  /**
   * Get performance score based on Web Vitals
   */
  getPerformanceScore(): { score: number; rating: string; details: Record<string, any> } {
    const scores: Record<string, number> = {}
    let totalScore = 0
    let validMetrics = 0

    // Calculate individual metric scores
    Object.entries(this.metrics).forEach(([name, value]) => {
      const threshold = PERFORMANCE_THRESHOLDS[name as keyof typeof PERFORMANCE_THRESHOLDS]
      if (threshold) {
        let score = 100
        if (value > threshold.needsImprovement) {
          score = 0
        } else if (value > threshold.good) {
          score = 50
        }
        scores[name] = score
        totalScore += score
        validMetrics++
      }
    })

    const averageScore = validMetrics > 0 ? totalScore / validMetrics : 0
    let rating = 'good'
    
    if (averageScore < 50) {
      rating = 'poor'
    } else if (averageScore < 90) {
      rating = 'needs-improvement'
    }

    return {
      score: averageScore,
      rating,
      details: {
        individual_scores: scores,
        metrics: this.metrics,
        total_metrics: validMetrics,
      },
    }
  }
}

/**
 * Initialize performance monitoring
 */
export const initPerformanceMonitoring = () => {
  if (typeof window !== 'undefined') {
    const monitor = PerformanceMonitor.getInstance()
    monitor.init()
    return monitor
  }
  return null
}

/**
 * Export singleton instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance()