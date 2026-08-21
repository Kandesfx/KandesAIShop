'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Bell, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { NotificationPrefs } from '@/modules/account/notifications/types'

interface Props {
  initialPrefs: NotificationPrefs
  userEmail: string
}

interface EventConfig {
  key: keyof NotificationPrefs['events']
  title: string
  desc: string
}

const EVENTS: EventConfig[] = [
  {
    key: 'order.created',
    title: 'Đơn hàng mới',
    desc: 'Nhận email xác nhận khi bạn tạo đơn hàng mới trên hệ thống.',
  },
  {
    key: 'order.paid',
    title: 'Xác nhận thanh toán',
    desc: 'Nhận email thông báo ngay khi hệ thống xác nhận thanh toán thành công.',
  },
  {
    key: 'order.delivered',
    title: 'Giao mã bản quyền & Key AI',
    desc: 'Nhận email bàn giao tài khoản, mã kích hoạt và hướng dẫn cài đặt.',
  },
  {
    key: 'order.cancelled',
    title: 'Đơn hàng bị huỷ',
    desc: 'Nhận email thông báo nếu đơn hàng bị huỷ hoặc hết thời gian thanh toán.',
  },
  {
    key: 'order.refunded',
    title: 'Hoàn tiền',
    desc: 'Nhận email thông báo khi đơn hàng được xử lý hoàn tiền.',
  },
]

export function NotificationPrefsForm({ initialPrefs, userEmail }: Props) {
  const router = useRouter()
  // Luôn đảm bảo channel email = true ngầm định
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    ...initialPrefs,
    channels: {
      ...initialPrefs.channels,
      email: true,
    },
  })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  async function save() {
    setSaving(true)
    setStatus(null)
    try {
      const payload: NotificationPrefs = {
        ...prefs,
        channels: {
          ...prefs.channels,
          email: true, // Luôn mặc định gửi qua Email
        },
      }

      const resp = await fetch('/api/me/notification-prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await resp.json().catch(() => ({}))) as {
        ok: boolean
        error?: { message: string }
      }
      if (!resp.ok || !data.ok) {
        setStatus({ type: 'err', message: `Lỗi: ${data.error?.message ?? 'Không thể lưu cài đặt'}` })
        return
      }
      setStatus({ type: 'ok', message: 'Đã lưu cấu hình thông báo thành công!' })
      router.refresh()
    } catch (err) {
      setStatus({ type: 'err', message: err instanceof Error ? err.message : 'Lỗi kết nối máy chủ' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {status && (
        <div
          role={status.type === 'ok' ? 'status' : 'alert'}
          className={`border p-3 flex items-start gap-2.5 text-body-sm rounded ${
            status.type === 'ok'
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-danger/40 bg-danger/10 text-danger'
          }`}
        >
          {status.type === 'ok' ? (
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Events Selection */}
      <section className="border border-ink-700/80 bg-ink-900/80 p-5 rounded-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ink-700/60">
          <div>
            <h2 className="text-base font-display font-semibold text-white flex items-center gap-2">
              <Bell size={16} className="text-electric" />
              Sự kiện nhận thông báo
            </h2>
            <p className="text-[13px] text-ink-300 mt-0.5">
              Tất cả thông báo sẽ được gửi trực tiếp đến email:{' '}
              <span className="font-mono text-electric font-medium">{userEmail}</span>
            </p>
          </div>
        </div>

        <div className="divide-y divide-ink-800">
          {EVENTS.map((event) => {
            const isChecked = prefs.events[event.key]
            return (
              <label
                key={event.key}
                htmlFor={`event-${event.key}`}
                className="flex items-start justify-between gap-4 py-3.5 cursor-pointer hover:bg-ink-800/40 px-2 rounded transition-colors"
              >
                <div className="space-y-1">
                  <div className="text-[13px] font-medium text-white select-none">
                    {event.title}
                  </div>
                  <div className="text-[13px] text-ink-300 select-none">
                    {event.desc}
                  </div>
                </div>

                <div className="relative flex items-center pt-0.5">
                  <input
                    type="checkbox"
                    id={`event-${event.key}`}
                    checked={isChecked}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        events: { ...prefs.events, [event.key]: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-ink-600 bg-ink-800 text-electric focus:ring-electric focus:ring-offset-ink-900 cursor-pointer accent-cyan-400"
                  />
                </div>
              </label>
            )
          })}
        </div>
      </section>

      {/* Save Action */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary text-[13px] h-10 px-5 flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.25)]"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>ĐANG LƯU...</span>
            </>
          ) : (
            <>
              <Save size={14} aria-hidden />
              <span>LƯU CÀI ĐẶT</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
