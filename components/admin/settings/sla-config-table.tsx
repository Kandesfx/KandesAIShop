'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  SlaConfigView,
  CreateSlaConfigInput,
  SlaChannel,
} from '@/modules/sla'

interface Props {
  initialConfigs: SlaConfigView[]
}

const SCOPE_LABELS: Record<string, string> = {
  global: 'Toàn cục',
  category: 'Theo danh mục',
  product: 'Theo sản phẩm',
}

const DELIVERY_LABELS: Record<string, string> = {
  INSTANT_AUTO: 'Giao tự động',
  MANUAL_KEY: 'Cấp trực tiếp',
  MANUAL_MESSAGE: 'Hỗ trợ trực tiếp',
  FILE_DOWNLOAD: 'Tải file',
  TOPUP: 'Nạp credit',
  EXTERNAL_INVITE: 'Mời ngoài',
}

export function SlaConfigTable({ initialConfigs }: Props) {
  const router = useRouter()
  const [configs, setConfigs] = useState(initialConfigs)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SlaConfigView | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Xoá SlaConfig này?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/sla-configs/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConfigs(configs.filter((c) => c.id !== id))
        router.refresh()
      }
    } finally {
      setDeleting(null)
    }
  }

  async function handleToggleActive(c: SlaConfigView) {
    const res = await fetch(`/api/admin/sla-configs/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    })
    if (res.ok) {
      const data = await res.json()
      setConfigs(configs.map((x) => (x.id === c.id ? data.data : x)))
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-[12px] text-ink-100 font-mono">{configs.length} configs</p>
        <button
          onClick={() => {
            setEditing(null)
            setShowModal(true)
          }}
          className="btn-primary text-[12px]"
        >
          + Tạo SlaConfig
        </button>
      </div>

      {configs.length === 0 ? (
        <div className="border border-ink-400 bg-ink-800/40 p-8 text-center">
          <p className="text-[13px] text-ink-100">Chưa có SlaConfig nào.</p>
          <p className="text-[11px] text-ink-100 mt-1">
            Global defaults lấy từ tab Settings → SLA (sla.*).
          </p>
        </div>
      ) : (
        <div className="border border-ink-400 bg-ink-800/40 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] text-ink-100 font-mono uppercase bg-ink-700/50">
                <th className="text-left p-3">Scope</th>
                <th className="text-left p-3">Delivery</th>
                <th className="text-left p-3">T1 / T2 / T3 (phút)</th>
                <th className="text-left p-3">Auto-cancel</th>
                <th className="text-left p-3">Trạng thái</th>
                <th className="text-right p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-400/30">
              {configs.map((c) => (
                <tr key={c.id} className="hover:bg-ink-700/30">
                  <td className="p-3">
                    <span className="text-electric font-mono">{SCOPE_LABELS[c.scopeType]}</span>
                    {c.scopeType === 'product' && c.productName && (
                      <p className="text-[11px] text-ink-100 mt-0.5">{c.productName}</p>
                    )}
                  </td>
                  <td className="p-3 text-ink-100">
                    {DELIVERY_LABELS[c.deliveryStrategy]}
                  </td>
                  <td className="p-3 text-ink-100 font-mono text-[12px]">
                    {c.threshold1Minutes} / {c.threshold2Minutes} / {c.threshold3Minutes}
                  </td>
                  <td className="p-3 text-ink-100 font-mono text-[12px]">
                    {c.autoCancelAtMinutes ?? '—'}
                  </td>
                  <td className="p-3">
                    {c.isActive ? (
                      <span className="px-2 py-0.5 rounded bg-success/20 text-success text-[11px] font-mono">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-ink-600 text-ink-100 text-[11px] font-mono">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className="text-[11px] text-ink-100 hover:text-electric"
                        disabled={deleting === c.id}
                      >
                        {c.isActive ? 'Tắt' : 'Bật'}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(c)
                          setShowModal(true)
                        }}
                        className="text-[11px] text-ink-100 hover:text-electric"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-[11px] text-ink-100 hover:text-danger"
                        disabled={deleting === c.id}
                      >
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <SlaConfigModal
          config={editing}
          onClose={() => setShowModal(false)}
          onSave={(saved) => {
            if (editing) {
              setConfigs(configs.map((c) => (c.id === saved.id ? saved : c)))
            } else {
              setConfigs([saved, ...configs])
            }
            setShowModal(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

const ALL_CHANNELS: SlaChannel[] = ['email', 'telegram', 'zalo', 'sms', 'voice']

function SlaConfigModal({
  config,
  onClose,
  onSave,
}: {
  config: SlaConfigView | null
  onClose: () => void
  onSave: (c: SlaConfigView) => void
}) {
  const [form, setForm] = useState<Partial<CreateSlaConfigInput>>({
    scopeType: config?.scopeType ?? 'global',
    deliveryStrategy: config?.deliveryStrategy ?? 'MANUAL_KEY',
    threshold1Minutes: config?.threshold1Minutes ?? 30,
    threshold1Channels: config?.threshold1Channels ?? ['email', 'telegram'],
    threshold2Minutes: config?.threshold2Minutes ?? 60,
    threshold2Channels: config?.threshold2Channels ?? [
      'email',
      'telegram',
      'zalo',
    ],
    threshold3Minutes: config?.threshold3Minutes ?? 120,
    threshold3Channels: config?.threshold3Channels ?? [
      'email',
      'telegram',
      'zalo',
      'voice',
    ],
    autoCancelAtMinutes: config?.autoCancelAtMinutes ?? null,
    isActive: config?.isActive ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleChannel(level: 1 | 2 | 3, ch: SlaChannel) {
    const key =
      level === 1
        ? 'threshold1Channels'
        : level === 2
          ? 'threshold2Channels'
          : 'threshold3Channels'
    const cur = (form[key] as SlaChannel[]) ?? []
    const next = cur.includes(ch) ? cur.filter((c) => c !== ch) : [...cur, ch]
    setForm({ ...form, [key]: next })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = config
        ? `/api/admin/sla-configs/${config.id}`
        : '/api/admin/sla-configs'
      const method = config ? 'PUT' : 'POST'
      const body: Record<string, unknown> = {
        ...form,
        scopeId: form.scopeType === 'global' ? null : form.scopeId ?? null,
        productId: form.scopeType === 'product' ? form.productId ?? null : null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ok) {
        onSave(data.data)
      } else {
        setError(data.error?.message ?? 'Lỗi')
      }
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-ink-800 border border-ink-400 p-6 w-full max-w-2xl my-8">
        <h3 className="text-[14px] font-display text-ink-50 mb-4">
          {config ? 'Sửa SlaConfig' : 'Tạo SlaConfig mới'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] text-ink-100 mb-1">Scope</label>
              <select
                value={form.scopeType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    scopeType: e.target.value as CreateSlaConfigInput['scopeType'],
                  })
                }
                className="input-field w-full"
                disabled={!!config}
              >
                <option value="global">Toàn cục</option>
                <option value="category">Theo danh mục</option>
                <option value="product">Theo sản phẩm</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-ink-100 mb-1">
                Delivery strategy
              </label>
              <select
                value={form.deliveryStrategy}
                onChange={(e) =>
                  setForm({
                    ...form,
                    deliveryStrategy: e.target
                      .value as CreateSlaConfigInput['deliveryStrategy'],
                  })
                }
                className="input-field w-full"
              >
                {Object.entries(DELIVERY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Thresholds */}
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              className="border border-ink-400/50 p-3 space-y-2"
            >
              <p className="text-[12px] font-mono uppercase tracking-wide text-electric">
                Ngưỡng {level}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-ink-100 mb-1">
                    Phút
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={
                      form[
                        level === 1
                          ? 'threshold1Minutes'
                          : level === 2
                            ? 'threshold2Minutes'
                            : 'threshold3Minutes'
                      ] ?? 0
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [level === 1
                          ? 'threshold1Minutes'
                          : level === 2
                            ? 'threshold2Minutes'
                            : 'threshold3Minutes']: Number(e.target.value),
                      })
                    }
                    className="input-field w-full text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-ink-100 mb-1">
                    Kênh
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {ALL_CHANNELS.map((ch) => {
                      const checked = (
                        form[
                          level === 1
                            ? 'threshold1Channels'
                            : level === 2
                              ? 'threshold2Channels'
                              : 'threshold3Channels'
                        ] as SlaChannel[] | undefined
                      )?.includes(ch)
                      return (
                        <label
                          key={ch}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-ink-400 text-[11px] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={!!checked}
                            onChange={() =>
                              toggleChannel(level as 1 | 2 | 3, ch)
                            }
                            className="w-3 h-3 accent-electric"
                          />
                          <span>{ch}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] text-ink-100 mb-1">
                Auto-cancel (phút, optional)
              </label>
              <input
                type="number"
                min={1}
                value={form.autoCancelAtMinutes ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    autoCancelAtMinutes: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                className="input-field w-full text-[13px]"
                placeholder="Không auto-cancel"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ink-100 mb-1">
                Trạng thái
              </label>
              <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="w-4 h-4 accent-electric"
                />
                <span className="text-[12px] text-ink-100">Active</span>
              </label>
            </div>
          </div>

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <div className="flex gap-2 justify-end pt-2 border-t border-ink-400">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline text-[12px]"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="btn-primary text-[12px]"
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : config ? 'Cập nhật' : 'Tạo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
