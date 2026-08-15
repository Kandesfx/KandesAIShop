'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

/**
 * Generic dynamic loader with loading state.
 * Helps reduce initial bundle size for heavy components.
 */
export function createDynamicComponent<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: () => React.ReactElement
    ssr?: boolean
  }
) {
  return dynamic(loader, {
    loading: options?.loading ?? (() => <div className="animate-pulse h-32 bg-gray-100 rounded" />),
    ssr: options?.ssr ?? false,
  })
}

/**
 * Usage example:
 *
 * // In your component:
 * import { createDynamicComponent } from '@/components/ui/lazy-components'
 *
 * const LazyHeavyChart = createDynamicComponent(
 *   () => import('./heavy-chart').then(m => ({ default: m.HeavyChart }))
 * )
 */
