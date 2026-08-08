'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CountdownProps {
  /** ISO timestamp hết hạn */
  expiresAt: string
  /** Callback khi countdown về 0 */
  onExpire?: () => void
  /** Size variant */
  size?: 'md' | 'lg'
  className?: string
}

/**
 * Countdown đến expiresAt. Render MM:SS. Khi về 0 → hiển thị "ĐÃ HẾT HẠN".
 *
 * Phase 2 không có SSE/webhook, nên client polling status endpoint mỗi 5s sẽ
 * phát hiện auto-cancel từ server. Countdown chỉ là visual cue cho user.
 *
 * Cleanup setInterval khi unmount / khi expiresAt đổi.
 *
 * Accessibility: role="timer" + aria-live="polite" cho screen reader.
 */
export function Countdown({ expiresAt, onExpire, size = 'lg', className }: CountdownProps) {
  const [now, setNow] = useState(() => Date.now())
  const [announced, setAnnounced] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const target = new Date(expiresAt).getTime()
  const diff = Math.max(0, target - now)
  const minutes = Math.floor(diff / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1000)
  const expired = diff <= 0

  useEffect(() => {
    if (expired && onExpire) onExpire()
  }, [expired, onExpire])

  // Announce once when expired for screen readers
  useEffect(() => {
    if (expired && !announced) {
      setAnnounced(true)
    }
  }, [expired, announced])

  const sizeClass = size === 'lg' ? 'text-h2 font-display' : 'text-h4 font-mono'

  return (
    <div className={cn('inline-flex items-center gap-2', className)} role="timer" aria-live="polite">
      <Clock
        size={size === 'lg' ? 20 : 14}
        strokeWidth={1.5}
        className={cn(expired ? 'text-danger' : 'text-electric')}
        aria-hidden
      />
      <span
        className={cn(
          sizeClass,
          'tabular-nums tracking-tight',
          expired ? 'text-danger' : 'text-electric'
        )}
      >
        {expired
          ? '00:00'
          : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
      </span>
      <span
        className={cn(
          'text-[10px] font-mono uppercase tracking-[0.18em]',
          expired ? 'text-danger' : 'text-ink-300'
        )}
      >
        {expired ? 'ĐÃ HẾT HẠN' : 'CÒN LẠI'}
      </span>
      {/* Screen reader only announcement when expired */}
      {expired && announced && (
        <span className="sr-only" role="status" aria-live="assertive">
          Đơn hàng đã hết hạn thanh toán
        </span>
      )}
    </div>
  )
}
