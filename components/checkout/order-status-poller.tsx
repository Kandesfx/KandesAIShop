'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api, ApiError } from '@/lib/api-client'
import { PaymentSuccessModal } from './payment-success-modal'

export interface OrderStatusPollerProps {
  orderNumber: string
  initialStatus: string
  initialPaymentStatus: string
  /** Khi paid → redirect sang trang success sau khi hiển thị popup. */
  onPaidHref?: string
  /** Interval polling (ms). Default 2500. */
  intervalMs?: number
}

/**
 * Polling status cho trang /order/[orderNumber].
 * Khi phát hiện paid -> Hiển thị Popup cứng trên màn hình với animation tích xanh ăn mừng.
 */
export function OrderStatusPoller({
  orderNumber,
  initialStatus,
  initialPaymentStatus,
  onPaidHref,
  intervalMs = 2500,
}: OrderStatusPollerProps) {
  const router = useRouter()
  const stoppedRef = useRef(false)
  const [showPaidModal, setShowPaidModal] = useState(false)

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
        if (
          status.status === 'paid' ||
          status.status === 'processing' ||
          status.status === 'delivered' ||
          status.status === 'completed' ||
          status.paymentStatus === 'paid'
        ) {
          // Đã thanh toán thành công → dừng poll và mở Popup cứng ăn mừng ngay tại trang!
          stoppedRef.current = true
          setShowPaidModal(true)
          return
        }
        if (status.status === 'cancelled') {
          // Huỷ (hết hạn/admin huỷ) → refresh tại chỗ để hiện block "ĐÃ HUỶ"
          stoppedRef.current = true
          if (typeof window !== 'undefined') {
            window.location.reload()
          } else {
            router.refresh()
          }
          return
        }
      } catch (e) {
        const err = e as ApiError
        // 404 = không tìm thấy đơn → dừng
        if (err.code === 'NOT_FOUND') {
          stoppedRef.current = true
          return
        }
        // Lỗi khác (network/auth) → tiếp tục poll lần sau
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
  }, [orderNumber, initialStatus, initialPaymentStatus, intervalMs, router])

  return (
    <PaymentSuccessModal
      isOpen={showPaidModal}
      orderNumber={orderNumber}
      onPaidHref={onPaidHref}
      onClose={() => {
        setShowPaidModal(false)
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      }}
    />
  )
}
