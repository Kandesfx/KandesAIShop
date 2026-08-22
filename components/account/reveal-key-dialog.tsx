'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Copy, Key, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'

export interface RevealKeyDialogProps {
  orderNumber: string
  orderStatus: string
  autoFetch?: boolean
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

export function RevealKeyDialog({ orderNumber, orderStatus, autoFetch = true }: RevealKeyDialogProps) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<RevealResponse | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const canReveal = orderStatus === 'delivered' || orderStatus === 'completed'

  const fetchKeys = async () => {
    if (!canReveal) return
    setBusy(true)
    setErr(null)
    try {
      const data = await api.get<RevealResponse>(`/api/orders/${orderNumber}/reveal-key`)
      setResult(data)
    } catch (e) {
      const error = e as ApiError
      setErr(error.message || 'Không thể lấy thông tin key. Vui lòng tải lại trang.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (autoFetch && canReveal && !result && !busy && !err) {
      fetchKeys()
    }
  }, [autoFetch, canReveal, orderNumber])

  if (!canReveal) return null

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      // Fallback
    }
  }

  if (busy && !result) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-electric py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Đang giải mã và tải bản quyền...</span>
      </div>
    )
  }

  if (err && !result) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="text-xs text-red-400">{err}</span>
        <button
          type="button"
          onClick={fetchKeys}
          className="inline-flex items-center gap-1 text-xs text-electric hover:underline font-mono"
        >
          <RefreshCw className="h-3 w-3" /> Thử lại
        </button>
      </div>
    )
  }

  if (!result) {
    return (
      <button
        type="button"
        onClick={fetchKeys}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-buy-now text-ink-900 font-mono font-bold text-xs uppercase tracking-wider rounded transition-transform active:scale-95 shadow-glow-electric"
      >
        <Key className="h-3.5 w-3.5" />
        <span>XEM KEY / NHẬN BẢN QUYỀN</span>
      </button>
    )
  }

  return (
    <div className="w-full space-y-4 pt-2">
      {result.items.map((item) => {
        const isCopied = copiedId === item.id
        return (
          <div
            key={item.id}
            className="rounded-lg border border-emerald-500/40 bg-ink-900/90 p-4 shadow-lg shadow-emerald-500/5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 border-b border-ink-700/60 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="font-display font-semibold text-sm text-ink-50">
                  {item.productNameSnapshot}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                Chính hãng · Đã kích hoạt
              </span>
            </div>

            {item.content ? (
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase text-ink-200 tracking-wider">
                  Mã bản quyền / Thông tin tài khoản:
                </div>
                <div className="flex items-center justify-between gap-3 bg-ink-950 border border-ink-600/80 rounded p-3 font-mono text-sm text-emerald-300 select-all">
                  <span className="break-all font-semibold tracking-wide">
                    {item.content}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.content!)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                      isCopied
                        ? 'bg-emerald-500 text-ink-900 font-bold'
                        : 'bg-ink-800 hover:bg-ink-700 text-ink-50 border border-ink-500 hover:border-electric'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        ĐÃ SAO CHÉP
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        SAO CHÉP
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-200 italic">
                Chưa có mã key cụ thể cho phân loại này hoặc tài khoản được nâng cấp trực tiếp.
              </p>
            )}

            {item.message && (
              <div className="mt-3 p-3 bg-ink-950/60 border border-ink-700 rounded text-xs text-ink-100 space-y-1">
                <span className="font-semibold text-electric block text-[11px] font-mono uppercase">
                  💡 Hướng dẫn kích hoạt từ kỹ thuật viên:
                </span>
                <p className="whitespace-pre-wrap leading-relaxed">{item.message}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
