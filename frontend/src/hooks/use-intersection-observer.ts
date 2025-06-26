import { useEffect, useRef, useState, useCallback } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  rootMargin?: string
  root?: Element | null
}

export function useIntersectionObserver({
  threshold = 0,
  rootMargin = '0px',
  root = null
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const ref = useRef<Element | null>(null)

  const setRef = useCallback((node: Element | null) => {
    ref.current = node
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true)
        }
      },
      {
        threshold,
        rootMargin,
        root
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, root, hasIntersected])

  return {
    ref: setRef,
    isIntersecting,
    hasIntersected
  }
}