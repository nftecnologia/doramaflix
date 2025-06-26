'use client'

import { lazy, Suspense, ComponentType, memo } from 'react'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'

interface LazyLoadProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  threshold?: number
  rootMargin?: string
}

/**
 * Generic lazy loading component with intersection observer
 * Only renders children when component is in viewport
 */
const LazyLoad = memo(function LazyLoad({
  children,
  fallback = <div style={{ minHeight: '100px', backgroundColor: '#333', borderRadius: '6px' }} />,
  className,
  style,
  threshold = 0.1,
  rootMargin = '50px'
}: LazyLoadProps) {
  const { ref, isIntersecting, hasIntersected } = useIntersectionObserver({
    threshold,
    rootMargin
  })

  return (
    <div ref={ref} className={className} style={style}>
      {hasIntersected ? children : fallback}
    </div>
  )
})

/**
 * HOC for lazy loading React components
 */
export function withLazyLoad<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }))
  
  return memo(function LazyLoadedComponent(props: P) {
    return (
      <Suspense fallback={fallback || <div>Loading...</div>}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    )
  })
}

export default LazyLoad