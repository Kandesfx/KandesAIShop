'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'

declare global {
  interface Window {
    __KANDES_HERO_VIDEO_READY__?: boolean
  }
}

interface PagePreloaderProps {
  /** Thời gian tối đa chờ (ms) trước khi tự động mở trang để tránh bị kẹt */
  maxTimeoutMs?: number
  className?: string
}

function PagePreloaderContent({
  maxTimeoutMs = 4000,
  className,
}: PagePreloaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fullPath = `${pathname}?${searchParams.toString()}`

  const [completed, setCompleted] = useState(false)
  const [unmounted, setUnmounted] = useState(false)
  const [progress, setProgress] = useState(25)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [statusText, setStatusText] = useState('INITIALIZING...')
  const isFirstMountRef = useRef(true)

  // 1. Lắng nghe chuyển trang / chuyển tab (Client-side Navigation)
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false
      return
    }

    const isHomePage = pathname === '/'
    setUnmounted(false)
    setCompleted(false)
    setIsTransitioning(true)
    setProgress(35)
    setStatusText(isHomePage ? 'BUFFERING VIDEO STREAM...' : 'SYSTEM ROUTING...')

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(interval)
          return 92
        }
        return prev + Math.floor(Math.random() * 20 + 10)
      })
    }, 60)

    let routeTimer: NodeJS.Timeout | null = null

    if (!isHomePage) {
      // Các trang không có video: chạy transition 380ms mượt mà
      routeTimer = setTimeout(() => {
        setProgress(100)
        setStatusText('READY')
        setCompleted(true)
      }, 380)
    } else {
      // Khi bấm về trang Home: BẮT BUỘC kiểm tra video đã load xong chưa
      const isVideoAlreadyReady =
        typeof window !== 'undefined' &&
        (window.__KANDES_HERO_VIDEO_READY__ ||
          (document.querySelector('video') && (document.querySelector('video') as HTMLVideoElement).readyState >= 2))

      if (isVideoAlreadyReady) {
        // Video đã sẵn sàng từ trước
        routeTimer = setTimeout(() => {
          setProgress(100)
          setStatusText('READY')
          setCompleted(true)
        }, 350)
      } else {
        // Video chưa load xong: Giữ màn hình loading và chờ event 'kandes:video-ready'
        const handleVideoReady = () => {
          setProgress(100)
          setStatusText('VIDEO READY')
          setCompleted(true)
        }
        window.addEventListener('kandes:video-ready', handleVideoReady, { once: true })

        // Safety fallback tối đa 4s nếu mạng quá yếu
        routeTimer = setTimeout(() => {
          setProgress(100)
          setStatusText('READY')
          setCompleted(true)
        }, maxTimeoutMs)
      }
    }

    return () => {
      clearInterval(interval)
      if (routeTimer) clearTimeout(routeTimer)
    }
  }, [fullPath, pathname, maxTimeoutMs])

  // 2. Lần tải đầu tiên (Initial Load)
  useEffect(() => {
    const isHomePage = pathname === '/'
    setStatusText(isHomePage ? 'BUFFERING VIDEO STREAM...' : 'INITIALIZING SYSTEM...')

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(interval)
          return 92
        }
        return prev + Math.floor(Math.random() * 18 + 6)
      })
    }, 100)

    const handleVideoReady = () => {
      setProgress(100)
      setStatusText('VIDEO READY')
      setCompleted(true)
    }
    window.addEventListener('kandes:video-ready', handleVideoReady, { once: true })

    let initialTimer: NodeJS.Timeout | null = null

    if (!isHomePage) {
      initialTimer = setTimeout(() => {
        setProgress(100)
        setStatusText('READY')
        setCompleted(true)
      }, 500)
    }

    // Safety timeout: Tối đa 4s để không chặn người dùng nếu mạng quá yếu
    const safetyTimer = setTimeout(() => {
      setProgress(100)
      setStatusText('READY')
      setCompleted(true)
    }, maxTimeoutMs)

    return () => {
      clearInterval(interval)
      window.removeEventListener('kandes:video-ready', handleVideoReady)
      if (initialTimer) clearTimeout(initialTimer)
      clearTimeout(safetyTimer)
    }
  }, [pathname, maxTimeoutMs])

  // 3. Xử lý unmount sau khi animation fade-out kết thúc
  useEffect(() => {
    if (completed) {
      const hideTimer = setTimeout(() => {
        setUnmounted(true)
        setIsTransitioning(false)
      }, 450)
      return () => clearTimeout(hideTimer)
    }
  }, [completed])

  return (
    <>
      {/* Top Laser Progress Bar khi chuyển tab/trang */}
      {!completed && (
        <div className="fixed top-0 left-0 right-0 h-[2.5px] z-[100000] pointer-events-none overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-plasma via-electric to-electric shadow-[0_0_12px_rgba(0,229,255,1)] transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Full Cyberpunk Overlay */}
      {!unmounted && (
        <div
          className={cn(
            'fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#05060A] transition-all duration-400 ease-out select-none',
            completed ? 'opacity-0 pointer-events-none scale-102 backdrop-blur-none' : 'opacity-100 backdrop-blur-sm',
            isTransitioning && 'bg-[#05060A]/95',
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
          <div className="relative z-10 flex flex-col items-center space-y-5 px-4 max-w-sm text-center">
            {/* Logo animated */}
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-4 bg-electric/20 rounded-full blur-xl animate-pulse" />
              <Logo variant="icon" size={isTransitioning ? 54 : 64} animated priority className="relative z-10" />
            </div>

            {/* Brand wordmark */}
            <div className="space-y-1">
              <div className="text-lg sm:text-xl font-display font-bold tracking-[0.25em] text-white uppercase">
                KANDES<span className="text-electric">.SHOP</span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono text-ink-200 tracking-[0.2em] uppercase">
                {pathname === '/'
                  ? 'HERO VIDEO STREAM · 1080P 60FPS'
                  : isTransitioning
                    ? 'SYSTEM ROUTING · SECURE CHANNEL'
                    : 'AI CODING TOOLS · EST. 2026'}
              </div>
            </div>

            {/* Loading progress bar */}
            <div className="w-48 space-y-2 pt-1">
              <div className="h-1 w-full bg-ink-700/80 rounded-full overflow-hidden border border-white/10 p-[0.5px]">
                <div
                  className="h-full bg-gradient-to-r from-plasma via-electric to-electric rounded-full transition-all duration-200 ease-out shadow-[0_0_12px_rgba(0,229,255,0.8)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-ink-300 uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse-dot" />
                  {statusText}
                </span>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function PagePreloader(props: PagePreloaderProps) {
  return (
    <Suspense fallback={null}>
      <PagePreloaderContent {...props} />
    </Suspense>
  )
}
