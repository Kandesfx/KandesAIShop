'use client'

import Link from 'next/link'
import { Sparkles, ShieldCheck, Zap } from 'lucide-react'

export interface AuthShellProps {
  title: string
  subtitle?: string
  badge?: string
  heroTagline?: string
  heroHighlight?: string
  heroFeatures?: { icon: 'shield' | 'zap' | 'sparkles'; label: string; sub?: string }[]
  children: React.ReactNode
  footer?: React.ReactNode
  variant?: 'login' | 'register'
}

/**
 * Split-screen auth layout.
 *
 * - Mobile: stacked vertically, hero collapses to compact banner above form.
 * - md+: two-column layout with animated hero panel on the left and form card on the right.
 *
 * Design language:
 *   - Glass / translucent card with electric border accent.
 *   - Animated grid + radial gradient backdrop on hero.
 *   - Stagger entrance for hero elements.
 */
export function AuthShell({
  title,
  subtitle,
  badge,
  heroTagline,
  heroHighlight,
  heroFeatures,
  children,
  footer,
  variant = 'login',
}: AuthShellProps) {
  const iconMap = {
    shield: ShieldCheck,
    zap: Zap,
    sparkles: Sparkles,
  } as const

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-ink-900 text-ink-50">
      {/* Animated backdrop — gradient orbs + grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-electric/20 blur-[120px] animate-float-slow" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-plasma/25 blur-[140px] animate-float-slower" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_85%)]" />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* === HERO PANEL === */}
        <aside
          className="relative hidden flex-col justify-center p-10 lg:flex lg:p-16"
          aria-hidden
        >

          <div className="space-y-8 max-w-lg">
            {badge && (
              <div
                className="inline-flex items-center gap-2 stagger-children"
                style={{ ['--stagger-index' as string]: 1 }}
              >
                <span className="tech-tag">{badge}</span>
              </div>
            )}

            {(heroTagline || heroHighlight) && (
              <h2
                className="font-display text-[clamp(40px,5vw,56px)] leading-[1.05] tracking-tight stagger-children"
                style={{ ['--stagger-index' as string]: 2 }}
              >
                {heroTagline && <span className="text-ink-50">{heroTagline} </span>}
                {heroHighlight && (
                  <span className="text-gradient-electric">{heroHighlight}</span>
                )}
              </h2>
            )}

            {subtitle && (
              <p
                className="text-body-lg text-ink-100 max-w-md stagger-children"
                style={{ ['--stagger-index' as string]: 3 }}
              >
                {subtitle}
              </p>
            )}

            {heroFeatures && heroFeatures.length > 0 && (
              <ul className="space-y-3 pt-4">
                {heroFeatures.map((f, i) => {
                  const Icon = iconMap[f.icon]
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-3 stagger-children"
                      style={{ ['--stagger-index' as string]: 4 + i }}
                    >
                      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-none border border-electric/40 bg-electric/10 text-electric">
                        <Icon size={14} />
                      </span>
                      <div>
                        <p className="text-body font-medium text-ink-50">{f.label}</p>
                        {f.sub && <p className="text-body-sm text-ink-100">{f.sub}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <p
            className="text-caption text-ink-200 stagger-children"
            style={{ ['--stagger-index' as string]: 8 }}
          >
            © {new Date().getFullYear()} Kandes.shop — AI tools chính hãng
          </p>
        </aside>

        {/* === FORM PANEL === */}
        <main className="flex items-center justify-center px-5 py-10 sm:px-8 lg:py-16">
          <div className="w-full max-w-md">
            <div
              className={[
                'relative overflow-hidden',
                'border border-ink-400/60 bg-ink-700/40 backdrop-blur-xl',
                'p-6 sm:p-8',
                'shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_64px_-16px_rgba(0,0,0,0.6)]',
              ].join(' ')}
            >
              {/* Top accent bar */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-electric to-transparent opacity-80" />

              <div className="space-y-1.5 pb-6">
                {badge && (
                  <span className="inline-flex tech-tag mb-3 lg:hidden">{badge}</span>
                )}
                <h1 className="font-display text-h1 text-ink-50">{title}</h1>
                {subtitle && (
                  <p className="text-body-sm text-ink-100">{subtitle}</p>
                )}
              </div>

              {children}

              {/* Top-right corner ticks (decorative) */}
              <span aria-hidden className="absolute right-2 top-2 h-2 w-2 border-r border-t border-electric/60" />
              <span aria-hidden className="absolute left-2 top-2 h-2 w-2 border-l border-t border-electric/60" />
              <span aria-hidden className="absolute right-2 bottom-2 h-2 w-2 border-r border-b border-electric/60" />
              <span aria-hidden className="absolute left-2 bottom-2 h-2 w-2 border-l border-b border-electric/60" />
            </div>

            {footer && (
              <div className="mt-6 text-center text-body-sm text-ink-100">{footer}</div>
            )}

            {variant === 'login' && (
              <p className="mt-6 text-center text-caption text-ink-200">
                Bảo mật bởi Kandes · Đăng nhập an toàn
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}