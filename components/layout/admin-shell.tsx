'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { AdminSidebarNav, AdminSidebarFooter } from '@/components/admin/sidebar-nav'

interface Props {
  userBadge: React.ReactNode
  children: React.ReactNode
}

/**
 * Admin shell — handles both desktop sidebar (lg+) and mobile sheet (md-).
 *
 * Desktop: sidebar pinned on left (260px).
 * Mobile: hamburger top-left → opens full-screen sheet overlay.
 */
export function AdminShell({ userBadge, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div data-admin="true" className="admin-scope admin-layout min-h-screen bg-ink-900 lg:grid lg:grid-cols-[260px_1fr]">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 bg-ink-800/95 backdrop-blur border-b border-ink-400 px-3 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 text-ink-50 hover:text-electric"
          aria-label="Mở menu"
          aria-expanded={open}
          aria-controls="admin-sidebar"
        >
          <Menu size={20} />
        </button>
        <Link href="/manage" className="flex-1">
          <Logo variant="full" size={22} />
        </Link>
      </header>

      {/* Desktop sidebar (always visible on lg+) */}
      <aside
        id="admin-sidebar"
        className="hidden lg:flex lg:flex-col border-r border-ink-400 bg-ink-800/50 lg:sticky lg:top-0 lg:h-screen"
      >
        <DesktopSidebarBrand userBadge={userBadge} />
        <AdminSidebarNav />
        <AdminSidebarFooter />
      </aside>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
            className="flex-1 bg-black/60 backdrop-blur-sm"
          />
          {/* Sheet */}
          <aside className="w-72 max-w-[85vw] bg-ink-800 border-r border-ink-400 flex flex-col">
            <div className="p-3 border-b border-ink-400 flex items-center justify-between">
              <DesktopSidebarBrand userBadge={userBadge} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng menu"
                className="p-1 text-ink-100 hover:text-electric"
              >
                <X size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 text-left"
            >
              <AdminSidebarNav />
            </button>
            <AdminSidebarFooter />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="min-h-screen">{children}</main>
    </div>
  )
}

function DesktopSidebarBrand({ userBadge }: { userBadge: React.ReactNode }) {
  return (
    <div className="p-5 border-b border-ink-400 w-full">
      <Link href="/" className="block hover:opacity-90">
        <Logo variant="full" size={28} />
      </Link>
      {userBadge && <div className="mt-3">{userBadge}</div>}
    </div>
  )
}
