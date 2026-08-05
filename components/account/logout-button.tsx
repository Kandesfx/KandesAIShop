'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'

/**
 * Logout current session.
 *
 * POST /api/auth/logout → redirect về homepage.
 * Dùng client component để browser điều hướng đúng (server form POST chỉ trả JSON).
 */
export function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    setBusy(true)
    try {
      await api.post('/api/auth/logout', {})
    } catch (e) {
      const error = e as ApiError
      console.error('Logout error:', error.message)
    } finally {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full text-left px-3 py-2 text-body-sm text-ink-100 hover:text-danger hover:bg-ink-800 transition-colors flex items-center gap-2 disabled:opacity-50"
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" aria-hidden />
      ) : (
        <LogOut size={14} aria-hidden />
      )}
      <span>{busy ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
    </button>
  )
}
