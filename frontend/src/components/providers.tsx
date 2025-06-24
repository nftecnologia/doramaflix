'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { VideoPlayerProvider } from '@/contexts/video-player-context'
import { withSentryErrorBoundary, SentryUtils } from '@/lib/sentry'
// import { UserProvider } from '@/contexts/user-context'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 401 (unauthorized) or 403 (forbidden)
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false
        }
        
        // Log query errors to Sentry
        if (failureCount === 3) {
          SentryUtils.captureException(error, {
            queryRetries: failureCount,
            errorType: 'react-query-failure'
          })
        }
        
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
})

interface ProvidersProps {
  children: React.ReactNode
}

function ProvidersComponent({ children }: ProvidersProps) {
  // Track provider initialization
  React.useEffect(() => {
    SentryUtils.captureMessage('App providers initialized', 'info', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      environment: process.env.NODE_ENV
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {/* <UserProvider> */}
            <VideoPlayerProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1f2937',
                    color: '#fff',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </VideoPlayerProvider>
          {/* </UserProvider> */}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

// Export with Sentry Error Boundary
export const Providers = withSentryErrorBoundary(ProvidersComponent)