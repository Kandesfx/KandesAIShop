'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'

interface PagePreloaderProps {
  /** Thời gian tối đa chờ (ms) trước khi tự động mở trang để tránh bị kẹt */
  maxTimeoutMs?: number
  className?: string
}

export function PagePreloader({
  maxTimeoutMs = 2800,
  className,
}: PagePreloaderProps) {
  const [completed, setCompleted] = useState(false)
  const [unmounted, setUnmounted] = useState(false)
  const [progress, setProgress] = useState(20)
  const pathname = usePathname()

  useEffect(() => {
    // Giả lập thanh tiến trình chạy đều
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(interval)
          return 92
        }
        return prev + Math.floor(Math.random() * 18 + 6)
      })
    }, 120)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // 1. Lắng nghe event từ video background (trang chủ)
    const handleVideoReady = () => {
      setProgress(100)
      setCompleted(true)
    }
    window.addEventListener('kandes:video-ready', handleVideoReady)

    // 2. Với các trang không có video background (products, docs, cart, ...):
    // Cho hiển thị intro ngắn ~550ms để tạo cảm giác công nghệ mượt mà rồi mở
    const isHomePage = pathname === '/'
    let nonHomeTimer: NodeJS.Timeout | null = null

    if (!isHomePage) {
      nonHomeTimer = setTimeout(() => {
        setProgress(100)
        setCompleted(true)
      }, 550)
    }

    // 3. Timeout an toàn: Tối đa 2.8s nếu video tải lâu trên mạng yếu
    const safetyTimer = setTimeout(() => {
      setProgress(100)
      setCompleted(true)
    }, maxTimeoutMs)

    return () => {
      window.removeEventListener('kandes:video-ready', handleVideoReady)
      if (nonHomeTimer) clearTimeout(nonHomeTimer)
      clearTimeout(safetyTimer)
    }
  }, [pathname, maxTimeoutMs])

  useEffect(() => {
    if (completed) {
      const hideTimer = setTimeout(() => {
        setUnmounted(true)
      }, 700)
      return () => clearTimeout(hideTimer)
    }
  }, [completed])

  if (unmounted) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#05060A] transition-all duration-700 ease-out select-none',
        completed ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100',
        className
      )}
      aria-hidden={completed}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-plasma/30 via-electric/20 to-transparent rounded-full blur-[140px] opacity-75 animate-glow-pulse" />
        <div className="absolute inset-0 bg-grid-tech bg-[size:32px_32px] opacity-[0.06]" />
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center space-y-6 px-4 max-w-sm text-center">
        {/* Logo animated */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-4 bg-electric/20 rounded-full blur-xl animate-pulse" />
          <Logo variant="icon" size={64} animated priority className="relative z-10" />
        </div>

        {/* Brand wordmark */}
        <div className="space-y-1">
          <div className="text-xl font-display font-bold tracking-[0.25em] text-white uppercase">
            KANDES<span className="text-electric">.SHOP</span>
          </div>
          <div className="text-[11px] font-mono text-ink-200 tracking-[0.2em] uppercase">
            AI CODING TOOLS · EST. 2026
          </div>
        </div>

        {/* Loading progress bar */}
        <div className="w-48 space-y-2 pt-2">
          <div className="h-1 w-full bg-ink-700/80 rounded-full overflow-hidden border border-white/10 p-[0.5px]">
            <div
              className="h-full bg-gradient-to-r from-plasma via-electric to-electric rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(0,229,255,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-ink-300 uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" />
              {progress < 100 ? 'INITIALIZING...' : 'READY'}
            </span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
