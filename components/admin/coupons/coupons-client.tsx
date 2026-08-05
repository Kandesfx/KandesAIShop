'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Coupon {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  minOrderCents: string
  maxDiscountCents: string | null
  maxUses: number | null
  usedCount: number
  maxUsesPerUser: number
  startsAt: string
  expiresAt: string
  isActive: boolean
}

interface CouponsClientProps {
  initialCoupons: Coupon[]
  total: number
}

function formatCurrency(cents: string | number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(cents))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

function statusBadge(isActive: boolean, expiresAt: string) {
  const now = new Date()
  const expired = new Date(expiresAt) < now
  if (expired) {
    return <span className="px-2 py-0.5 rounded bg-ink-600 text-ink-200 text-[10px] font-mono">Hết hạn</span>
  }
  return isActive ? (
    <span className="px-2 py-0.5 rounded bg-success/20 text-success text-[10px] font-mono">Active</span>
  ) : (
    <span className="px-2 py-0.5 rounded bg-warning/20 text-warning text-[10px] font-mono">Inactive</span>
  )
}

function typeBadge(type: string, value: number) {
  return type === 'percent' ? (
    <span className="text-electric">{value}%</span>
  ) : (
    <span className="text-success">{formatCurrency(value)}</span>
  )
}

export function CouponsClient({ initialCoupons, total }: CouponsClientProps) {
  const router = useRouter()
  const [coupons, setCoupons] = useState(initialCoupons)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)

  async function handleDelete(couponId: string) {
    if (!confirm('Xoá coupon này?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, { method: 'DELETE' })
      if (res.ok) {
        setCoupons(coupons.filter((c) => c.id !== couponId))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(coupon: Coupon) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      })
      if (res.ok) {
        setCoupons(coupons.map((c) => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-between items-center">
        <p className="text-[11px] text-ink-200 font-mono">{total} coupons</p>
        <button
          onClick={() => { setEditingCoupon(null); setShowModal(true) }}
          className="btn-primary text-[11px]"
        >
          + Thêm coupon
        </button>
      </div>

      {/* Table */}
      {coupons.length === 0 ? (
        <div className="border border-ink-400 bg-ink-800/40 p-8 text-center">
          <p className="text-[12px] text-ink-200">Chưa có coupon nào</p>
        </div>
      ) : (
        <div className="border border-ink-400 bg-ink-800/40 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] text-ink-200 font-mono uppercase bg-ink-700/50">
                <th className="text-left p-3">Mã</th>
                <th className="text-left p-3">Loại</th>
                <th className="text-left p-3">Min đơn</th>
                <th className="text-left p-3">Sử dụng</th>
                <th className="text-left p-3">Hết hạn</th>
                <th className="text-left p-3">Trạng thái</th>
                <th className="text-right p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-400/30">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-ink-700/30">
                  <td className="p-3 font-mono font-bold text-electric">{coupon.code}</td>
                  <td className="p-3">{typeBadge(coupon.type, coupon.value)}</td>
                  <td className="p-3 text-ink-200">{formatCurrency(coupon.minOrderCents)}</td>
                  <td className="p-3 text-ink-200">
                    {coupon.usedCount} / {coupon.maxUses ?? '∞'}
                  </td>
                  <td className="p-3 text-ink-200 font-mono text-[10px]">
                    {formatDate(coupon.expiresAt)}
                  </td>
                  <td className="p-3">{statusBadge(coupon.isActive, coupon.expiresAt)}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        className="text-[10px] text-ink-200 hover:text-electric"
                        disabled={loading}
                      >
                        {coupon.isActive ? 'Tắt' : 'Bật'}
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="text-[10px] text-ink-200 hover:text-danger"
                        disabled={loading}
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

      {/* Simple modal for create */}
      {showModal && (
        <CouponModal
          coupon={editingCoupon}
          onClose={() => setShowModal(false)}
          onSave={(newCoupon) => {
            if (editingCoupon) {
              setCoupons(coupons.map((c) => c.id === newCoupon.id ? newCoupon : c))
            } else {
              setCoupons([newCoupon, ...coupons])
            }
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

// Simple modal component
function CouponModal({ coupon, onClose, onSave }: {
  coupon: Coupon | null
  onClose: () => void
  onSave: (c: Coupon) => void
}) {
  const [form, setForm] = useState({
    code: coupon?.code ?? '',
    type: coupon?.type ?? 'percent',
    value: coupon?.value ?? 10,
    minOrderCents: coupon?.minOrderCents ?? '100000',
    maxUses: coupon?.maxUses ?? '',
    expiresAt: coupon?.expiresAt ? coupon.expiresAt.slice(0, 16) : '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(coupon ? `/api/admin/coupons/${coupon.id}` : '/api/admin/coupons', {
        method: coupon ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          minOrderCents: BigInt(form.minOrderCents),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          startsAt: new Date().toISOString(),
          expiresAt: new Date(form.expiresAt).toISOString(),
        }),
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-ink-800 border border-ink-400 p-6 w-full max-w-md">
        <h3 className="text-[14px] font-display text-ink-50 mb-4">
          {coupon ? 'Sửa coupon' : 'Tạo coupon mới'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] text-ink-200 mb-1">Mã</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="input-field w-full"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-ink-200 mb-1">Loại</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })}
                className="input-field w-full"
              >
                <option value="percent">Phần trăm (%)</option>
                <option value="fixed">Cố định (VND)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-ink-200 mb-1">Giá trị</label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                className="input-field w-full"
                required
                min={1}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-ink-200 mb-1">Đơn tối thiểu (VND)</label>
              <input
                type="number"
                value={form.minOrderCents}
                onChange={(e) => setForm({ ...form, minOrderCents: e.target.value })}
                className="input-field w-full"
                required
                min={0}
              />
            </div>
            <div>
              <label className="block text-[11px] text-ink-200 mb-1">Số lần dùng (∞ nếu không giới hạn)</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="input-field w-full"
                placeholder="∞"
                min={1}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-ink-200 mb-1">Hết hạn</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="input-field w-full"
              required
            />
          </div>
          {error && <p className="text-[11px] text-danger">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-outline text-[11px]">Huỷ</button>
            <button type="submit" className="btn-primary text-[11px]" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
