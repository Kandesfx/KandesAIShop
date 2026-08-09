'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api, ApiError } from '@/lib/api-client'

export interface OrderStatusPollerProps {
  orderNumber: string
  initialStatus: string
  initialPaymentStatus: string
  /** Khi paid → redirect sang trang success (P2-07 chỉ reload để hiển thị "PAID"). */
  onPaidHref?: string
  /** Interval polling (ms). Default 5000. */
  intervalMs?: number
}

/**
 * Polling status cho trang /order/[orderNumber]. Phase 2 chưa có SSE/webhook
 * nên đây là best-effort: mỗi `intervalMs` gọi /api/orders/[orderNumber]/status.
 *
 * - Nếu paid → điều hướng sang trang success (C5+F4, Phase 9).
 * - Nếu cancelled → refresh tại chỗ để hiện block "ĐÃ HUỶ".
 * - Nếu 401 (guest cookie mất) → dừng polling, không spam.
 *
 * F3 (Phase 9, giảm request thừa): effect early-return NGAY LẬP TỨC — không set
 * timer nào cả — nếu `initialStatus`/`initialPaymentStatus` truyền vào đã là
 * terminal (paid/cancelled/refunded/failed). Trang server-render lại data mới
 * mỗi lần load nên nếu đơn đã ở trạng thái cuối, polling thêm chỉ tốn request.
 *
 * TODO Phase 9+: migrate sang SSE `/api/orders/[orderNumber]/stream` để giảm
 * latency + load. Polling là fallback tạm.
 *
 * Cleanup khi unmount.
 */
export function OrderStatusPoller({
  orderNumber,
  initialStatus,
  initialPaymentStatus,
  onPaidHref,
  intervalMs = 5000,
}: OrderStatusPollerProps) {
  const router = useRouter()
  const stoppedRef = useRef(false)

  useEffect(() => {
    // Nếu đã paid/cancelled ngay từ đầu thì không cần poll
    if (initialStatus === 'paid' || initialStatus === 'cancelled') return
    if (
      initialPaymentStatus === 'paid' ||
      initialPaymentStatus === 'refunded' ||
      initialPaymentStatus === 'failed'
    ) {
      return
    }

    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      if (stoppedRef.current) return
      try {
        const status = await api.get<{
          orderNumber: string
          status: string
          paymentStatus: string
        }>(`/api/orders/${orderNumber}/status`)
        if (status.status === 'paid') {
          // C5+F4: đã thanh toán → điều hướng sang trang success (mặc định
          // /order/[orderNumber]/success) thay vì chỉ reload trang chờ QR.
          stoppedRef.current = true
          router.push(onPaidHref ?? `/order/${orderNumber}/success`)
          router.refresh()
          return
        }
        if (status.status === 'cancelled') {
          // Huỷ (hết hạn/admin huỷ) → refresh tại chỗ để hiện block "ĐÃ HUỶ",
          // KHÔNG điều hướng sang /success (chưa từng thanh toán thành công).
          stoppedRef.current = true
          router.refresh()
          return
        }
      } catch (e) {
        const err = e as ApiError
        // 401/404 = không có quyền xem nữa → dừng
        if (err.code === 'UNAUTHENTICATED' || err.code === 'NOT_FOUND') {
          stoppedRef.current = true
          return
        }
        // Lỗi khác (network) → tiếp tục poll lần sau
      }
      if (!stoppedRef.current) {
        timer = setTimeout(tick, intervalMs)
      }
    }

    timer = setTimeout(tick, intervalMs)
    return () => {
      stoppedRef.current = true
      if (timer) clearTimeout(timer)
    }
  }, [orderNumber, initialStatus, initialPaymentStatus, intervalMs, onPaidHref, router])

  return null
}
