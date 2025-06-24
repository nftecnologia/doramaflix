'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

/**
 * PWA installer and service worker registration
 */
export function PWAInstaller() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Register service worker
    registerServiceWorker()

    // Check if app is already installed
    checkIfInstalled()

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('💾 PWA: Install prompt triggered')
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('✅ PWA: App installed successfully')
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      
      toast.success('DoramaFlix installed successfully! 🎉', {
        duration: 5000,
      })
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  /**
   * Register service worker
   */
  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        console.log('🔧 Service Worker registered:', registration.scope)

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                toast((t) => (
                  <div className="flex flex-col gap-2">
                    <div className="font-medium">New version available!</div>
                    <div className="text-sm text-gray-300">
                      Reload to get the latest features
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          window.location.reload()
                          toast.dismiss(t.id)
                        }}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Reload
                      </button>
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Later
                      </button>
                    </div>
                  </div>
                ), {
                  duration: 10000,
                })
              }
            })
          }
        })

        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update()
        }, 60000)

      } catch (error) {
        console.error('❌ Service Worker registration failed:', error)
      }
    }
  }

  /**
   * Check if app is already installed
   */
  const checkIfInstalled = () => {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone ||
                         document.referrer.includes('android-app://')

    setIsInstalled(isStandalone)
  }

  /**
   * Install the PWA
   */
  const installPWA = async () => {
    if (!deferredPrompt) {
      return
    }

    try {
      // Show install prompt
      deferredPrompt.prompt()
      
      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice
      
      console.log('🤔 PWA install choice:', choiceResult.outcome)
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ User accepted PWA install')
      } else {
        console.log('❌ User dismissed PWA install')
      }
      
      setDeferredPrompt(null)
      setIsInstallable(false)
      
    } catch (error) {
      console.error('❌ PWA install error:', error)
    }
  }

  // Show install button only on mobile and if installable
  const shouldShowInstallButton = isInstallable && 
                                 !isInstalled && 
                                 /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  if (!shouldShowInstallButton) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">D</span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm">
              Install DoramaFlix
            </h3>
            <p className="text-gray-300 text-xs mt-1">
              Get the full app experience with offline viewing and quick access
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={installPWA}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex-1"
          >
            Install
          </button>
          <button
            onClick={() => setIsInstallable(false)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook for PWA installation status
 */
export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Check if app is installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           (window.navigator as any).standalone ||
                           document.referrer.includes('android-app://')
      setIsInstalled(isStandalone)
    }

    // Check if app is installable
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setIsInstallable(true)
    }

    checkInstalled()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  return { isInstalled, isInstallable }
}