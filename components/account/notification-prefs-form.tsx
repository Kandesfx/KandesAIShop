'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ExternalLink } from 'lucide-react'
import type { NotificationPrefs } from '@/modules/account/notifications/types'

interface Props {
  initialPrefs: NotificationPrefs
  telegramBotLink: string | null
  zaloOALink: string | null
  userEmail: string
  currentTelegramChatId: boolean
  currentZaloUserId: boolean
}

const CHANNEL_LABELS: Record<keyof NotificationPrefs['channels'], string> = {
  email: 'Email',
  telegram: 'Telegram',
  zalo: 'Zalo OA',
  sms: 'SMS (Twilio)',
}

const EVENT_LABELS: Record<keyof NotificationPrefs['events'], string> = {
  'order.created': 'Đơn hàng đã tạo',
  'order.paid': 'Đã nhận thanh toán',
  'order.delivered': 'Đã giao đơn',
  'order.cancelled': 'Đơn đã huỷ',
  'order.refunded': 'Hoàn tiền đơn',
}

export function NotificationPrefsForm({
  initialPrefs,
  telegramBotLink,
  zaloOALink,
  currentTelegramChatId,
  currentZaloUserId,
}: Props) {
  const router = useRouter()
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const resp = await fetch('/api/me/notification-prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const data = (await resp.json().catch(() => ({}))) as {
        ok: boolean
        error?: { message: string }
      }
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
    <div className="space-y-6">
      <section className="border border-ink-400 bg-ink-800/40 p-4 space-y-3">
        <h2 className="text-display-sm font-display">Channels</h2>
        <p className="text-[11px] text-ink-200 mb-2">
          Bật/tắt từng kênh. Để nhận qua Telegram/Zalo, bạn cần liên kết trước.
        </p>
        <ul className="space-y-2">
          {(Object.keys(prefs.channels) as Array<keyof NotificationPrefs['channels']>).map((k) => (
            <li key={k} className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                checked={prefs.channels[k]}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    channels: { ...prefs.channels, [k]: e.target.checked },
                  })
                }
                id={`channel-${k}`}
              />
              <label htmlFor={`channel-${k}`} className="text-[12px] text-ink-50 w-32">
                {CHANNEL_LABELS[k]}
              </label>
              {k === 'telegram' && telegramBotLink && (
                <a
                  href={telegramBotLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-electric hover:underline"
                >
                  <ExternalLink size={11} className="inline mr-1" />
                  {currentTelegramChatId ? 'Đã liên kết — mở bot' : 'Liên kết Telegram'}
                </a>
              )}
              {k === 'zalo' && zaloOALink && (
                <a
                  href={zaloOALink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-electric hover:underline"
                >
                  <ExternalLink size={11} className="inline mr-1" />
                  {currentZaloUserId ? 'Đã liên kết — mở OA' : 'Quan tâm OA'}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-ink-400 bg-ink-800/40 p-4 space-y-3">
        <h2 className="text-display-sm font-display">Events</h2>
        <p className="text-[11px] text-ink-200 mb-2">
          Bật/tắt từng loại thông báo. Áp dụng cho tất cả channels đã bật ở trên.
        </p>
        <ul className="space-y-2">
          {(Object.keys(prefs.events) as Array<keyof NotificationPrefs['events']>).map((k) => (
            <li key={k} className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                checked={prefs.events[k]}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    events: { ...prefs.events, [k]: e.target.checked },
                  })
                }
                id={`event-${k}`}
              />
              <label htmlFor={`event-${k}`} className="text-[12px] text-ink-50">
                {EVENT_LABELS[k]}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving} className="btn-primary text-[11px] h-9">
          <Save size={11} strokeWidth={1.5} className="inline mr-1" aria-hidden />
          {saving ? 'Đang lưu...' : 'Lưu preferences'}
        </button>
        {message && <span className="text-[11px] text-ink-200">{message}</span>}
      </div>
    </div>
  )
}
