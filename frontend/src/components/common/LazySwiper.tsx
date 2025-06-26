'use client'

import { lazy, Suspense, memo } from 'react'

// Lazy load Swiper components
const SwiperComponent = lazy(() => import('swiper/react').then(module => ({ default: module.Swiper })))
const SwiperSlideComponent = lazy(() => import('swiper/react').then(module => ({ default: module.SwiperSlide })))

interface LazySwiperProps {
  children: React.ReactNode
  spaceBetween?: number
  slidesPerView?: number | 'auto' | undefined
  freeMode?: boolean
  grabCursor?: boolean
  touchStartPreventDefault?: boolean
  style?: React.CSSProperties
  breakpoints?: any
  modules?: any[]
}

const LazySwiper = memo(function LazySwiper({
  children,
  spaceBetween = 8,
  slidesPerView = 2.2,
  freeMode = true,
  grabCursor = true,
  touchStartPreventDefault = false,
  style,
  breakpoints,
  modules = []
}: LazySwiperProps) {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        gap: `${spaceBetween}px`,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        paddingBottom: '1rem',
        ...style
      }}>
        {/* Fallback skeleton */}
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            style={{
              minWidth: '150px',
              height: '120px',
              backgroundColor: '#333',
              borderRadius: '6px',
              background: 'linear-gradient(90deg, #333 25%, #444 50%, #333 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite'
            }}
          />
        ))}
        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    }>
      <SwiperComponent
        modules={modules}
        spaceBetween={spaceBetween}
        slidesPerView={slidesPerView}
        freeMode={freeMode}
        grabCursor={grabCursor}
        touchStartPreventDefault={touchStartPreventDefault}
        style={style}
        breakpoints={breakpoints}
      >
        {children}
      </SwiperComponent>
    </Suspense>
  )
})

export { LazySwiper, SwiperSlideComponent as LazySwiperSlide }
export default LazySwiper