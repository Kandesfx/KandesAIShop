'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface VideoSource {
  src: string
  type: string
}

export interface VideoBackgroundProps {
  sources: VideoSource[]
  poster?: string
  overlay?: 'none' | 'soft' | 'strong'
  reducedFallback?: boolean
  className?: string
  ariaLabel?: string
  onReady?: () => void
}

const OVERLAY_CLASS = {
  none: '',
  soft: 'bg-gradient-to-b from-ink-900/40 via-ink-900/55 to-ink-900/85',
  strong: 'bg-gradient-to-b from-ink-900/65 via-ink-900/75 to-ink-900/95',
} as const

export function VideoBackground({
  sources,
  poster,
  overlay = 'soft',
  reducedFallback = true,
  className,
  ariaLabel,
  onReady,
}: VideoBackgroundProps) {
  const [reduced, setReduced] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // If video is already ready or playing (e.g. from cache)
    if (video.readyState >= 2 || video.currentTime > 0) {
      setIsVideoReady(true)
      onReady?.()
      if (typeof window !== 'undefined') {
        window.__KANDES_HERO_VIDEO_READY__ = true
        window.dispatchEvent(new CustomEvent('kandes:video-ready'))
      }
    }
  }, [onReady])

  // User prefers-reduced-motion hoặc video lỗi → tắt video, chỉ hiển thị poster + overlay
  const showVideo = (!reduced || !reducedFallback) && !videoFailed

  const handleVideoReady = () => {
    setIsVideoReady(true)
    onReady?.()
    if (typeof window !== 'undefined') {
      window.__KANDES_HERO_VIDEO_READY__ = true
      window.dispatchEvent(new CustomEvent('kandes:video-ready'))
    }
  }

  return (
    <div
      className={cn('absolute inset-0 overflow-hidden pointer-events-none bg-[#05060A]', className)}
      aria-hidden={!ariaLabel}
      aria-label={ariaLabel}
    >
      {/* 1. Base Ambient Cyberpunk Mesh (luôn hiển thị, tạo nền glow cao cấp không bao giờ bị lộ nền trống) */}
      <div className="absolute inset-0 bg-[#05060A] overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[1100px] h-[650px] bg-gradient-to-br from-plasma/30 via-electric/20 to-transparent rounded-full blur-[100px] opacity-75 animate-glow-pulse pointer-events-none" />
        <div className="absolute top-[35%] -right-[15%] w-[700px] h-[550px] bg-sunset/20 rounded-full blur-[90px] opacity-50 pointer-events-none" />
      </div>

      {/* 2. Poster image — giữ nguyên 100% hiển thị cho đến khi video thực sự sẵn sàng phát */}
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out',
            isVideoReady ? 'opacity-0' : 'opacity-100'
          )}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      )}

      {/* 3. Video layer — ẩn mờ (opacity-0) cho tới khi có dữ liệu khung hình đầu tiên, sau đó fade in mượt mà */}
      {showVideo && (
        <video
          ref={videoRef}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out',
            isVideoReady ? 'opacity-100' : 'opacity-0'
          )}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          onPlaying={handleVideoReady}
          onLoadedData={handleVideoReady}
          onCanPlay={handleVideoReady}
          onCanPlayThrough={handleVideoReady}
          onError={() => setVideoFailed(true)}
        >
          {sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      )}

      {/* 4. Hiệu ứng quét Shimmer tinh tế khi video đang buffer */}
      {!isVideoReady && !videoFailed && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-electric/5 to-transparent animate-shimmer pointer-events-none" />
      )}

      {/* 5. Dark overlay — tăng độ tương phản cho text phía trên */}
      {overlay !== 'none' && <div className={cn('absolute inset-0 z-[1]', OVERLAY_CLASS[overlay])} />}
    </div>
  )
}
