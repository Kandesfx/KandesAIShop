'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModalShell, LoadingButton } from './modal-shell'
import { api } from '@/lib/api-client'

interface RefundModalProps {
  open: boolean
  orderId: string
  totalLabel: string
  onClose: () => void
}

export function RefundModal({ open, orderId, totalLabel, onClose }: RefundModalProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setAmount('')
    setReason('')
    setError(null)
  }

  const submit = async () => {
    const cleaned = amount.replace(/\D/g, '')
    if (!cleaned || Number(cleaned) <= 0) {
      setError('Số tiền phải > 0')
      return
    }
    if (reason.trim().length < 3) {
      setError('Lý do phải có ít nhất 3 ký tự')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.post(`/api/admin/orders/${orderId}/refund`, {
        amountCents: cleaned,
        reason: reason.trim(),
      })
      reset()
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      open={open}
      title="Hoàn tiền"
      onClose={() => {
        if (!busy) {
          reset()
          onClose()
        }
      }}
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              if (!busy) {
                reset()
                onClose()
              }
            }}
            className="btn-ghost text-[12px]"
            disabled={busy}
          >
            Đóng
          </button>
          <LoadingButton busy={busy} label="Hoàn tiền" busyLabel="Đang xử lý..." onClick={submit} />
        </>
      }
    >
      <p className="text-body-sm text-ink-200">
        Tổng đơn: <span className="text-ink-50 font-medium">{totalLabel}</span>. Phase 3 chỉ ghi
        nhận trạng thái — admin xử lý chuyển khoản thật qua SePay dashboard.
      </p>
      <label className="label" htmlFor="refund-amount">
        Số tiền hoàn (VND) <span className="text-danger">*</span>
      </label>
      <input
        id="refund-amount"
        type="text"
        inputMode="numeric"
        className="input"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="vd 199000"
        disabled={busy}
      />
      <label className="label" htmlFor="refund-reason">
        Lý do <span className="text-danger">*</span>
      </label>
      <textarea
        id="refund-reason"
        className="input min-h-[80px]"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={busy}
        maxLength={500}
      />
      {error && (
        <p className="text-body-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </ModalShell>
  )
}
