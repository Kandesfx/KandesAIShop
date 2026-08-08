import Link from 'next/link'
import { ArrowUpRight, Sparkles, Zap } from 'lucide-react'
import { VideoBackground } from '@/components/brand/video-background'
import { Logo } from '@/components/brand/logo'

/**
 * Hero — minimalist centered layout với video background.
 *
 * Phong cách: bám sát brand Kandes (electric/plasma), bỏ AI-generic cyber glow,
 * glitch effects, scanlines, RGB shift. Reference: ảnh user share ngày 2026-08-08.
 *
 * Layout:
 *   1. Full-bleed video background (intro.webm — 1MB, ưu tiên) + poster fallback.
 *   2. Dark gradient overlay (ink-900/40 → ink-900/95) cho text contrast.
 *   3. Centered hero copy (heading + sub) — true vertical centering với grid.
 *   4. 2 CTA cards side-by-side (gradient purple→cyan "AI GATEWAY" + gradient
 *      orange→red "MUA NGAY").
 *
 * Centering:
 *   - Section dùng `grid place-items-center` thay vì flex + min-height trick
 *     để content luôn center bất kể header sticky height thay đổi.
 *   - Padding-top/bottom đối xứng (`py-24 lg:py-32`) → không bị kéo lệch.
 *
 * Accessibility:
 *   - `<video autoplay muted loop playsInline>` — iOS-friendly autoplay.
 *   - `prefers-reduced-motion` → chỉ poster + overlay (no video).
 *   - Decorative video + overlay → `aria-hidden`. Còn CTAs + headings → keyboard accessible.
 *   - Headline + sub-copy dùng semantic <h1> + <p>.
 */

interface HeroProps {
  /** Hiển thị version "lite" cho embedded contexts (cart empty, etc.). */
  compact?: boolean
}

// User chuẩn bị sẵn bg-video-compressed.webm (12 MB) — video chính thức cho hero.
// intro.webm (1 MB) giữ làm fallback nếu browser từ chối VP9.
const VIDEO_SOURCES = [
  { src: '/assets/video/bg-video-compressed.webm', type: 'video/webm' },
  { src: '/assets/video/intro.webm', type: 'video/webm' },
  { src: '/assets/video/intro.mp4', type: 'video/mp4' },
]

const HERO_POSTER = '/assets/brand/hero-poster.svg'

