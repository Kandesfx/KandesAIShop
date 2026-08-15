'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModalShell, LoadingButton } from './modal-shell'
import { api } from '@/lib/api-client'

export type DeliverItemLite = {
  id: string
  productNameSnapshot: string
  variantId: string | null
}

type Mode = 'pick_from_stock' | 'manual_key' | 'manual_message'

interface DeliverModalProps {
  open: boolean
  orderId: string
  items: DeliverItemLite[]
  strategy: string | null
  onClose: () => void
}

export function DeliverModal({ open, orderId, items, strategy, onClose }: DeliverModalProps) {
  const router = useRouter()
  const allowed = useMemo<Mode[]>(() => {
    if (strategy === 'MANUAL_MESSAGE') return ['manual_message', 'manual_key']
    if (strategy === 'MANUAL_KEY') return ['manual_key', 'pick_from_stock']
    if (strategy === 'INSTANT_AUTO') return ['manual_key', 'pick_from_stock']
    return ['manual_key', 'manual_message', 'pick_from_stock']
  }, [strategy])

  const initialMode: Mode = strategy === 'MANUAL_MESSAGE' ? 'manual_message' : 'manual_key'
  const [mode, setMode] = useState<Mode>(initialMode)
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setPicks({})
    setKeys({})
    setMessages({})
    setError(null)
  }

  const submit = async () => {
    setError(null)
    let body: Record<string, unknown>
    if (mode === 'pick_from_stock') {
      const itemIds: string[] = []
      for (const it of items) {
        const v = picks[it.id]?.trim()
        if (!v) {
          setError(`Thiếu inventory item id cho "${it.productNameSnapshot}"`)
          return
        }
        // Lightweight UUID validation server-side; here just sanity check 8-4-4-4-12.
        if (!/^[0-9a-f-]{36}$/i.test(v)) {
          setError(`inventory item id không hợp lệ cho "${it.productNameSnapshot}"`)
          return
        }
        itemIds.push(v)
      }
      body = { mode: 'pick_from_stock', itemIds }
    } else if (mode === 'manual_key') {
      const list = items.map((it) => {
        const k = keys[it.id]?.trim()
        if (!k) throw new Error(`Thiếu key cho "${it.productNameSnapshot}"`)
        return { orderItemId: it.id, key: k }
      })
      body = { mode: 'manual_key', keys: list }
    } else {
      const list = items.map((it) => {
        const m = messages[it.id]?.trim()
        if (!m) throw new Error(`Thiếu message cho "${it.productNameSnapshot}"`)
        return { orderItemId: it.id, message: m }
      })
      body = { mode: 'manual_message', messages: list }
    }

    setBusy(true)
    try {
      await api.post(`/api/admin/orders/${orderId}/deliver`, body)
      reset()
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      open={open}
      title="Giao đơn hàng"
      onClose={() => {
        if (!busy) {
          reset()
          onClose()
        }
      }}
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              if (!busy) {
                reset()
                onClose()
              }
            }}
            className="btn-ghost text-[12px]"
            disabled={busy}
          >
            Huỷ
          </button>
          <LoadingButton
            busy={busy}
            label="Giao"
            busyLabel="Đang giao..."
            onClick={() => {
              // surface thrown Error from local validation
              try {
                void submit()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Lỗi không xác định')
              }
            }}
          />
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        {allowed.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            disabled={busy}
            className={`px-2 py-1 border text-[11px] ${
              mode === m
                ? 'border-electric text-electric'
                : 'border-ink-400 text-ink-100 hover:border-electric hover:text-electric'
            } transition-colors disabled:opacity-40`}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>

      <p className="text-body-sm text-ink-200">{MODE_HINT[mode]}</p>

      {mode === 'pick_from_stock' && (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id}>
              <label className="label" htmlFor={`pick-${it.id}`}>
                {it.productNameSnapshot}
              </label>
              <input
                id={`pick-${it.id}`}
                type="text"
                placeholder="UUID inventory item"
                className="input mono text-[12px]"
                value={picks[it.id] ?? ''}
                onChange={(e) => setPicks((p) => ({ ...p, [it.id]: e.target.value }))}
                disabled={busy}
              />
            </div>
          ))}
          <p className="text-[11px] text-ink-200">
            Vào trang{' '}
            <a href="/manage/products" className="text-electric underline">
              Sản phẩm
            </a>{' '}
            → Inventory → copy UUID từng key available.
          </p>
        </div>
      )}

      {mode === 'manual_key' && (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id}>
              <label className="label" htmlFor={`key-${it.id}`}>
                {it.productNameSnapshot}
              </label>
              <textarea
                id={`key-${it.id}`}
                className="input min-h-[70px] mono text-[12px]"
                value={keys[it.id] ?? ''}
                onChange={(e) => setKeys((p) => ({ ...p, [it.id]: e.target.value }))}
                disabled={busy}
                maxLength={2000}
              />
              <p className="text-[11px] text-ink-200 mt-1">
                Sẽ được mã hoá AES-256-GCM trước khi lưu. Khách nhận qua trang đơn sau khi nhập
                password.
              </p>
            </div>
          ))}
        </div>
      )}

      {mode === 'manual_message' && (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id}>
              <label className="label" htmlFor={`msg-${it.id}`}>
                {it.productNameSnapshot}
              </label>
              <textarea
                id={`msg-${it.id}`}
                className="input min-h-[70px]"
                value={messages[it.id] ?? ''}
                onChange={(e) => setMessages((p) => ({ ...p, [it.id]: e.target.value }))}
                disabled={busy}
                maxLength={4000}
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-body-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </ModalShell>
  )
}

const LABELS: Record<Mode, string> = {
  pick_from_stock: 'LẤY TỪ KHO',
  manual_key: 'PASTE KEY',
  manual_message: 'NHẬP MESSAGE',
}
const MODE_HINT: Record<Mode, string> = {
  pick_from_stock: 'Dùng khi bạn đã reserve key từ trang Inventory. Nhập UUID từng item.',
  manual_key:
    'Dành cho đơn MANUAL_KEY / INSTANT_AUTO khi muốn paste key thủ công (encrypt trước khi lưu).',
  manual_message:
    'Dành cho đơn MANUAL_MESSAGE / EXTERNAL_INVITE — nhập link invite / nội dung giao.',
}
