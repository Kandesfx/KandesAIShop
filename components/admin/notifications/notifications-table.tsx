'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'

interface Row {
  id: string
  event: string
  channel: string
  recipient: string
  status: NotificationStatus
  attempts: number
  maxAttempts: number
  error: string | null
  createdAt: string
  sentAt: string | null
  orderId: string | null
}

interface Props {
  rows: Row[]
  total: number
  page: number
  pageSize: number
  currentStatus: string | null
  currentChannel: string | null
  currentEvent: string | null
}

const STATUS_OPTIONS: (NotificationStatus | '')[] = ['', 'queued', 'sent', 'delivered', 'failed', 'bounced']
const CHANNEL_OPTIONS: string[] = ['', 'email', 'telegram', 'zalo', 'sms', 'voice']


export function NotificationsTable({
  rows,
  total,
  page,
  pageSize,
  currentStatus,
  currentChannel,
  currentEvent,
}: Props) {
  const router = useRouter()
  const [retrying, setRetrying] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function setFilter(key: 'status' | 'channel' | 'event', value: string | null) {
    const sp = new URLSearchParams()
    if (key !== 'status' && currentStatus) sp.set('status', currentStatus)
    if (key !== 'channel' && currentChannel) sp.set('channel', currentChannel)
    if (key !== 'event' && currentEvent) sp.set('event', currentEvent)
    if (value) sp.set(key, value)
    sp.set('page', '1')
    router.push(`/admin/notifications?${sp.toString()}`)
  }

  function gotoPage(p: number) {
    const sp = new URLSearchParams()
    if (currentStatus) sp.set('status', currentStatus)
    if (currentChannel) sp.set('channel', currentChannel)
    if (currentEvent) sp.set('event', currentEvent)
    sp.set('page', String(p))
    router.push(`/admin/notifications?${sp.toString()}`)
  }

  async function retry(id: string) {
    setRetrying(id)
    setMessage(null)
    try {
      const resp = await fetch(`/api/admin/notifications/${id}/retry`, { method: 'POST' })
      const data = (await resp.json().catch(() => ({}))) as {
        ok: boolean
        error?: { message: string }
      }
      if (!resp.ok || !data.ok) {
        setMessage(`Retry fail: ${data.error?.message ?? 'unknown'}`)
        return
      }
      setMessage(`Đã retry row ${id.slice(0, 8)}`)
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Lỗi')
    } finally {
      setRetrying(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      <div className="border border-ink-400 bg-ink-800/40 p-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-[10px] text-ink-200 mb-1">Status</label>
          <select
            value={currentStatus ?? ''}
            onChange={(e) => setFilter('status', e.target.value || null)}
            className="input-field text-[12px] min-w-[100px]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || 'all'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-ink-200 mb-1">Channel</label>
          <select
            value={currentChannel ?? ''}
            onChange={(e) => setFilter('channel', e.target.value || null)}
            className="input-field text-[12px] min-w-[100px]"
          >
            {CHANNEL_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || 'all'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-ink-200 mb-1">Event</label>
          <input
            type="text"
            value={currentEvent ?? ''}
            onChange={(e) => setFilter('event', e.target.value || null)}
            placeholder="order.paid"
            className="input-field text-[12px] min-w-[160px]"
          />
        </div>
        <button
          onClick={() => router.push('/admin/notifications')}
          className="btn-outline text-[10px]"
        >
          Clear
        </button>
      </div>

      <div className="border border-ink-400 overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-ink-800 text-ink-200">
            <tr>
              <th className="text-left p-2 font-mono">Created</th>
              <th className="text-left p-2 font-mono">Status</th>
              <th className="text-left p-2 font-mono">Channel</th>
              <th className="text-left p-2 font-mono">Event</th>
              <th className="text-left p-2 font-mono">Recipient</th>
              <th className="text-left p-2 font-mono">Attempts</th>
              <th className="text-left p-2 font-mono">Error</th>
              <th className="text-left p-2 font-mono">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-ink-200">
                  Không có notification nào.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-ink-700">
                  <td className="p-2 font-mono text-ink-200">{fmtDate(r.createdAt)}</td>
                  <td className="p-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="p-2">{r.channel}</td>
                  <td className="p-2 font-mono">{r.event}</td>
                  <td className="p-2 font-mono text-ink-50">{r.recipient}</td>
                  <td className="p-2 text-center">
                    {r.attempts}/{r.maxAttempts}
                  </td>
                  <td className="p-2 text-ink-200 max-w-[300px] truncate" title={r.error ?? ''}>
                    {r.error ?? '—'}
                  </td>
                  <td className="p-2">
                    {r.status === 'failed' && (
                      <button
                        onClick={() => retry(r.id)}
                        disabled={retrying === r.id}
                        className="btn-outline text-[10px] h-7"
                      >
                        <RefreshCw size={10} className="inline mr-1" />
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink-200">
          Page {page}/{totalPages} — Total {total} rows
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => gotoPage(page - 1)}
            disabled={page <= 1}
            className="btn-outline text-[10px]"
          >
            <ChevronLeft size={10} />
            Prev
          </button>
          <button
            onClick={() => gotoPage(page + 1)}
            disabled={page >= totalPages}
            className="btn-outline text-[10px]"
          >
            Next
            <ChevronRight size={10} />
          </button>
        </div>
      </div>

      {message && (
        <p className="text-[11px] text-ink-200">{message}</p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: NotificationStatus }) {
  const color =
    status === 'sent' || status === 'delivered'
      ? 'bg-success/20 text-success'
      : status === 'queued'
      ? 'bg-electric/20 text-electric'
      : status === 'failed'
      ? 'bg-warning/20 text-warning'
      : 'bg-error/20 text-error'
  return <span className={`px-2 py-0.5 text-[10px] font-mono ${color}`}>{status}</span>
}

function fmtDate(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19)
}
