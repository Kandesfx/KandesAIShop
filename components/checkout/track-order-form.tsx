'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Search } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Track order form — Phase 2 P2-08.
 *
 * Flow:
 *   - User nhập OrderNumber (KDS-YYYYMMDD-XXXX) + contact (email hoặc SĐT).
 *   - Submit → POST /api/orders/track.
 *   - Trả OrderView → client redirect sang /order/[orderNumber] để có
 *     QR + countdown + polling.
 *
 * Errors:
 *   - 404: "Không tìm thấy đơn hàng" — chung cho cả sai orderNumber & contact
 *     (chống enumerate, D15).
 *   - Rate limit: thông báo từ server.
 */
export function TrackOrderForm() {
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState('')
  const [contact, setContact] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Format orderNumber về dạng canonical trước khi submit (uppercase).
  const normalizedOrder = orderNumber.trim().toUpperCase()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const { order } = await api.post<{ order: { orderNumber: string } }>('/api/orders/track', {
        orderNumber: normalizedOrder,
        contact: contact.trim(),
      })
      router.push(`/order/${order.orderNumber}`)
      router.refresh()
    } catch (e) {
      const error = e as ApiError
      if (error.fields && error.fields.length > 0) {
        setErr(error.fields.map((f) => f.message).join(', '))
      } else {
        setErr(error.message || 'Tra cứu thất bại')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy}>
      {err && (
        <div
          role="alert"
          className="border border-danger/40 bg-danger/10 text-danger text-body-sm p-2.5 flex items-start gap-2"
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
          <span>{err}</span>
        </div>
      )}

      <Input
        label="MÃ ĐƠN"
        value={orderNumber}
        onChange={(e) => setOrderNumber(e.target.value)}
        disabled={busy}
        required
        autoComplete="off"
        placeholder="KDS-20260804-0001"
        hint="Mã đơn có dạng KDS-YYYYMMDD-XXXX"
      />

      <Input
        type="text"
        label="EMAIL HOẶC SỐ ĐIỆN THOẠI"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        disabled={busy}
        required
        autoComplete="email"
        placeholder="ban@example.com hoặc 0901234567"
        hint="Dùng thông tin đã nhập khi đặt hàng"
      />

      <Button type="submit" isLoading={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ĐANG TRA CỨU…</span>
          </>
        ) : (
          <>
            <Search size={14} />
            <span>TRA CỨU</span>
          </>
        )}
      </Button>

      <p className="text-body-xs text-ink-300 text-center">
        Sau khi tra cứu, bạn có thể xem QR thanh toán, trạng thái đơn và sản phẩm.
      </p>
    </form>
  )
}
