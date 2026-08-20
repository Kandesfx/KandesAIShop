'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Sparkles, Zap } from 'lucide-react'
import { VideoBackground } from '@/components/brand/video-background'
import { PagePreloader } from '@/components/brand/page-preloader'
import { Logo } from '@/components/brand/logo'
import { TechTicker } from '@/components/sections/tech-ticker'

interface HeroProps {
  /** Hiển thị version "lite" cho embedded contexts (cart empty, etc.). */
  compact?: boolean
}

const VIDEO_SOURCES = [
  { src: '/assets/video/bg-video-compressed.webm', type: 'video/webm' },
  { src: '/assets/video/bg-video.webm', type: 'video/webm' },
]

const HERO_POSTER = '/assets/brand/hero-poster.svg'

export function Hero({ compact = false }: HeroProps) {
  const [isVideoReady, setIsVideoReady] = useState(false)

  return (
    <>
      {!compact && <PagePreloader isReady={isVideoReady} />}

      <section
        className={`relative overflow-hidden bg-ink-900 -mt-16 flex flex-col justify-between ${
          compact ? 'py-12' : 'min-h-screen'
        }`}
        aria-labelledby="hero-heading"
      >
        {/* Video background — full bleed, kéo tràn lên trên cả header */}
        <VideoBackground
          sources={VIDEO_SOURCES}
          poster={HERO_POSTER}
          overlay="soft"
          ariaLabel="Video nền minh họa sản phẩm Kandes"
          onReady={() => setIsVideoReady(true)}
        />

      {/* Spacing top để tránh Header (h-16 = 64px) */}
      <div className="h-16 shrink-0" aria-hidden="true" />

      {/* Tech Ticker — thanh status scrolling công nghệ nổi phía trên video */}
      <div className="relative z-20">
        <TechTicker />
      </div>

      {/* Content wrapper — vừa khít khung hình */}
      <div className="relative z-10 container-narrow flex-1 flex flex-col items-center justify-center text-center py-6">
        {/* Subtle grid pattern behind text */}
        <div
          className="absolute inset-0 bg-grid-tech bg-[size:32px_32px] opacity-[0.07] pointer-events-none"
          aria-hidden
        />

        <div className="relative w-full max-w-4xl mx-auto space-y-4">
          {/* Eyebrow badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 border border-white/15 bg-white/5 backdrop-blur-sm rounded-full animate-slide-in-up"
            style={{ animationDelay: '0ms' }}
          >
            <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" aria-hidden />
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-white/80">
              SYSTEM ONLINE · EST. 2026
            </span>
          </div>

          {/* Logo wordmark */}
          <div
            className="animate-slide-in-up flex justify-center py-1"
            style={{ animationDelay: '100ms' }}
          >
            <Logo variant="wordmark" size={44} className="text-white" />
          </div>

          {/* Headline — kích thước vừa phải để không bị che mất hay kéo dài màn hình */}
          <h1
            id="hero-heading"
            className="text-3xl sm:text-5xl lg:text-6xl font-display font-bold text-white leading-[1.05] max-w-3xl mx-auto animate-slide-in-up"
            style={{ animationDelay: '200ms' }}
          >
            Công cụ <span className="text-gradient-electric">AI coding</span>
            <br />
            chính hãng.
          </h1>

          {/* Sub-copy */}
          <p
            className="text-[14px] sm:text-[16px] text-white/80 max-w-xl mx-auto leading-relaxed animate-slide-in-up"
            style={{ animationDelay: '350ms' }}
          >
            Cursor Pro · Windsurf · GitHub Copilot · Claude Pro — tự động giao key qua email trong
            30 giây. Không chờ đợi, không thủ tục.
          </p>

          {/* CTA cards */}
          <div
            className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-xl mx-auto animate-slide-in-up"
            style={{ animationDelay: '500ms' }}
          >
            {/* AI GATEWAY — purple → cyan */}
            <Link
              href="/products?category=ai-code"
              className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-ai-gateway p-5 lg:p-6 text-left transition-all duration-300 hover:border-white/40 hover:shadow-glow-plasma hover:-translate-y-1 hover:scale-[1.02]"
            >
              {/* Shine overlay */}
              <div className="shine-overlay absolute inset-0 z-10" aria-hidden />
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm group-hover:bg-white/25 transition-colors">
                  <Sparkles size={16} strokeWidth={2} className="text-white" aria-hidden />
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/70">
                  /01
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/70">
                  API · KEY · RESELLER
                </div>
                <h2 className="text-[20px] sm:text-[24px] font-display font-bold text-white leading-tight">
                  AI Gateway
                </h2>
              </div>
              <div className="mt-4 flex items-center justify-between text-[12px] font-medium text-white/90">
                <span>Khám phá</span>
                <ArrowUpRight
                  size={14}
                  strokeWidth={2}
                  className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                  aria-hidden
                />
              </div>
            </Link>

            {/* MUA NGAY — orange → red */}
            <Link
              href="/products"
              className="group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-buy-now p-5 lg:p-6 text-left transition-all duration-300 hover:border-white/40 hover:-translate-y-1 hover:scale-[1.02]"
            >
              {/* Shine overlay */}
              <div className="shine-overlay absolute inset-0 z-10" aria-hidden />
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm group-hover:bg-white/25 transition-colors">
                  <Zap size={16} strokeWidth={2} className="text-white" aria-hidden />
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/70">
                  /02
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/70">
                  LICENSE · INSTANT
                </div>
                <h2 className="text-[20px] sm:text-[24px] font-display font-bold text-white leading-tight">
                  Mua ngay
                </h2>
              </div>
              <div className="mt-4 flex items-center justify-between text-[12px] font-medium text-white/90">
                <span>Xem sản phẩm</span>
                <ArrowUpRight
                  size={14}
                  strokeWidth={2}
                  className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                  aria-hidden
                />
              </div>
            </Link>
          </div>

          {/* Trust strip */}
          <div
            className="pt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.16em] text-white/60 animate-slide-in-up"
            style={{ animationDelay: '650ms' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" aria-hidden />
              GIAO TRONG 30S
            </span>
            <span className="hidden sm:inline text-white/20" aria-hidden>│</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" style={{ animationDelay: '600ms' }} aria-hidden />
              CHÍNH HÃNG 100%
            </span>
            <span className="hidden sm:inline text-white/20" aria-hidden>│</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" style={{ animationDelay: '1200ms' }} aria-hidden />
              HỖ TRỢ 24/7
            </span>
          </div>
        </div>
      </div>

      {/* Bottom fade — transition mượt sang section dưới */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-ink-900 pointer-events-none"
        aria-hidden
      />
      </section>
    </>
  )
}
