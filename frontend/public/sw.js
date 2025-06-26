// =============================================
// DORAMAFLIX - SERVICE WORKER
// PWA caching and offline capabilities
// =============================================

const CACHE_VERSION = 'v2'
const STATIC_CACHE = `doramaflix-static-${CACHE_VERSION}`
const API_CACHE = `doramaflix-api-${CACHE_VERSION}`
const VIDEO_CACHE = `doramaflix-video-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'

// Assets to cache for offline usage
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
]

// Cache configurations for different resource types
const CACHE_STRATEGIES = {
  static: {
    name: STATIC_CACHE,
    maxEntries: 100,
    maxAge: 60 * 60 * 24 * 365 * 1000, // 1 year
    strategy: 'CacheFirst'
  },
  api: {
    name: API_CACHE,
    maxEntries: 50,
    maxAge: 60 * 60 * 1000, // 1 hour
    strategy: 'NetworkFirst'
  },
  video: {
    name: VIDEO_CACHE,
    maxEntries: 10,
    maxAge: 60 * 60 * 24 * 7 * 1000, // 1 week
    strategy: 'CacheFirst'
  }
}

// Routes that should always be fetched from network
const NETWORK_FIRST_ROUTES = [
  '/api/',
  '/auth/',
  '/_next/webpack-hmr',
]

// Routes that can be cached aggressively
const CACHE_FIRST_ROUTES = [
  '/_next/static/',
  '/static/',
  '/images/',
  '/icons/',
]

// Video file patterns
const VIDEO_PATTERNS = [
  /\.(mp4|webm|ogg|avi|mov)$/i,
  /\/video\//,
  /\/stream\//
]

// Performance metrics
let cacheMetrics = {
  hits: 0,
  misses: 0,
  networkRequests: 0
}

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete')
        // Force activate immediately
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const currentCaches = [STATIC_CACHE, API_CACHE, VIDEO_CACHE]
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete')
        // Take control of all clients
        return self.clients.claim()
      })
  )
})

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip cross-origin requests (except for CDNs)
  if (url.origin !== location.origin && !isCDNRequest(url)) {
    return
  }

  event.respondWith(handleFetch(request))
})

/**
 * Main fetch handler with caching strategies
 */
async function handleFetch(request) {
  const url = new URL(request.url)
  cacheMetrics.networkRequests++
  
  try {
    // Video content - cache first with long TTL
    if (isVideoRequest(url.href)) {
      return await cacheFirstWithTTL(request, VIDEO_CACHE, CACHE_STRATEGIES.video.maxAge)
    }
    
    // Network-first strategy for API calls and auth
    if (isNetworkFirstRoute(url.pathname)) {
      return await networkFirstWithCache(request, API_CACHE)
    }
    
    // Cache-first strategy for static assets
    if (isCacheFirstRoute(url.pathname)) {
      return await cacheFirst(request, STATIC_CACHE)
    }
    
    // Stale-while-revalidate for pages
    return await staleWhileRevalidate(request)
    
  } catch (error) {
    console.error('🚨 Service Worker: Fetch error', error)
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL)
    }
    
    // Return cached version or error
    return caches.match(request) || new Response('Offline', { status: 503 })
  }
}

/**
 * Network-first strategy with specific cache: Try network, fallback to cache
 */
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request)
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName)
      await cache.put(request, response.clone())
      await cleanupCache(cache, CACHE_STRATEGIES.api.maxEntries)
    }
    
    return response
  } catch (error) {
    cacheMetrics.misses++
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      cacheMetrics.hits++
      return cachedResponse
    }
    throw error
  }
}

/**
 * Cache-first strategy with specific cache: Check cache first, then network
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    cacheMetrics.hits++
    return cachedResponse
  }
  
  cacheMetrics.misses++
  // Not in cache, fetch from network and cache
  const response = await fetch(request)
  
  if (response.ok) {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
    await cleanupCache(cache, CACHE_STRATEGIES.static.maxEntries)
  }
  
  return response
}

/**
 * Cache-first with TTL check for video content
 */
async function cacheFirstWithTTL(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    const dateHeader = cachedResponse.headers.get('date')
    if (dateHeader) {
      const age = Date.now() - new Date(dateHeader).getTime()
      if (age < maxAge) {
        cacheMetrics.hits++
        return cachedResponse
      }
    }
  }
  
  cacheMetrics.misses++
  // Fetch new version
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
      await cleanupCache(cache, CACHE_STRATEGIES.video.maxEntries)
    }
    return response
  } catch (error) {
    // Return stale cache if network fails
    return cachedResponse || new Response('Video unavailable', { status: 503 })
  }
}

/**
 * Stale-while-revalidate: Return cache immediately, update in background
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request)
  
  // Fetch from network in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(CACHE_NAME)
        cache.then(c => c.put(request, response.clone()))
      }
      return response
    })
    .catch(() => null)
  
  // Return cached version immediately if available
  return cachedResponse || fetchPromise
}

/**
 * Check if URL should use network-first strategy
 */
function isNetworkFirstRoute(pathname) {
  return NETWORK_FIRST_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if URL should use cache-first strategy
 */
function isCacheFirstRoute(pathname) {
  return CACHE_FIRST_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if request is for video content
 */
function isVideoRequest(url) {
  return VIDEO_PATTERNS.some(pattern => pattern.test(url))
}

/**
 * Clean up cache by removing oldest entries when limit exceeded
 */
async function cleanupCache(cache, maxEntries) {
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  
  // Sort by date (oldest first)
  const keyDates = await Promise.all(
    keys.map(async (key) => {
      const response = await cache.match(key)
      const date = new Date(response.headers.get('date') || 0).getTime()
      return { key, date }
    })
  )
  
  keyDates.sort((a, b) => a.date - b.date)
  const keysToDelete = keyDates.slice(0, keys.length - maxEntries)
  
  await Promise.all(keysToDelete.map(item => cache.delete(item.key)))
}

/**
 * Check if request is from a CDN
 */
function isCDNRequest(url) {
  const cdnPatterns = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'unpkg.com',
    'cdnjs.cloudflare.com',
  ]
  
  return cdnPatterns.some(pattern => url.hostname.includes(pattern))
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION })
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    (async () => {
      const stats = {
        metrics: {
          ...cacheMetrics,
          hitRatio: cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses) || 0
        },
        caches: {}
      }
      
      // Get cache sizes
      for (const [type, config] of Object.entries(CACHE_STRATEGIES)) {
        const cache = await caches.open(config.name)
        const keys = await cache.keys()
        stats.caches[type] = {
          entries: keys.length,
          maxEntries: config.maxEntries,
          usage: `${keys.length}/${config.maxEntries}`
        }
      }
      
      event.ports[0].postMessage({ type: 'CACHE_STATS', data: stats })
    })()
  }
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

/**
 * Handle background synchronization
 */
async function handleBackgroundSync() {
  // Here you can implement offline queue processing
  // For example, sending stored watch progress when back online
  console.log('📡 Service Worker: Processing background sync')
}

// Push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('📢 Service Worker: Push notification received', event)
  
  if (event.data) {
    const data = event.data.json()
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: data.tag || 'default',
        data: data.url,
        actions: [
          {
            action: 'open',
            title: 'Open App',
          },
          {
            action: 'close',
            title: 'Close',
          },
        ],
      })
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked', event)
  
  event.notification.close()
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    )
  }
})

console.log('🎬 DoramaFlix Service Worker loaded successfully')