'use client'

import { useState } from 'react'

interface Props {
  defaultRecipient: string | null
}

/**
 * Test email button — POST /api/admin/settings/test-email.
 * Hiện chỉ console provider hoạt động (D28); resend/ses → 501.
 */
export function TestEmailButton({ defaultRecipient }: Props) {
  const [recipient, setRecipient] = useState(defaultRecipient ?? '')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)

  async function handleSend() {
    if (!recipient) {
      setResult({ ok: false, message: 'Cần email người nhận' })
      return
    }
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipient }),
      })
      const data = await res.json()
      if (data.ok) {
        setResult({
          ok: true,
          message: `Đã gửi qua provider '${data.data.provider}' tới ${data.data.recipient}`,
        })
      } else {
        setResult({
          ok: false,
          message: data.error?.message ?? 'Gửi thất bại',
        })
      }
    } catch {
      setResult({ ok: false, message: 'Lỗi kết nối' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-2 border border-ink-400 bg-ink-800/40 p-4">
      <h3 className="text-[13px] font-mono uppercase tracking-wide text-ink-100">
        Test gửi email
      </h3>
      <p className="text-[11px] text-ink-100">
        Chỉ console provider (dev) hoạt động. Resend/SES chưa implement trong
        Phase 4 (xem CONTEXT D28) — đặt <code>EMAIL_PROVIDER=console</code> để test.
      </p>
      <div className="flex gap-2 items-center">
        <input
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="recipient@example.com"
          className="input-field flex-1 text-[13px]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="btn-outline text-[12px]"
        >
          {sending ? 'Đang gửi...' : 'Gửi test'}
        </button>
      </div>
      {result && (
        <p
          className={`text-[12px] ${result.ok ? 'text-success' : 'text-danger'}`}
        >
          {result.message}
        </p>
      )}
    </div>
  )
}
