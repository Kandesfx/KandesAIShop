'use client'

import { useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  busy?: boolean
}

/**
 * Generic confirm dialog — thay thế `window.confirm()` để khớp theme.
 *
 * Usage:
 *   const [open, setOpen] = useState(false)
 *   <ConfirmDialog
 *     open={open}
 *     title="Xoá sản phẩm?"
 *     message="Hành động này không thể hoàn tác."
 *     onConfirm={async () => { await doStuff(); setOpen(false) }}
 *     onCancel={() => setOpen(false)}
 *   />
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  variant = 'danger',
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  const iconColor = variant === 'danger' ? 'text-danger' : 'text-warning'

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !busy && onCancel()}
        aria-hidden
      />
      <div
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-sm bg-ink-900 border border-ink-700 shadow-2xl',
          'flex flex-col'
        )}
      >
        <header className="flex items-start justify-between gap-3 p-4 border-b border-ink-700">
          <div className="flex items-start gap-3 min-w-0">
            <AlertTriangle
              size={20}
              className={cn('flex-shrink-0 mt-0.5', iconColor)}
              aria-hidden
            />
            <div className="min-w-0">
              <h2 className="text-h4 text-ink-50 font-display">{title}</h2>
              <p className="text-body-sm text-ink-300 mt-1">{message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Đóng"
            className="p-1 text-ink-300 hover:text-ink-50 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </header>

        <footer className="flex items-center justify-end gap-2 p-4">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'primary' : 'primary'}
            size="sm"
            onClick={onConfirm}
            disabled={busy}
            isLoading={busy}
            className={cn(variant === 'danger' && 'bg-danger hover:bg-danger/90 text-white')}
          >
            {confirmLabel}
          </Button>
        </footer>
      </div>
    </div>
  )
}
