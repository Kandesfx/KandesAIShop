'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type ReportPreset = '7d' | '30d' | '90d' | 'mtd' | 'qtd' | 'ytd' | 'custom'

interface Props {
  preset: ReportPreset
  from?: string
  to?: string
  /** Path to navigate khi filter change. */
  basePath: string
  /** Optional extra inputs trước nút Apply (vd limit). */
  extras?: React.ReactNode
}

/**
 * Filter bar cho reports — share giữa revenue/inventory/top-products.
 * Pure URL-based (searchParams), no client state cho API call.
 */
export function ReportFilters({ preset, from, to, basePath, extras }: Props) {
  const router = useRouter()
  const [p, setP] = useState<ReportPreset>(preset)
  const [f, setF] = useState(from?.slice(0, 10) ?? '')
  const [t, setT] = useState(to?.slice(0, 10) ?? '')

  function apply() {
    const params = new URLSearchParams()
    if (p === 'custom') {
      if (f) params.set('from', `${f}T00:00:00.000Z`)
      if (t) params.set('to', `${t}T23:59:59.999Z`)
    } else {
      params.set('preset', p)
    }
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2 items-end border border-ink-400 bg-ink-800/40 p-3">
      <div>
        <label className="block text-[10px] text-ink-200 mb-1">Khoảng</label>
        <select
          value={p}
          onChange={(e) => setP(e.target.value as ReportPreset)}
          className="input-field text-[12px] min-w-[120px]"
        >
          <option value="7d">7 ngày</option>
          <option value="30d">30 ngày</option>
          <option value="90d">90 ngày</option>
          <option value="mtd">Tháng này</option>
          <option value="qtd">Quý này</option>
          <option value="ytd">Năm nay</option>
          <option value="custom">Tuỳ chỉnh</option>
        </select>
      </div>
      {p === 'custom' && (
        <>
          <div>
            <label className="block text-[10px] text-ink-200 mb-1">Từ</label>
            <input
              type="date"
              value={f}
              onChange={(e) => setF(e.target.value)}
              className="input-field text-[12px]"
            />
          </div>
          <div>
            <label className="block text-[10px] text-ink-200 mb-1">Đến</label>
            <input
              type="date"
              value={t}
              onChange={(e) => setT(e.target.value)}
              className="input-field text-[12px]"
            />
          </div>
        </>
      )}
      {extras}
      <button
        type="button"
        onClick={apply}
        className="btn-primary text-[11px] h-9"
      >
        Áp dụng
      </button>
    </div>
  )
}

export function formatCents(cents: string | number): string {
  const n = typeof cents === 'string' ? BigInt(cents) : BigInt(cents)
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(n))
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('vi-VN')
}
