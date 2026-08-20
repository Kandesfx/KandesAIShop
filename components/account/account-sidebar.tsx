'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Settings, ShoppingBag, Database, Heart, Bell } from 'lucide-react'
import { LogoutButton } from './logout-button'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  /** Nếu true, chỉ active khi pathname === href (không bắt đầu bằng). */
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/account', label: 'Hồ sơ', icon: <User size={14} />, exact: true },
  { href: '/account/orders', label: 'Đơn hàng', icon: <ShoppingBag size={14} /> },
  { href: '/account/wishlist', label: 'Đã lưu', icon: <Heart size={14} /> },
  { href: '/account/settings', label: 'Cài đặt', icon: <Settings size={14} />, exact: true },
  {
    href: '/account/settings/notifications',
    label: 'Thông báo',
    icon: <Bell size={14} />,
    exact: true,
  },
  { href: '/account/data', label: 'Dữ liệu', icon: <Database size={14} /> },
]

interface AccountSidebarProps {
  user: {
    name?: string | null
    email: string
  }
}

/**
 * AccountSidebar — client component để có active route highlight.
 * Mounted bởi app/account/layout.tsx (server component).
 */
export function AccountSidebar({ user }: AccountSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="space-y-1 lg:sticky lg:top-6 lg:self-start">
      <div className="px-3 py-3 mb-3 border border-ink-400 bg-ink-800">
        <p className="text-[10px] font-mono text-ink-200 uppercase tracking-[0.15em]">
          Tài khoản
        </p>
        <p className="text-body font-display mt-1 truncate">{user.name || user.email}</p>
        <p className="text-[11px] text-ink-200 truncate">{user.email}</p>
      </div>

      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/')

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'block px-3 py-2 text-body-sm transition-colors flex items-center gap-2 border-l-2',
              isActive
                ? 'text-electric bg-electric/5 border-l-electric font-medium'
                : 'text-ink-100 hover:text-electric hover:bg-ink-800 border-l-transparent'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        )
      })}

      <div className="pt-2">
        <LogoutButton />
      </div>
    </aside>
  )
}