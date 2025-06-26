'use client'

import { lazy, Suspense, memo } from 'react'

// Lazy load heavy components
export const LazyContentModal = lazy(() => import('./ContentModal'))
export const LazySearchComponent = lazy(() => import('../SearchComponent'))
export const LazyVideoPlayer = lazy(() => import('../video/enhanced-netflix-player'))

// Skeleton components for fallbacks
const ModalSkeleton = memo(function ModalSkeleton() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#181818',
        borderRadius: '6px',
        width: '90%',
        maxWidth: '850px',
        height: '80%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        Loading...
      </div>
    </div>
  )
})

const SearchSkeleton = memo(function SearchSkeleton() {
  return (
    <div style={{
      width: '34px',
      height: '34px',
      backgroundColor: '#333',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      🔍
    </div>
  )
})

const VideoPlayerSkeleton = memo(function VideoPlayerSkeleton() {
  return (
    <div style={{
      width: '100%',
      height: '400px',
      backgroundColor: '#000',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '18px'
    }}>
      Loading video player...
    </div>
  )
})


// Wrapped components with Suspense
export const ContentModalLazy = memo(function ContentModalLazy(props: any) {
  return (
    <Suspense fallback={<ModalSkeleton />}>
      <LazyContentModal {...props} />
    </Suspense>
  )
})

export const SearchComponentLazy = memo(function SearchComponentLazy(props: any) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <LazySearchComponent {...props} />
    </Suspense>
  )
})

export const VideoPlayerLazy = memo(function VideoPlayerLazy(props: any) {
  return (
    <Suspense fallback={<VideoPlayerSkeleton />}>
      <LazyVideoPlayer {...props} />
    </Suspense>
  )
})