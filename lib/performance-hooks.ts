'use client'

import * as React from 'react'

/**
 * Hook helpers for memoization — Phase 11-PERF.
 *
 * Re-exports React.memo with TypeScript-friendly helpers.
 */

export const { memo, useMemo, useCallback } = React

/**
 * Custom hook for debounced value — useful for search inputs.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

/**
 * Custom hook for intersection observer (lazy load on scroll).
 */
export function useInView(options?: IntersectionObserverInit) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = React.useState(false)

  React.useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry && entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, options)

    observer.observe(ref.current)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ref, inView }
}
