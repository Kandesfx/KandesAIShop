'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CheckoutResult } from '@/modules/checkout'

export interface CheckoutFormProps {
  defaultEmail?: string
  defaultPhone?: string
  isGuest: boolean
}

/**
 * Checkout form — Phase 2 P2-07.
 *
 * Submit → POST /api/checkout → nhận CheckoutResult → router.push(/order/[orderNumber]).
 *
 * Pre-fill email/phone/name nếu user đã login (từ session). Guest thì để trống.
 *
 * Checkbox điều khoản bắt buộc (BR — acceptTerms literal(true)).
 */
export function CheckoutForm({
  defaultEmail = '',
  defaultPhone = '',
  isGuest,
}: CheckoutFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState(defaultEmail)
  const [phone, setPhone] = useState(defaultPhone)
  const [notes, setNotes] = useState('')
  const notesId = useId()
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!acceptTerms) {
      setErr('Bạn phải đồng ý điều khoản để tiếp tục')
      return
    }
    setBusy(true)
    try {
      const { result } = await api.post<{ result: CheckoutResult }>('/api/checkout', {
        email,
        phone,
        notes: notes || undefined,
        acceptTerms,
        paymentMethod: 'sepay_qr',
      })
      // Clear draft state + redirect sang trang order (sẽ tự polling)
      router.push(result.redirectUrl)
      router.refresh()
    } catch (e) {
      const error = e as ApiError
      if (error.fields && error.fields.length > 0) {
        setErr(error.fields.map((f) => f.message).join(', '))
      } else {
        setErr(error.message || 'Thanh toán thất bại')
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
        type="email"
        label="EMAIL"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
        required
        autoComplete="email"
        placeholder="ban@example.com"
      />

      <Input
        type="tel"
        label="SỐ ĐIỆN THOẠI"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={busy}
        required
        autoComplete="tel"
        placeholder="0901234567"
        inputMode="tel"
      />

      <div className="space-y-1.5">
        <label htmlFor={notesId} className="label">
          GHI CHÚ (TÙY CHỌN)
        </label>
        <textarea
          id={notesId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          rows={3}
          maxLength={500}
          placeholder="Yêu cầu đặc biệt cho đơn hàng..."
          className="input resize-none"
        />
        <p className="text-body-sm text-ink-200">{notes.length}/500</p>
      </div>

      <label className="flex items-start gap-2 cursor-pointer text-body-sm text-ink-100">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          disabled={busy}
          required
          className="mt-0.5 h-4 w-4 accent-electric border-ink-300 bg-ink-700"
        />
        <span>
          Tôi đã đọc và đồng ý với{' '}
          <a
            href="/terms"
            className="text-electric hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Điều khoản dịch vụ
          </a>{' '}
          và{' '}
          <a
            href="/privacy"
            className="text-electric hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Chính sách bảo mật
          </a>{' '}
          của Kandes.shop.
        </span>
      </label>

      <Button type="submit" isLoading={busy} disabled={!acceptTerms} className="w-full" size="lg">
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ĐANG TẠO ĐƠN…</span>
          </>
        ) : (
          <span>THANH TOÁN</span>
        )}
      </Button>

      {isGuest && (
        <p className="text-body-xs text-ink-300 text-center">
          Mua với tư cách <span className="text-ink-100">khách</span>. Sau khi thanh toán, bạn có
          thể tra cứu đơn qua trang <span className="text-electric">/track-order</span>.
        </p>
      )}
    </form>
  )
}
