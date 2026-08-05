import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Logo component.
 *
 * Có 3 loại file gốc:
 *   /assets/brand/logo.svg          — Logo tĩnh, dùng cho favicon, head
 *   /assets/brand/logo-animated.gif — Animation ngắn (loading, splash)
 *   /assets/Logo Kandes/Intro logo Kandesfx.gif — Intro dài, full-screen
 *   /assets/Logo Kandes/logogif.gif — Logo header có animation
 *
 * Theo BRAND.md: min size 32px height, không kéo méo, clear space 1x.
 *
 * Mặc định `full` dùng logo SVG tĩnh (an toàn cho SSR, không flash).
 * Truyền `animated` để dùng bản GIF cho splash/loading.
 */
export interface LogoProps {
  variant?: 'full' | 'icon' | 'wordmark'
  /** Bật GIF animation (chỉ dùng khi variant=icon hoặc full) */
  animated?: boolean
  size?: number
  className?: string
  priority?: boolean
}

const LOGO_SVG = '/assets/brand/logo.svg'
const LOGO_GIF = '/assets/brand/logo-animated.gif'
const INTRO_GIF = '/assets/Logo%20Kandes/Intro%20logo%20Kandesfx.gif'

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  animated = false,
  size = 32,
  className,
  priority,
}) => {
  if (variant === 'icon') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={animated ? LOGO_GIF : LOGO_SVG}
        alt="Kandes"
        width={size}
        height={size}
        className={cn('flex-shrink-0 block', className)}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
      />
    )
  }

  if (variant === 'wordmark') {
    return (
      <span
        className={cn(
          'font-display font-bold tracking-[0.2em] uppercase text-ink-50 select-none',
          className
        )}
        style={{ fontSize: size * 0.6, lineHeight: 1 }}
        aria-label="Kandes"
        role="img"
      >
        Kandes
      </span>
    )
  }

  // full: icon + wordmark
  return (
    <span
      className={cn('inline-flex items-center gap-3', className)}
      role="img"
      aria-label="Kandes"
    >
      <Logo variant="icon" size={size} animated={animated} priority={priority} />
      <Logo variant="wordmark" size={size} />
    </span>
  )
}

/** Full-screen intro logo — dùng cho landing hero / splash */
export const IntroLogo: React.FC<{ className?: string }> = ({ className }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={INTRO_GIF}
    alt="Kandes intro"
    className={cn('block', className)}
    loading="eager"
    decoding="sync"
  />
)

/** Logo mark đơn giản dùng cho favicon / OG image — SVG inline tránh network */
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({
  size = 64,
  className,
}) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    className={cn('flex-shrink-0', className)}
    aria-label="Kandes"
    role="img"
  >
    <rect width="64" height="64" fill="#05060A" />
    {/* RGB-shift effect: cyan + red offset */}
    <g transform="translate(12, 14)">
      <text
        x="0"
        y="38"
        fontFamily="Space Grotesk, system-ui, sans-serif"
        fontSize="44"
        fontWeight="700"
        fill="#FF3366"
        opacity="0.55"
        style={{ transform: 'translateX(-1px)' }}
      >
        K
      </text>
      <text
        x="0"
        y="38"
        fontFamily="Space Grotesk, system-ui, sans-serif"
        fontSize="44"
        fontWeight="700"
        fill="#00E5FF"
        opacity="0.55"
        style={{ transform: 'translateX(1px)' }}
      >
        K
      </text>
      <text
        x="0"
        y="38"
        fontFamily="Space Grotesk, system-ui, sans-serif"
        fontSize="44"
        fontWeight="700"
        fill="#FFFFFF"
      >
        K
      </text>
    </g>
    <rect x="0" y="60" width="64" height="2" fill="#00E5FF" />
    <rect x="0" y="0" width="2" height="64" fill="#7C3AED" />
  </svg>
)
