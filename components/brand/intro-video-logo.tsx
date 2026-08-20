'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface IntroVideoLogoProps {
  size?: number
  className?: string
  priority?: boolean
  restartKey?: string | number
}

/**
 * IntroVideoLogo — Logo Animation phát bằng GIF có gắn timestamp động (Cache-Bust).
 *
 * Đảm bảo 100%: Mỗi khi chuyển trang hoặc xuất hiện lại,
 * trình duyệt luôn khởi tạo bộ giải mã mới và phát đúng từ Frame 0 (không bao giờ bị tiếp tục từ giữa).
 */
export function IntroVideoLogo({
  size = 64,
  className,
  priority = true,
  restartKey,
}: IntroVideoLogoProps) {
  const [animKey, setAnimKey] = useState<number>(() => Date.now())

  useEffect(() => {
    setAnimKey(Date.now())
  }, [restartKey])

  return (
    <div
      className={cn('relative flex items-center justify-center flex-shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={animKey}
        src={`/assets/brand/logo-animated.gif?t=${animKey}`}
        alt="Kandes"
        width={size}
        height={size}
        className="block w-full h-full object-contain select-none pointer-events-none"
        loading={priority ? 'eager' : 'lazy'}
        decoding="sync"
      />
    </div>
  )
}
