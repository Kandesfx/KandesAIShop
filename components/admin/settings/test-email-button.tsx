'use client'

import { useState } from 'react'
import { Mail, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react'

interface Props {
  defaultRecipient: string | null
}

export function TestEmailButton({ defaultRecipient }: Props) {
  const [recipient, setRecipient] = useState(defaultRecipient ?? '')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    message: string
    latencyMs?: number
    provider?: string
  } | null>(null)

  async function handleSend() {
    if (!recipient) {
      setResult({ ok: false, message: 'Vui lòng nhập địa chỉ email nhận' })
      return
    }
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          subject: '[Kandes] Kiểm tra hệ thống gửi Email tự động',
          content: 'Đây là email kiểm tra xác nhận hệ thống gửi email tự động của Kandes Shop đang hoạt động chuẩn xác trên máy chủ AWS EC2.',
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setResult({
          ok: true,
          message: `Gửi email thành công tới ${data.data.recipient}!`,
          latencyMs: data.data.latencyMs,
          provider: data.data.provider,
        })
      } else {
        setResult({
          ok: false,
          message: data.error?.message ?? 'Gửi thất bại. Kiểm tra cấu hình Resend API Key.',
        })
      }
    } catch (err) {
      setResult({
        ok: false,
        message: `Lỗi kết nối mạng: ${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-ink-400 bg-ink-800/60 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-electric" />
        <h3 className="text-sm font-semibold tracking-wide text-ink-50">
          Gửi Email Kiểm tra (Live Test)
        </h3>
      </div>
      <p className="text-xs leading-relaxed text-ink-200">
        Gửi một email kiểm tra thực tế tới hộp thư của bạn thông qua Resend API để xác nhận kết nối mạng outbound và quyền gửi thư trên máy chủ.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <input
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="nhap-email-cua-ban@gmail.com"
          className="input-field flex-1 text-sm bg-ink-900 border-ink-400 text-ink-50 focus:border-electric"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="btn-primary flex items-center justify-center gap-2 px-5 py-2 text-xs font-medium uppercase tracking-wider disabled:opacity-50"
        >
          {sending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Gửi kiểm tra
            </>
          )}
        </button>
      </div>

      {result && (
        <div
          className={`flex items-start gap-2.5 rounded border p-3 text-xs leading-relaxed ${
            result.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <p className="font-medium">{result.message}</p>
            {result.ok && (
              <p className="text-[11px] opacity-80">
                Provider: <span className="font-mono">{result.provider}</span>
                {result.latencyMs !== undefined && ` • Thời gian phản hồi: ${result.latencyMs}ms`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
