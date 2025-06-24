// =============================================
// DORAMAFLIX - SERVICE WORKER
// PWA caching and offline capabilities
// =============================================

const CACHE_NAME = 'doramaflix-v1'
const OFFLINE_URL = '/offline.html'

// Assets to cache for offline usage
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/_next/static/css/app/layout.css', // Dynamic Next.js assets
]

// Routes that should always be fetched from network
const NETWORK_FIRST_ROUTES = [
  '/api/',
  '/auth/',
  '/_next/webpack-hmr',
]

// Routes that can be cached
const CACHE_FIRST_ROUTES = [
  '/_next/static/',
  '/static/',
  '/images/',
  '/icons/',
]

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
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
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
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
  
  try {
    // Network-first strategy for API calls and auth
    if (isNetworkFirstRoute(url.pathname)) {
      return await networkFirst(request)
    }
    
    // Cache-first strategy for static assets
    if (isCacheFirstRoute(url.pathname)) {
      return await cacheFirst(request)
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
 * Network-first strategy: Try network, fallback to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

/**
 * Cache-first strategy: Check cache first, then network
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Not in cache, fetch from network and cache
  const response = await fetch(request)
  
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  
  return response
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
    event.ports[0].postMessage({ version: CACHE_NAME })
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