'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UserDetail {
  id: string
  email: string | null
  phone: string | null
  name: string | null
  avatarUrl: string | null
  role: string
  status: string
  emailVerifiedAt: string | null
  createdAt: string
  lastLoginAt: string | null
  ordersCount: number
  totalSpentCents: number
  reviewsCount: number
}

interface UserDetailClientProps {
  user: UserDetail
  currentAdminId: string
  currentAdminRole: string
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(cents)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Chưa có'
  return new Date(dateStr).toLocaleString('vi-VN')
}

export function UserDetailClient({ user, currentAdminId, currentAdminRole }: UserDetailClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleLockToggle() {
    if (!confirm(user.status === 'active' ? 'Khoá tài khoản này?' : 'Mở khoá tài khoản?')) {
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: user.status === 'active' ? 'locked' : 'active' }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessage({ type: 'success', text: data.data.message })
        router.refresh()
      } else {
        setMessage({ type: 'error', text: data.error.message })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi thực hiện' })
    } finally {
      setLoading(false)
    }
  }

  async function handleImpersonate() {
    if (!confirm('Đăng nhập thay user này?')) return

    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/impersonate`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        // Redirect đến trang đăng nhập với impersonation token
        window.location.href = `/api/auth/impersonate?token=${data.data.impersonationToken}`
      } else {
        setMessage({ type: 'error', text: data.error.message })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi thực hiện' })
    } finally {
      setLoading(false)
    }
  }

  const canLock = user.id !== currentAdminId && user.role !== 'super_admin'
  const canImpersonate = currentAdminRole === 'super_admin'

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`p-3 border rounded ${message.type === 'success' ? 'border-success/50 bg-success/10' : 'border-danger/50 bg-danger/10'}`}>
          <p className={`text-[12px] ${message.type === 'success' ? 'text-success' : 'text-danger'}`}>
            {message.text}
          </p>
        </div>
      )}

      {/* User Info */}
      <div className="border border-ink-400 bg-ink-800/40 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-ink-600 rounded-full flex items-center justify-center text-[24px]">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name ?? 'User'} className="w-full h-full rounded-full object-cover" />
              ) : (
                (user.name ?? 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-[18px] font-display text-ink-50">{user.name}</h2>
              <p className="text-[12px] text-ink-200">{user.email}</p>
              {user.phone && <p className="text-[12px] text-ink-200">{user.phone}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {canLock && (
              <button
                onClick={handleLockToggle}
                className={`btn-sm ${user.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                disabled={loading}
              >
                {user.status === 'active' ? 'Khoá' : 'Mở khoá'}
              </button>
            )}
            {canImpersonate && (
              <button
                onClick={handleImpersonate}
                className="btn-outline text-[11px]"
                disabled={loading}
              >
                Đăng nhập thay
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 flex gap-4">
          <div>
            <span className="text-[10px] text-ink-200">Trạng thái</span>
            <div className="mt-1">
              {user.status === 'active' ? (
                <span className="px-2 py-0.5 rounded bg-success/20 text-success text-[11px] font-mono">Hoạt động</span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-danger/20 text-danger text-[11px] font-mono">Đã khoá</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-ink-200">Vai trò</span>
            <div className="mt-1">
              <span className="px-2 py-0.5 rounded bg-ink-600 text-ink-100 text-[11px] font-mono">
                {user.role.toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-ink-200">Email</span>
            <div className="mt-1">
              {user.emailVerifiedAt ? (
                <span className="px-2 py-0.5 rounded bg-success/20 text-success text-[11px] font-mono">Đã verify</span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-warning/20 text-warning text-[11px] font-mono">Chưa verify</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-ink-400 bg-ink-800/40 p-4 text-center">
          <div className="text-[20px] font-display text-ink-50">{user.ordersCount}</div>
          <div className="text-[10px] text-ink-200 mt-1">Đơn hàng</div>
        </div>
        <div className="border border-ink-400 bg-ink-800/40 p-4 text-center">
          <div className="text-[20px] font-display text-success">{formatCurrency(user.totalSpentCents)}</div>
          <div className="text-[10px] text-ink-200 mt-1">Đã chi</div>
        </div>
        <div className="border border-ink-400 bg-ink-800/40 p-4 text-center">
          <div className="text-[20px] font-display text-ink-50">{user.reviewsCount}</div>
          <div className="text-[10px] text-ink-200 mt-1">Reviews</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border border-ink-400 bg-ink-800/40 p-4">
        <h3 className="text-[12px] font-display text-ink-50 mb-3">Hoạt động</h3>
        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between">
            <span className="text-ink-200">Ngày tạo</span>
            <span className="text-ink-50 font-mono">{formatDate(user.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-200">Đăng nhập cuối</span>
            <span className="text-ink-50 font-mono">{formatDate(user.lastLoginAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
