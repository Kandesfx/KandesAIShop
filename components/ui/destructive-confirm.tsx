'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Double-confirm dialog cho destructive operations.
 *
 * User phải click Confirm 2 lần:
 *   1. Lần 1: hiện chi tiết về hậu quả → nút "Tôi hiểu, tiếp tục"
 *   2. Lần 2: phải gõ lại tên resource (vd tên sản phẩm) → nút "Xoá vĩnh viễn"
 *
 * Use case: product delete, account deletion, bulk data wipe.
 *
 * @example
 *   <DestructiveConfirm
 *     open={open}
 *     title="Xoá sản phẩm?"
 *     confirmText="Xoá"
 *     resourceName={product.name}
 *     onConfirm={async () => { ... }}
 *     onCancel={() => setOpen(false)}
 *   />
 */
export interface DestructiveConfirmProps {
  open: boolean
  title: string
  /** Mô tả chi tiết hậu quả */
  consequences: React.ReactNode
  /** Tên resource user phải gõ lại để confirm */
  confirmText: string
  /** Tên resource hiện tại (user phải gõ khớp) */
  resourceName: string
  /** Loading state khi đang xử lý */
  busy?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function DestructiveConfirm({
  open,
  title,
  consequences,
  confirmText,
  resourceName,
  busy,
  onConfirm,
  onCancel,
}: DestructiveConfirmProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [typed, setTyped] = useState('')

  if (!open) return null

  const matches = typed.trim() === resourceName.trim()

  function reset() {
    setStep(1)
    setTyped('')
  }

  function handleCancel() {
    reset()
    onCancel()
  }

  async function handleConfirm() {
    try {
      await onConfirm()
      reset()
    } catch {
      // Caller handles
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="destructive-confirm-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-ink-800 border-2 border-danger/40 max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={24} className="text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3
              id="destructive-confirm-title"
              className="text-[15px] font-display text-ink-50 mb-2"
            >
              {title}
            </h3>
            <div className="text-[13px] text-ink-200 space-y-2">{consequences}</div>
          </div>
        </div>

        {step === 1 && (
          <div className="flex gap-2 justify-end pt-2 border-t border-ink-400">
            <Button variant="outline" onClick={handleCancel} disabled={busy}>
              Huỷ
            </Button>
            <Button
              variant="danger"
              onClick={() => setStep(2)}
              disabled={busy}
            >
              Tôi hiểu, tiếp tục
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 pt-2 border-t border-ink-400">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wide text-ink-200 mb-1">
                Gõ <span className="text-danger font-bold">{resourceName}</span> để xác nhận
              </label>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={resourceName}
                className="input w-full"
                autoFocus
                disabled={busy}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancel} disabled={busy}>
                Huỷ
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirm}
                disabled={busy || !matches}
              >
                {busy ? 'Đang xử lý...' : confirmText}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