export function Hero({ compact = false }: HeroProps) {
  return (
    <section
      className={`relative overflow-hidden bg-ink-900 ${
        compact ? 'py-16' : ''
      }`}
      style={compact ? undefined : { minHeight: 'calc(100svh - 4rem - 2.25rem)' }}
      aria-labelledby="hero-heading"
    >
      {/* Video background — full bleed */}
      <VideoBackground
        sources={VIDEO_SOURCES}
        poster={HERO_POSTER}
        overlay="soft"
        ariaLabel="Video nền minh họa sản phẩm Kandes"
      />

      {/* Content wrapper — căn giữa chính xác trong viewport.
          Section đã có min-height = 100svh - header - ticker,
          nên flex justify-center sẽ center content hoàn hảo. */}
      <div className="relative container-narrow flex flex-col items-center justify-center text-center h-full" style={{ minHeight: 'inherit' }}>
        {/* Subtle grid pattern behind text for depth */}
        <div
          className="absolute inset-0 bg-grid-tech bg-[size:32px_32px] opacity-[0.07] pointer-events-none"
          aria-hidden
        />

        <div className="relative w-full py-8">
          {/* Eyebrow — entrance delay 0 */}
          <div
            className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 border border-white/15 bg-white/5 backdrop-blur-sm rounded-full opacity-0 animate-slide-in-up"
            style={{ animationDelay: '0ms' }}
          >
            <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" aria-hidden />
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/80">
              SYSTEM ONLINE · EST. 2026
            </span>
          </div>

          {/* Logo wordmark — entrance delay 100ms */}
          <div
            className="mb-6 opacity-0 animate-slide-in-up flex justify-center"
            style={{ animationDelay: '100ms' }}
          >
            <Logo variant="wordmark" size={56} className="text-white" />
          </div>

          {/* Headline — entrance delay 200ms */}
          <h1
            id="hero-heading"
            className="text-display-xl font-display text-white leading-[0.95] max-w-4xl mx-auto opacity-0 animate-slide-in-up"
            style={{ animationDelay: '200ms' }}
          >
            Công cụ <span className="text-gradient-electric">AI coding</span>
            <br />
            chính hãng.
          </h1>

          {/* Sub-copy — entrance delay 350ms */}
          <p
            className="mt-6 text-[17px] lg:text-[19px] text-white/75 max-w-2xl mx-auto leading-relaxed opacity-0 animate-slide-in-up"
            style={{ animationDelay: '350ms' }}
          >
            Cursor Pro · Windsurf · GitHub Copilot · Claude Pro — tự động giao key qua email trong
            30 giây. Không chờ đợi, không thủ tục.
          </p>

          {/* CTA cards — entrance delay 500ms */}
          <div
            className="mt-12 lg:mt-14 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto opacity-0 animate-slide-in-up"
            style={{ animationDelay: '500ms' }}
          >
            {/* AI GATEWAY — purple → cyan */}
            <Link
              href="/products?category=ai-code"
              className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-ai-gateway p-6 lg:p-8 transition-all duration-300 hover:border-white/40 hover:shadow-glow-plasma hover:-translate-y-1 hover:scale-[1.02]"
            >
              {/* Shine overlay */}
              <div className="shine-overlay absolute inset-0 z-10" aria-hidden />
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm group-hover:bg-white/25 transition-colors">
                  <Sparkles size={20} strokeWidth={2} className="text-white" aria-hidden />
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/70">
                  /01
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/70">
                  API · KEY · RESELLER
                </div>
                <h2 className="text-[26px] lg:text-[30px] font-display font-bold text-white leading-tight">
                  AI Gateway
                </h2>
              </div>
              <div className="mt-6 flex items-center justify-between text-[13px] font-medium text-white/90">
                <span>Khám phá</span>
                <ArrowUpRight
                  size={16}
                  strokeWidth={2}
                  className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                  aria-hidden
                />
              </div>
            </Link>

            {/* MUA NGAY — orange → red */}
            <Link
              href="/products"
              className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-buy-now p-6 lg:p-8 transition-all duration-300 hover:border-white/40 hover:-translate-y-1 hover:scale-[1.02]"
            >
              {/* Shine overlay */}
              <div className="shine-overlay absolute inset-0 z-10" aria-hidden />
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm group-hover:bg-white/25 transition-colors">
                  <Zap size={20} strokeWidth={2} className="text-white" aria-hidden />
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/70">
                  /02
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/70">
                  LICENSE · INSTANT
                </div>
                <h2 className="text-[26px] lg:text-[30px] font-display font-bold text-white leading-tight">
                  Mua ngay
                </h2>
              </div>
              <div className="mt-6 flex items-center justify-between text-[13px] font-medium text-white/90">
                <span>Xem sản phẩm</span>
                <ArrowUpRight
                  size={16}
                  strokeWidth={2}
                  className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                  aria-hidden
                />
              </div>
            </Link>
          </div>

          {/* Trust strip — entrance delay 650ms */}
          <div
            className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-3 text-[11px] font-mono uppercase tracking-[0.16em] text-white/55 opacity-0 animate-slide-in-up"
            style={{ animationDelay: '650ms' }}
          >
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" aria-hidden />
              GIAO TRONG 30S
            </span>
            <span className="hidden sm:inline text-white/20" aria-hidden>│</span>
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" style={{ animationDelay: '600ms' }} aria-hidden />
              CHÍNH HÃNG 100%
            </span>
            <span className="hidden sm:inline text-white/20" aria-hidden>│</span>
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" style={{ animationDelay: '1200ms' }} aria-hidden />
              HỖ TRỢ 24/7
            </span>
          </div>
        </div>
      </div>

      {/* Bottom fade — transition mượt sang section dưới */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-ink-900 pointer-events-none"
        aria-hidden
      />
    </section>
  )
}
