'use client'

import { useState } from 'react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  phone: string | null
  name: string
  avatarUrl: string | null
  role: string
  status: string
  emailVerifiedAt: string | null
  createdAt: string
  lastLoginAt: string | null
}

interface UsersListProps {
  initialData: {
    users: User[]
    page: number
    total: number
    hasMore: boolean
  }
}

function statusBadge(status: string) {
  return status === 'active' ? (
    <span className="px-2 py-0.5 rounded bg-success/20 text-success text-[11px] font-mono">
      Hoạt động
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded bg-danger/20 text-danger text-[11px] font-mono">
      Đã khoá
    </span>
  )
}

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    customer: 'bg-ink-600 text-ink-100',
    staff: 'bg-electric/20 text-electric',
    admin: 'bg-warning/20 text-warning',
    super_admin: 'bg-danger/20 text-danger',
  }
  const labels: Record<string, string> = {
    customer: 'Khách',
    staff: 'Staff',
    admin: 'Admin',
    super_admin: 'Super',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${colors[role] ?? 'bg-ink-600 text-ink-100'}`}>
      {labels[role] ?? role}
    </span>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

export function UsersList({ initialData }: UsersListProps) {
  const [users, setUsers] = useState(initialData.users)
  const [page, setPage] = useState(initialData.page)
  const [hasMore, setHasMore] = useState(initialData.hasMore)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (data.ok) {
        setUsers(data.data.users)
        setPage(1)
        setHasMore(data.data.hasMore)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?page=${page + 1}&search=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (data.ok) {
        setUsers([...users, ...data.data.users])
        setPage(page + 1)
        setHasMore(data.data.hasMore)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo email, tên, SĐT..."
          className="input-field flex-1"
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          Tìm
        </button>
        {search && (
          <Link href="/manage/users" className="btn-outline">
            Reset
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="border border-ink-400 bg-ink-800/40 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[11px] text-ink-100 font-mono uppercase bg-ink-700/50">
              <th className="text-left p-3">Người dùng</th>
              <th className="text-left p-3">Liên hệ</th>
              <th className="text-left p-3">Vai trò</th>
              <th className="text-left p-3">Trạng thái</th>
              <th className="text-left p-3">Ngày tạo</th>
              <th className="text-right p-3">Đăng nhập cuối</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-400/30">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-ink-700/30">
                <td className="p-3">
                  <Link href={`/manage/users/${u.id}`} className="text-ink-50 hover:text-electric">
                    {u.name}
                  </Link>
                </td>
                <td className="p-3 text-ink-100">
                  {u.email}
                  {u.phone && <div className="text-[11px]">{u.phone}</div>}
                </td>
                <td className="p-3">
                  {roleBadge(u.role)}
                </td>
                <td className="p-3">
                  {statusBadge(u.status)}
                </td>
                <td className="p-3 text-ink-100 font-mono text-[11px]">
                  {formatDate(u.createdAt)}
                </td>
                <td className="p-3 text-right text-ink-100 font-mono text-[11px]">
                  {formatDate(u.lastLoginAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={loadMore}
            className="btn-outline text-[12px]"
            disabled={loading}
          >
            {loading ? 'Đang tải...' : 'Tải thêm'}
          </button>
        </div>
      )}

      {/* Stats */}
      <p className="text-[11px] text-ink-100 font-mono text-center">
        Tổng cộng: {initialData.total} người dùng
      </p>
    </div>
  )
}
