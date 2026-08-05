'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ModalShellProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

/**
 * Minimal modal shell — re-used by deliver / refund / cancel / note modals.
 */
export function ModalShell({ open, title, onClose, children, footer }: ModalShellProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Đóng modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-ink-900 border border-ink-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <header className="flex items-center justify-between gap-3 p-4 border-b border-ink-700">
          <h2 className="text-h4 text-ink-50 font-display">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1 text-ink-300 hover:text-ink-50"
          >
            <X size={16} />
          </button>
        </header>
        <div className="p-4 space-y-3 overflow-y-auto">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 p-4 border-t border-ink-700">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

interface LoadingButtonProps {
  busy: boolean
  label: string
  busyLabel?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'outline'
  disabled?: boolean
}
export function LoadingButton({
  busy,
  label,
  busyLabel = 'Đang xử lý...',
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
}: LoadingButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      onClick={onClick}
      disabled={busy || disabled}
      isLoading={busy}
    >
      {busy ? busyLabel : label}
    </Button>
  )
}
