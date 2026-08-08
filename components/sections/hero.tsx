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
        compact ? 'py-16' : 'pt-16 pb-16 lg:pt-20 lg:pb-24'
      }`}
      aria-labelledby="hero-heading"
    >
      {/* Video background — full bleed */}
      <VideoBackground
        sources={VIDEO_SOURCES}
        poster={HERO_POSTER}
        overlay="soft"
        ariaLabel="Video nền minh họa sản phẩm Kandes"
      />

      {/* Content — căn giữa theo chiều ngang, padding-top khớp với header sticky (h-16).
          Trước dùng pt-28 → dư ~48px khoảng đen phía trên (user feedback 2026-08-08:
          "chữ màn hình chính vẫn bị xuống dưới khi mới mở trang"). Giảm xuống pt-16 để
          eyebrow badge bám sát header. Vertical centering: grid + place-items-center trên
          wrapper — text luôn ở giữa section bất kể video/poster height thay đổi. */}
      {/* Content wrapper — flex column cho phép inner tự co giãn theo content. */}
      <div className="relative container-narrow flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[70vh] text-center">
        <div className="w-full py-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 border border-white/15 bg-white/5 backdrop-blur-sm rounded-full">
            <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" aria-hidden />
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/80">
              SYSTEM ONLINE · EST. 2026
            </span>
          </div>

          {/* Logo wordmark — gọn, không animation gây rối */}
          <div className="mb-6 opacity-90 flex justify-center">
            <Logo variant="wordmark" size={56} className="text-white" />
          </div>

          {/* Headline */}
          <h1
            id="hero-heading"
            className="text-display-xl font-display text-white leading-[0.95] max-w-4xl mx-auto"
          >
            Công cụ <span className="text-electric">AI coding</span>
            <br />
            chính hãng.
          </h1>

          {/* Sub-copy */}
          <p className="mt-6 text-[17px] lg:text-[19px] text-white/75 max-w-2xl mx-auto leading-relaxed">
            Cursor Pro · Windsurf · GitHub Copilot · Claude Pro — tự động giao key qua email trong
            30 giây. Không chờ đợi, không thủ tục.
          </p>

          {/* CTA cards — 2 lớn, gradient, side-by-side */}
          <div className="mt-12 lg:mt-14 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
            {/* AI GATEWAY — purple → cyan */}
            <Link
              href="/products?category=ai-code"
              className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-ai-gateway p-6 lg:p-8 transition-all duration-300 hover:border-white/40 hover:shadow-glow-plasma hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm">
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
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </div>
            </Link>

            {/* MUA NGAY — orange → red */}
            <Link
              href="/products"
              className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-buy-now p-6 lg:p-8 transition-all duration-300 hover:border-white/40 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm">
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
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </div>
            </Link>
          </div>

          {/* Trust strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] font-mono uppercase tracking-[0.16em] text-white/55">
            <span className="inline-flex items-center gap-2">
              <span className="w-1 h-1 bg-electric rounded-full" aria-hidden />
              GIAO TRONG 30S
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-1 h-1 bg-electric rounded-full" aria-hidden />
              CHÍNH HÃNG 100%
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-1 h-1 bg-electric rounded-full" aria-hidden />
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
