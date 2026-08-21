'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Key, Copy } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface RevealKeyDialogProps {
  orderNumber: string
  orderStatus: string
}

interface RevealResponse {
  orderNumber: string
  items: Array<{
    id: string
    productNameSnapshot: string
    content: string | null
    message: string | null
  }>
}

/**
 * Reveal key dialog — Phase 2 P2-09.
 *
 * Flow:
 *   - User nhấn "HIỆN KEY" → mở dialog confirm.
 *   - User nhập password + xác nhận → POST /api/orders/[orderNumber]/reveal-key.
 *   - Server verify password + decrypt → trả key.
 *   - User copy từng key.
 *
 * Bảo mật (D16):
 *   - Password verify (anti-phishing / shared device).
 *   - KHÔNG lưu key client-side state lâu (user đóng dialog → clear).
 *   - Đã giao (delivered) mới hiện button.
 */
export function RevealKeyDialog({ orderNumber, orderStatus }: RevealKeyDialogProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<RevealResponse | null>(null)

  const canReveal = orderStatus === 'delivered' || orderStatus === 'completed'

  if (!canReveal) return null

  const reset = () => {
    setOpen(false)
    setPassword('')
    setErr(null)
    setBusy(false)
    setResult(null)
  }

  const onSubmit = async () => {
    setErr(null)
    setBusy(true)
    try {
      const data = await api.post<RevealResponse>(`/api/orders/${orderNumber}/reveal-key`, {
        password,
      })
      setResult(data)
    } catch (e) {
      const error = e as ApiError
      if (error.code === 'INVALID_PASSWORD') {
        setErr('Mật khẩu không đúng')
      } else if (error.code === 'NO_PASSWORD') {
        setErr(error.message)
      } else if (error.code === 'NOT_DELIVERED') {
        setErr('Đơn chưa được giao')
      } else if (error.code === 'RATE_LIMITED') {
        setErr('Bạn thử quá nhiều lần. Vui lòng đợi 1 phút.')
      } else {
        setErr(error.message || 'Hiển thị key thất bại')
      }
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-electric text-ink-900 hover:bg-electric/90 font-semibold text-body-sm transition-colors"
      >
        <Key size={14} aria-hidden />
        <span>HIỆN KEY / SẢN PHẨM</span>
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-title"
      className="fixed inset-0 z-50 bg-ink-900/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-ink-800 border border-ink-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <header className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-electric">
              [ REVEAL · KEY ]
            </span>
            <h2 id="reveal-title" className="text-h3 font-display text-ink-50 mt-1">
              {result ? 'Key / Sản phẩm của bạn' : 'Xác nhận để hiển thị'}
            </h2>
          </div>
          <button
            type="button"
            onClick={reset}
            aria-label="Đóng"
            className="text-ink-200 hover:text-ink-50 p-1"
          >
            ✕
          </button>
        </header>

        {!result ? (
          <>
            <p className="text-body-sm text-ink-200">
              Vui lòng nhập lại mật khẩu để xác nhận. Sau đó, key và nội dung sẽ hiển thị trong hộp
              thoại này — bạn có thể copy từng mục.
            </p>

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
              type="password"
              label="MẬT KHẨU"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={reset} disabled={busy}>
                Huỷ
              </Button>
              <Button type="button" onClick={onSubmit} isLoading={busy} disabled={!password}>
                {busy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>ĐANG XÁC NHẬN…</span>
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    <span>HIỆN KEY</span>
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <RevealedItems result={result} onClose={reset} />
        )}
      </div>
    </div>
  )
}

function RevealedItems({ result, onClose }: { result: RevealResponse; onClose: () => void }) {
  return (
    <>
      <div className="border border-success/40 bg-success/10 p-3 text-body-sm text-success flex items-start gap-2">
        <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
        <span>
          {result.items.length === 0
            ? 'Đơn này không có key/sản phẩm để reveal (vd: sản phẩm vật lý).'
            : 'Hãy copy từng key và lưu trữ an toàn. Sau khi đóng, key sẽ ẩn lại.'}
        </span>
      </div>

      <ul className="space-y-3">
        {result.items.map((it) => (
          <li key={it.id} className="border border-ink-700 bg-ink-900 p-3 space-y-2">
            <div>
              <p className="text-ink-50 text-body-sm">{it.productNameSnapshot}</p>
            </div>

            {it.content && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-300">
                  KEY / NỘI DUNG
                </span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-ink-950 border border-ink-700 p-2 text-ink-50 text-body-sm break-all font-mono">
                    {it.content}
                  </code>
                  <CopyButton value={it.content} />
                </div>
              </div>
            )}

            {it.message && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-300">
                  TIN NHẮN
                </span>
                <p className="text-ink-100 text-body-sm whitespace-pre-wrap">{it.message}</p>
              </div>
            )}

            {!it.content && !it.message && (
              <p className="text-ink-300 text-body-xs italic">Mục này không có key/tin nhắn.</p>
            )}
          </li>
        ))}
      </ul>

      <div className="flex justify-end gap-2 pt-2 border-t border-ink-700">
        <Button type="button" variant="outline" onClick={onClose}>
          <EyeOff size={14} />
          <span>ẨN KEY</span>
        </Button>
      </div>
    </>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select via textarea
      const ta = document.createElement('textarea')
      ta.value = value
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="px-2 py-2 border border-ink-700 hover:border-electric text-ink-100 hover:text-electric transition-colors text-body-xs"
      aria-label="Copy key"
    >
      <Copy size={12} />
      <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
