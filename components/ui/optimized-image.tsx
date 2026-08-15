'use client'

import * as React from 'react'
import Image, { type ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

type OptimizedImageProps = Omit<ImageProps, 'placeholder'> & {
  fallback?: string
  aspectRatio?: 'square' | 'video' | 'wide' | 'auto'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

const ASPECT_CLASSES = {
  square: 'aspect-square',
  video: 'aspect-video',
  wide: 'aspect-[21/9]',
  auto: '',
}

const ROUNDED_CLASSES = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
}

/**
 * Optimized image component with fallback, aspect ratio, and loading states.
 */
export function OptimizedImage({
  src,
  alt,
  fallback = '/placeholder.png',
  aspectRatio = 'auto',
  rounded = 'md',
  className,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-100',
        ASPECT_CLASSES[aspectRatio],
        ROUNDED_CLASSES[rounded],
        className
      )}
    >
      <Image
        {...props}
        src={error ? fallback : src}
        alt={alt}
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
        className={cn(
          'duration-300 ease-in-out',
          loading ? 'scale-105 blur-sm' : 'scale-100 blur-0'
        )}
      />
    </div>
  )
}
