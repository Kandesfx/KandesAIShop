'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RefreshCw } from 'lucide-react'

const EVENTS = [
  { code: 'order.created', label: 'Đơn hàng đã tạo' },
  { code: 'order.paid', label: 'Đã nhận thanh toán' },
  { code: 'order.delivered', label: 'Đã giao đơn' },
  { code: 'order.cancelled', label: 'Đơn đã huỷ' },
  { code: 'order.refunded', label: 'Hoàn tiền đơn' },
  { code: 'sla.breach', label: 'SLA breach' },
]

const CHANNELS = ['email', 'telegram'] as const
const LANGUAGES = ['vi', 'en'] as const

interface TemplateDTO {
  id: string
  code: string
  channel: string
  language: string
  subject: string | null
  bodyTemplate: string
  isActive: boolean
  updatedAt: string
}

interface Props {
  initialChannel: 'email' | 'telegram'
  initialLanguage: 'vi' | 'en'
}

export function NotificationTemplateEditor({ initialChannel, initialLanguage }: Props) {
  const router = useRouter()
  const [channel, setChannel] = useState<typeof CHANNELS[number]>(initialChannel)
  const [language, setLanguage] = useState<typeof LANGUAGES[number]>(initialLanguage)
  const [items, setItems] = useState<TemplateDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCode, setSelectedCode] = useState<string>(EVENTS[0]?.code ?? 'order.created')
  const [draft, setDraft] = useState<{ subject: string; bodyTemplate: string; isActive: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/notification-templates?channel=${channel}&language=${language}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; data?: { items: TemplateDTO[] } }) => {
        if (data.ok && data.data) setItems(data.data.items)
      })
      .finally(() => setLoading(false))
  }, [channel, language])

  useEffect(() => {
    const found = items.find((t) => t.code === selectedCode)
    if (found) {
      setDraft({
        subject: found.subject ?? '',
        bodyTemplate: found.bodyTemplate,
        isActive: found.isActive,
      })
    } else {
      setDraft({ subject: '', bodyTemplate: '', isActive: true })
    }
  }, [items, selectedCode])

  async function save() {
    if (!draft) return
    setSaving(true)
    setMessage(null)
    try {
      const resp = await fetch('/api/admin/notification-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedCode,
          channel,
          language,
          subject: draft.subject || undefined,
          bodyTemplate: draft.bodyTemplate,
          isActive: draft.isActive,
        }),
      })
      const data = (await resp.json().catch(() => ({}))) as { ok: boolean; error?: { message: string } }
      if (!resp.ok || !data.ok) {
        setMessage(`Lỗi: ${data.error?.message ?? 'unknown'}`)
        return
      }
      setMessage('Đã lưu.')
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Lỗi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-ink-400 bg-ink-800/40 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[10px] text-ink-200 mb-1">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof CHANNELS[number])}
              className="input-field text-[12px] min-w-[120px]"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-ink-200 mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof LANGUAGES[number])}
              className="input-field text-[12px] min-w-[100px]"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-ink-200 mb-1">Event</label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="input-field text-[12px] min-w-[200px]"
            >
              {EVENTS.map((e) => (
                <option key={e.code} value={e.code}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => router.refresh()} className="btn-outline text-[11px] h-9">
            <RefreshCw size={12} strokeWidth={1.5} className="inline mr-1" aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-ink-200 text-[11px]">Đang tải...</p>
      ) : draft ? (
        <div className="border border-ink-400 bg-ink-800/40 p-4 space-y-3">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
              Subject (optional)
            </label>
            <input
              type="text"
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              className="input-field text-[12px] w-full"
              placeholder="(auto-generated from event)"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wide text-ink-200 mb-1">
              Body (HTML cho email, plain text cho telegram)
            </label>
            <textarea
              value={draft.bodyTemplate}
              onChange={(e) => setDraft({ ...draft, bodyTemplate: e.target.value })}
              rows={10}
              className="input-field text-[12px] w-full font-mono"
              placeholder="Để trống → fallback to mặc định"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
              id="isActive"
            />
            <label htmlFor="isActive" className="text-[11px] text-ink-50">
              Active (khi tắt → fallback mặc định)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving || !draft.bodyTemplate} className="btn-primary text-[11px] h-9">
              <Save size={12} strokeWidth={1.5} className="inline mr-1" aria-hidden />
              {saving ? 'Đang lưu...' : 'Lưu template'}
            </button>
            {message && (
              <span className="text-[11px] text-ink-200">{message}</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
