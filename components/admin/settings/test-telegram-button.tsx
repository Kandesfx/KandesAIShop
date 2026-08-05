'use client'

import { useState } from 'react'
import { Send, RefreshCw } from 'lucide-react'

export function TestTelegramButton() {
  const [message, setMessage] = useState('Hello from Kandes!')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const [chatId, setChatId] = useState('')

  async function send() {
    setBusy(true)
    setResult(null)
    try {
      const resp = await fetch('/api/admin/settings/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, chatId: chatId || undefined }),
      })
      const data = (await resp.json().catch(() => ({}))) as {
        ok: boolean
        error?: { message: string }
      }
      if (!resp.ok || !data.ok) {
        setResult({ ok: false, message: data.error?.message ?? 'Lỗi' })
        return
      }
      setResult({ ok: true, message: 'Đã gửi thành công!' })
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Lỗi' })
    } finally {
      setBusy(false)
    }
  }

  async function checkBot() {
    setBusy(true)
    setResult(null)
    try {
      const resp = await fetch('/api/admin/settings/test-telegram', { method: 'GET' })
      const data = (await resp.json().catch(() => ({}))) as {
        ok: boolean
        data?: { bot: { username: string } }
        error?: { message: string }
      }
      if (!resp.ok || !data.ok) {
        setResult({ ok: false, message: data.error?.message ?? 'Lỗi' })
        return
      }
      setResult({ ok: true, message: `Bot OK: @${data.data?.bot.username}` })
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Lỗi' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-ink-400 bg-ink-800/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-display-sm font-display">Telegram — Test</h3>
        <button onClick={checkBot} disabled={busy} className="btn-outline text-[10px]">
          <RefreshCw size={11} strokeWidth={1.5} className="inline mr-1" aria-hidden />
          Verify bot
        </button>
      </div>

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
          Message (sẽ gửi tới admin chat)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="input-field text-[12px] w-full"
        />
      </div>

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
          Chat ID override (optional, default = env)
        </label>
        <input
          type="text"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="123456789"
          className="input-field text-[12px] w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={send} disabled={busy} className="btn-primary text-[11px] h-9">
          <Send size={11} strokeWidth={1.5} className="inline mr-1" aria-hidden />
          {busy ? 'Đang gửi...' : 'Gửi test'}
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
