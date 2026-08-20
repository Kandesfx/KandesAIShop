'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'

interface PagePreloaderProps {
  /** Khi video hoặc trang đã sẵn sàng phát */
  isReady?: boolean
  /** Thời gian tối đa chờ (ms) trước khi tự động mở trang để tránh bị kẹt */
  maxTimeoutMs?: number
  className?: string
}

export function PagePreloader({
  isReady = false,
  maxTimeoutMs = 3000,
  className,
}: PagePreloaderProps) {
  const [completed, setCompleted] = useState(false)
  const [unmounted, setUnmounted] = useState(false)
  const [progress, setProgress] = useState(15)

  useEffect(() => {
    // Giả lập thanh tiến trình chạy đều
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + Math.floor(Math.random() * 15 + 5)
      })
    }, 150)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Timeout an toàn: Nếu mạng chậm quá 3s, tự động mở trang để không chặn người dùng
    const timer = setTimeout(() => {
      setProgress(100)
      setCompleted(true)
    }, maxTimeoutMs)

    if (isReady) {
      clearTimeout(timer)
      setProgress(100)
      setCompleted(true)
    }

    return () => clearTimeout(timer)
  }, [isReady, maxTimeoutMs])

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
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05060A] transition-all duration-700 ease-out select-none',
        completed ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100',
        className
      )}
      aria-hidden={completed}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-plasma/25 via-electric/15 to-transparent rounded-full blur-[120px] opacity-70 animate-glow-pulse" />
        <div className="absolute inset-0 bg-grid-tech bg-[size:32px_32px] opacity-[0.05]" />
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
