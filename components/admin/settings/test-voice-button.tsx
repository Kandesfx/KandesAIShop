'use client'

import { useState } from 'react'
import { PhoneCall } from 'lucide-react'

export function TestVoiceButton() {
  const [to, setTo] = useState('+84')
  const [body, setBody] = useState('Kandes SLA L1 test')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function send() {
    setBusy(true)
    setResult(null)
    try {
      const resp = await fetch('/api/admin/settings/test-voice', {
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
      setResult({ ok: true, message: 'Đã start cuộc gọi!' })
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Lỗi' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-ink-400 bg-ink-800/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-display-sm font-display">Voice Call (Twilio) — Test</h3>
      </div>
      <p className="text-[10px] text-ink-200">
        Twilio sẽ fetch TwiML từ <code>PUBLIC_BASE_URL/api/voice/respond</code> và đọc message tiếng Việt.
      </p>

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
          To (E.164)
        </label>
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="input-field text-[12px] w-full"
          placeholder="+84"
        />
      </div>

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
          Message (TwiML sẽ đọc)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="input-field text-[12px] w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={send} disabled={busy} className="btn-primary text-[11px] h-9">
          <PhoneCall size={11} strokeWidth={1.5} className="inline mr-1" aria-hidden />
          {busy ? 'Đang gọi...' : 'Gọi test'}
        </button>
        {result && (
          <span className={`text-[11px] ${result.ok ? 'text-success' : 'text-error'}`}>
            {result.message}
          </span>
        )}
      </div>
    </div>
  )
}
