'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModalShell, LoadingButton } from './modal-shell'
import { api } from '@/lib/api-client'

interface NoteFormProps {
  orderId: string
}

export function NoteForm({ orderId }: NoteFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setNote('')
    setError(null)
  }

  const submit = async () => {
    if (note.trim().length < 1) {
      setError('Note phải có ít nhất 1 ký tự')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.patch(`/api/admin/orders/${orderId}/note`, { note: note.trim() })
      reset()
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-outline text-[11px]">
        + GHI INTERNAL NOTE
      </button>
      <ModalShell
        open={open}
        title="Thêm internal note"
        onClose={() => {
          if (!busy) {
            reset()
            setOpen(false)
          }
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                if (!busy) {
                  reset()
                  setOpen(false)
                }
              }}
              className="btn-ghost text-[12px]"
              disabled={busy}
            >
              Đóng
            </button>
            <LoadingButton busy={busy} label="Lưu" busyLabel="Đang lưu..." onClick={submit} />
          </>
        }
      >
        <p className="text-body-sm text-ink-200">
          Note sẽ được append vào <span className="mono text-ink-50">order.internalNotes</span> cùng
          với timestamp + role. Hiển thị chỉ admin.
        </p>
        <label className="label" htmlFor="internal-note">
          Note
        </label>
        <textarea
          id="internal-note"
          className="input min-h-[120px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          maxLength={2000}
        />
        {error && (
          <p className="text-body-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </ModalShell>
    </>
  )
}
