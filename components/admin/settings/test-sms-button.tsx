'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

export function TestSmsButton() {
  const [to, setTo] = useState('+84')
  const [body, setBody] = useState('Hello from Kandes!')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function send() {
    setBusy(true)
    setResult(null)
    try {
      const resp = await fetch('/api/admin/settings/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, body }),
      })
      const data = (await resp.json().catch(() => ({}))) as {
        ok: boolean
        error?: { message: string }
      }
      if (!resp.ok || !data.ok) {
        setResult({ ok: false, message: data.error?.message ?? 'Lỗi' })
        return
      }
      setResult({ ok: true, message: 'Đã gửi SMS!' })
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Lỗi' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-ink-400 bg-ink-800/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-display-sm font-display">SMS (Twilio) — Test</h3>
      </div>

      <div>
        <label className="block text-[11px] font-mono uppercase tracking-wide text-ink-100 mb-1">
          To (E.164, vd +84123456789)
        </label>
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="input-field text-[13px] w-full"
          placeholder="+84"
        />
      </div>

      <div>
        <label className="block text-[11px] font-mono uppercase tracking-wide text-ink-100 mb-1">
          Body
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="input-field text-[13px] w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={send} disabled={busy} className="btn-primary text-[12px] h-9">
          <Send size={11} strokeWidth={1.5} className="inline mr-1" aria-hidden />
          {busy ? 'Đang gửi...' : 'Gửi test'}
        </button>
        {result && (
          <span className={`text-[12px] ${result.ok ? 'text-success' : 'text-error'}`}>
            {result.message}
          </span>
        )}
      </div>
    </div>
  )
}
