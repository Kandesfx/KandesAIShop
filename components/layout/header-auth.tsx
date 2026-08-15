'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { User, ChevronDown, LogOut, Package, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CurrentUser {
  id: string
  email: string
  name?: string | null
  avatarUrl?: string | null
  role: string
}

interface HeaderAuthProps {
  currentUser: CurrentUser | null
}

/**
 * Header auth section — logged-out vs logged-in.
 *
 * Server-rendered (no flash) vì currentUser truyền từ app/layout.tsx.
 * Dropdown dùng useState để toggle, không cần external library.
 */
export function HeaderAuth({ currentUser }: HeaderAuthProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Click outside để đóng
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleLogout = async () => {
    setOpen(false)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.refresh()
  }

  if (!currentUser) {
    return (
      <Link
        href="/login"
        className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 border border-ink-300 hover:border-electric hover:text-electric text-[11px] font-mono uppercase tracking-[0.12em] text-ink-100 transition-colors"
        aria-label="Đăng nhập"
      >
        <User size={12} strokeWidth={1.5} aria-hidden />
        <span className="hidden sm:inline">Đăng nhập</span>
      </Link>
    )
  }

  const initials = currentUser.name
    ? currentUser.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : (currentUser.email[0] ?? '?').toUpperCase()

  return (
    <div ref={ref} className="relative ml-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 px-2 py-1.5 border border-ink-300 hover:border-electric text-[11px] font-mono uppercase tracking-[0.12em] text-ink-100 transition-colors"
        aria-label={`Tài khoản: ${currentUser.email}`}
      >
        {currentUser.avatarUrl ? (
          <Image
            src={currentUser.avatarUrl}
            alt=""
            width={20}
            height={20}
            className="w-5 h-5 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span className="w-5 h-5 rounded-full bg-electric/20 text-electric flex items-center justify-center text-[10px] font-bold">
            {initials}
          </span>
        )}
        <span className="hidden sm:inline">{currentUser.name ?? currentUser.email.split('@')[0]}</span>
        <ChevronDown
          size={10}
          className={cn('transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-48 border border-ink-700 bg-ink-900 shadow-xl z-50"
          role="menu"
          aria-label="Tài khoản"
        >
          <div className="px-3 py-2 border-b border-ink-700">
            <p className="text-[11px] text-ink-100 truncate">{currentUser.email}</p>
            {currentUser.name && (
              <p className="text-[10px] text-ink-300 truncate">{currentUser.name}</p>
            )}
          </div>

          <nav className="py-1">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[12px] text-ink-100 hover:text-electric hover:bg-ink-800 transition-colors"
            >
              <User size={12} aria-hidden />
              Tài khoản
            </Link>
            <Link
              href="/account/orders"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[12px] text-ink-100 hover:text-electric hover:bg-ink-800 transition-colors"
            >
              <Package size={12} aria-hidden />
              Đơn hàng
            </Link>
            {currentUser.role === 'super_admin' && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[12px] text-ink-100 hover:text-electric hover:bg-ink-800 transition-colors"
              >
                <Settings size={12} aria-hidden />
                Quản trị
              </Link>
            )}
          </nav>

          <div className="border-t border-ink-700 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-danger hover:bg-ink-800 transition-colors"
            >
              <LogOut size={12} aria-hidden />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
