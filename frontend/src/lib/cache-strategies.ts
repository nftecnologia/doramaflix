/**
 * Advanced Cache Strategies for DoramaFlix
 * Implements sophisticated caching for different resource types
 */

interface CacheConfig {
  name: string
  maxEntries?: number
  maxAgeSeconds?: number
  strategy: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly'
}

export const cacheConfigs: Record<string, CacheConfig> = {
  // Static assets (images, fonts, etc.)
  static: {
    name: 'static-assets-v1',
    maxEntries: 100,
    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
    strategy: 'CacheFirst'
  },

  // API responses
  api: {
    name: 'api-cache-v1',
    maxEntries: 50,
    maxAgeSeconds: 60 * 60, // 1 hour
    strategy: 'NetworkFirst'
  },

  // Video content
  video: {
    name: 'video-cache-v1',
    maxEntries: 10,
    maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
    strategy: 'CacheFirst'
  },

  // HTML pages
  pages: {
    name: 'pages-cache-v1',
    maxEntries: 20,
    maxAgeSeconds: 60 * 60 * 24, // 1 day
    strategy: 'StaleWhileRevalidate'
  },

  // Dynamic content
  dynamic: {
    name: 'dynamic-cache-v1',
    maxEntries: 30,
    maxAgeSeconds: 60 * 5, // 5 minutes
    strategy: 'NetworkFirst'
  }
}

/**
 * Cache Strategy Implementation
 */
export class CacheStrategy {
  static async cacheFirst(request: Request, cacheName: string): Promise<Response> {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    
    if (cached) {
      return cached
    }
    
    try {
      const response = await fetch(request)
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    } catch (error) {
      // Return offline fallback if available
      const fallback = await cache.match('/offline.html')
      return fallback || new Response('Offline', { status: 503 })
    }
  }

  static async networkFirst(request: Request, cacheName: string): Promise<Response> {
    const cache = await caches.open(cacheName)
    
    try {
      const response = await fetch(request)
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    } catch (error) {
      const cached = await cache.match(request)
      return cached || new Response('Offline', { status: 503 })
    }
  }

  static async staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    
    // Always fetch in background to update cache
    const fetchPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    }).catch(() => null)
    
    // Return cached immediately if available, otherwise wait for network
    return cached || await fetchPromise || new Response('Offline', { status: 503 })
  }
}

/**
 * Resource Type Detection
 */
export function getResourceType(url: string): string {
  if (url.includes('/api/')) return 'api'
  if (url.match(/\.(mp4|webm|ogg)$/)) return 'video'
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) return 'static'
  if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'static'
  if (url.match(/\.(css|js)$/)) return 'static'
  if (url.includes('/_next/static/')) return 'static'
  if (url.includes('/_next/image')) return 'static'
  return 'pages'
}

/**
 * Cache Management
 */
export class CacheManager {
  static async cleanOldCaches(currentCaches: string[]): Promise<void> {
    const cacheNames = await caches.keys()
    const oldCaches = cacheNames.filter(name => !currentCaches.includes(name))
    
    await Promise.all(
      oldCaches.map(cacheName => caches.delete(cacheName))
    )
  }

  static async preloadCriticalResources(urls: string[]): Promise<void> {
    const cache = await caches.open(cacheConfigs.static.name)
    
    await Promise.all(
      urls.map(async url => {
        try {
          const response = await fetch(url)
          if (response.ok) {
            await cache.put(url, response)
          }
        } catch (error) {
          console.warn(`Failed to preload: ${url}`, error)
        }
      })
    )
  }

  static async getCacheSize(cacheName: string): Promise<number> {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    return keys.length
  }

  static async clearCache(cacheName: string): Promise<boolean> {
    return await caches.delete(cacheName)
  }
}

/**
 * Performance Monitoring for Cache
 */
export class CacheMetrics {
  private static metrics: Record<string, { hits: number; misses: number }> = {}

  static recordHit(cacheName: string): void {
    if (!this.metrics[cacheName]) {
      this.metrics[cacheName] = { hits: 0, misses: 0 }
    }
    this.metrics[cacheName].hits++
  }

  static recordMiss(cacheName: string): void {
    if (!this.metrics[cacheName]) {
      this.metrics[cacheName] = { hits: 0, misses: 0 }
    }
    this.metrics[cacheName].misses++
  }

  static getHitRatio(cacheName: string): number {
    const cache = this.metrics[cacheName]
    if (!cache || cache.hits + cache.misses === 0) return 0
    return cache.hits / (cache.hits + cache.misses)
  }

  static getAllMetrics(): Record<string, { hits: number; misses: number; hitRatio: number }> {
    const result: Record<string, { hits: number; misses: number; hitRatio: number }> = {}
    
    Object.entries(this.metrics).forEach(([cacheName, stats]) => {
      result[cacheName] = {
        hits: stats.hits,
        misses: stats.misses,
        hitRatio: this.getHitRatio(cacheName)
      }
    })
    
    return result
  }
}