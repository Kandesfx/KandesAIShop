'use client'

import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { IntroLogo } from '@/components/brand/logo'

/**
 * Hero — phong cách cyber/editorial, không dark-glow AI-generic.
 *
 * Layout: chia đôi — bên trái là typography statement + CTA,
 * bên phải là logo animation. Background có scan lines + noise nhẹ.
 */

const ROTATING_WORDS = ['Cursor Pro', 'Windsurf', 'GitHub Copilot', 'Claude Pro', 'ChatGPT Plus', 'JetBrains AI']

export function Hero() {
  const [idx, setIdx] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setIdx((i) => (i + 1) % ROTATING_WORDS.length), 2200)
    return () => clearInterval(id)
  }, [reduced])

  return (
    <section className="relative overflow-hidden bg-ink-900">
      {/* Background layers — scan lines + grid subtle + noise */}
      <div className="absolute inset-0 bg-scanlines pointer-events-none" aria-hidden />
      <div className="absolute inset-0 bg-grid-tech bg-[size:48px_48px] opacity-30 pointer-events-none" aria-hidden />
      {/* Top + bottom accent lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric to-transparent opacity-60" aria-hidden />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-plasma to-transparent opacity-40" aria-hidden />

      <div className="relative container-narrow">
        {/* Top meta strip */}
        <div className="flex items-center justify-between py-4 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-200 border-b border-ink-400/60">
          <span>[ 01 / HOME ]</span>
          <span className="hidden sm:inline">KANDES.SHOP / NĂNG LƯỢNG CHO LẬP TRÌNH VIÊN</span>
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-electric animate-pulse-dot" />
            LIVE
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 py-16 lg:py-24">
          {/* LEFT — Typography */}
          <div className="lg:col-span-7 space-y-8">
            {/* Eyebrow */}
            <div className="tech-tag">
              <span>SYSTEM ONLINE · EST. 2026</span>
            </div>

            {/* Main headline */}
            <h1 className="text-display-xl font-display text-ink-50 leading-[0.95]">
              <span className="block">Mua công cụ</span>
              <span className="block">
                <span className="text-glitch">AI coding</span>
              </span>
              <span className="block">
                chính hãng,
                <br />
                <span className="text-electric">trong 30 giây.</span>
              </span>
            </h1>

            {/* Sub-copy */}
            <p className="text-[17px] text-ink-100 max-w-xl leading-relaxed">
              <span className="inline-flex items-center gap-2 align-middle mr-2">
                <span className="w-6 h-px bg-electric" />
                <span className="text-electric mono text-[13px]">{'//'}</span>
              </span>
              Cursor Pro, Windsurf, GitHub Copilot, Claude Pro — tự động giao key qua email.
              Không chờ đợi, không thủ tục.
            </p>

            {/* Rotating product ticker */}
            <div className="inline-flex items-center gap-3 px-4 py-2 border border-ink-400 bg-ink-700/40 mono text-[12px]">
              <span className="text-ink-200 uppercase tracking-[0.14em] text-[10px]">ĐANG BÁN:</span>
              <span className="text-electric">{ROTATING_WORDS[idx]}</span>
              <span className="text-ink-200">→</span>
              <span className="text-ink-100">còn hàng</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/products">
                <Button size="lg" rightIcon={<ArrowRight size={16} strokeWidth={2} />}>
                  Khám phá sản phẩm
                </Button>
              </Link>
              <Link href="/help/how-to-buy">
                <Button size="lg" variant="outline" rightIcon={<ArrowUpRight size={16} strokeWidth={2} />}>
                  Hướng dẫn mua
                </Button>
              </Link>
            </div>

            {/* Stats — data terminal style */}
            <div className="grid grid-cols-3 gap-px bg-ink-400 border border-ink-400 max-w-2xl mt-12">
              {[
                { k: 'T+<', v: '30s', l: 'giao hàng tự động' },
                { k: '24/7', v: 'on', l: 'hỗ trợ qua Telegram / Zalo' },
                { k: '100%', v: 'OK', l: 'key chính hãng' },
              ].map((s) => (
                <div key={s.l} className="bg-ink-800 p-4 space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
                    {s.k}
                  </div>
                  <div className="text-h2 font-display text-electric">{s.v}</div>
                  <div className="text-[11px] text-ink-100 leading-snug">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Logo animation centerpiece */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-square w-full max-w-[480px] mx-auto">
              {/* Frame brackets */}
              <span className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-electric" aria-hidden />
              <span className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-electric" aria-hidden />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-plasma" aria-hidden />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-plasma" aria-hidden />

              {/* Logo animated */}
              <div className="absolute inset-6 flex items-center justify-center bg-ink-700/30 border border-ink-400 overflow-hidden">
                <IntroLogo className="w-full h-full object-contain" />
              </div>

              {/* Corner labels */}
              <span className="absolute -top-6 left-0 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-200">
                [ K.LOGO.ANIMATED ]
              </span>
              <span className="absolute -bottom-6 right-0 text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
                POWER.ON ▸
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
