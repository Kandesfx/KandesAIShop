'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModalShell, LoadingButton } from './modal-shell'
import { api } from '@/lib/api-client'

interface CancelModalProps {
  open: boolean
  orderId: string
  onClose: () => void
}

export function CancelModal({ open, orderId, onClose }: CancelModalProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setReason('')
    setError(null)
  }

  const submit = async () => {
    if (reason.trim().length < 3) {
      setError('Lý do phải có ít nhất 3 ký tự')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.post(`/api/admin/orders/${orderId}/actions/cancel`, { reason: reason.trim() })
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
      title="Huỷ đơn hàng"
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
            className="btn-ghost text-[13px]"
            disabled={busy}
          >
            Đóng
          </button>
          <LoadingButton busy={busy} label="Huỷ đơn" busyLabel="Đang huỷ..." onClick={submit} />
        </>
      }
    >
      <p className="text-body-sm text-ink-100">
        Hành động này sẽ set order sang <span className="text-danger font-medium">cancelled</span>{' '}
        và trả lại key đã reserve (nếu có).
      </p>
      <label className="label" htmlFor="cancel-reason">
        Lý do <span className="text-danger">*</span>
      </label>
      <textarea
        id="cancel-reason"
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
