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
  /**
   * Order number — dùng làm channel key để sync countdown giữa nhiều tab
   * cùng xem 1 đơn hàng (Phase 9 C6). Nếu không truyền, chạy local-only.
   */
  orderNumber?: string
}

const SYNC_CHANNEL_PREFIX = 'kandes-countdown-'
/** Nếu lệch nhau > ngưỡng này (ms) so với tab khác thì đồng bộ lại `now`. */
const DRIFT_THRESHOLD_MS = 500

type SyncMessage = {
  orderNumber: string
  expiresAt: string
  now: number
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
 *
 * Phase 9 C6 — Sync across tabs: mỗi tab broadcast `{ orderNumber, expiresAt, now }`
 * mỗi 1s qua `BroadcastChannel`. Tab khác nhận được, nếu `now` của mình lệch quá
 * `DRIFT_THRESHOLD_MS` so với message nhận được thì đồng bộ lại theo giá trị mới
 * nhất — tránh trường hợp 2 tab lệch clock/tick timer dẫn đến hiển thị số giây
 * khác nhau. Browser không hỗ trợ `BroadcastChannel` (rất hiếm ở 2024+) → fallback
 * về local countdown như cũ, không throw lỗi.
 */
export function Countdown({ expiresAt, onExpire, size = 'lg', className, orderNumber }: CountdownProps) {
  const [now, setNow] = useState(() => Date.now())
  const [announced, setAnnounced] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Sync countdown across tabs via BroadcastChannel — Phase 9 C6.
  useEffect(() => {
    if (!orderNumber || typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel(`${SYNC_CHANNEL_PREFIX}${orderNumber}`)

    const handleMessage = (event: MessageEvent<SyncMessage>) => {
      const msg = event.data
      if (!msg || msg.orderNumber !== orderNumber || msg.expiresAt !== expiresAt) return
      setNow((current) => (Math.abs(msg.now - current) > DRIFT_THRESHOLD_MS ? msg.now : current))
    }
    channel.addEventListener('message', handleMessage)

    const broadcastId = setInterval(() => {
      channel.postMessage({ orderNumber, expiresAt, now: Date.now() } satisfies SyncMessage)
    }, 1000)

    return () => {
      channel.removeEventListener('message', handleMessage)
      clearInterval(broadcastId)
      channel.close()
    }
  }, [orderNumber, expiresAt])

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
