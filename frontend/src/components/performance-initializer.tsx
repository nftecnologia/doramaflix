'use client'

import { useEffect } from 'react'
import { initPerformanceMonitoring } from '@/lib/performance-monitoring'

/**
 * Component that initializes performance monitoring
 * Must be mounted early in the app lifecycle
 */
export function PerformanceInitializer() {
  useEffect(() => {
    // Initialize performance monitoring only on client-side
    const monitor = initPerformanceMonitoring()
    
    if (monitor && process.env.NODE_ENV === 'development') {
      // In development, expose performance monitor to window for debugging
      ;(window as any).__performanceMonitor = monitor
      
      // Log performance score after 5 seconds
      setTimeout(() => {
        const score = monitor.getPerformanceScore()
        console.log('🎯 Performance Score:', score)
      }, 5000)
    }
  }, [])

  // This component doesn't render anything
  return null
}