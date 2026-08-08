'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * VideoBackground — full-bleed autoplay loop video với poster fallback.
 *
 * Tại sao dùng `<video>` thay vì CSS background-video:
 *   - iOS Safari autoplay muted chỉ work với `<video playsInline>` element.
 *   - Cần control attribute cho accessibility (paused state).
 *   - Poster image fallback khi browser không autoplay được.
 *
 * Layer:
 *   1. Poster image (LCP candidate, hiển thị trước khi video load).
 *   2. `<video>` autoplay muted loop playsInline (fill absolute, opacity-100 mặc định).
 *   3. Dark overlay (optional, gradient từ ink-900 → ink-900/60).
 *
 * Quan trọng: video render với opacity-100 ngay từ đầu. Chỉ ẩn video khi
 * `onError` (file lỗi). Như vậy browser sẽ tự hiển thị frame đầu ngay khi có
 * data — không có "flash" đen giữa poster và video.
 *
 * Props:
 *   - sources: array { src, type } — fallback chain (webm trước, mp4 sau).
 *   - poster: URL ảnh tĩnh hiển thị trước khi video buffer xong.
 *   - overlay: 'none' | 'soft' | 'strong' — độ tối overlay.
 *   - reducedFallback: hiển thị gì khi user prefers-reduced-motion.
 *
 * The component tôn trọng `prefers-reduced-motion` (D34): thay vì video, hiển thị
 * poster với dim overlay nhẹ.
 */
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
}: VideoBackgroundProps) {
  const [reduced, setReduced] = useState(false)
  // Mặc định false: nếu video lỗi mới set true để ẩn.
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // User prefers-reduced-motion → tắt video, chỉ hiển thị poster + overlay
  const showVideo = ( !reduced || !reducedFallback ) && !videoFailed

  return (
    <div
      className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}
      aria-hidden={!ariaLabel}
      aria-label={ariaLabel}
    >
      {/* Poster image — chỉ hiển thị khi video chưa sẵn sàng (reduced motion hoặc fail) */}
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            showVideo ? 'opacity-0' : 'opacity-100'
          )}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      )}

      {/* Video layer — render với opacity-100 ngay để browser tự hiển thị frame đầu.
          Không đợi canPlay/playing event → tránh flash đen. */}
      {showVideo && (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          onError={() => setVideoFailed(true)}
        >
          {sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      )}

      {/* Dark overlay — contrast cho text phía trên */}
      {overlay !== 'none' && <div className={cn('absolute inset-0', OVERLAY_CLASS[overlay])} />}
    </div>
  )
}
