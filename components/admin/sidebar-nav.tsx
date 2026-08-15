'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut,
  Home,
  BarChart3,
  Package,
  FolderTree,
  Users,
  Star,
  Ticket,
  Receipt,
  Settings,
  PieChart,
  Activity,
  FileText,
  HelpCircle,
  Bot,
  Zap,
  AlertTriangle,
  Key,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  code: string
}

export const ADMIN_NAV: NavItem[] = [
  { href: '/manage', label: 'Tổng quan', icon: BarChart3, code: '00' },
  { href: '/manage/products', label: 'Sản phẩm', icon: Package, code: '01' },
  { href: '/manage/categories', label: 'Danh mục', icon: FolderTree, code: '02' },
  { href: '/manage/users', label: 'Người dùng', icon: Users, code: '03' },
  { href: '/manage/reviews', label: 'Reviews', icon: Star, code: '04' },
  { href: '/manage/coupons', label: 'Coupons', icon: Ticket, code: '05' },
  { href: '/manage/orders', label: 'Đơn hàng', icon: Receipt, code: '06' },
  { href: '/manage/settings', label: 'Cài đặt', icon: Settings, code: '07' },
  { href: '/manage/reports', label: 'Reports', icon: PieChart, code: '08' },
  { href: '/manage/faq', label: 'FAQ', icon: HelpCircle, code: '09' },
  { href: '/manage/audit', label: 'Audit Logs', icon: FileText, code: '10' },
  { href: '/manage/health', label: 'Health', icon: Activity, code: '11' },
  { href: '/manage/ai/plans', label: 'AI Plans', icon: Bot, code: '12' },
  { href: '/manage/ai/ncc-keys', label: 'AI NCC Keys', icon: Key, code: '13' },
  { href: '/manage/ai/usage', label: 'AI Usage', icon: Zap, code: '14' },
  { href: '/manage/ai/alerts', label: 'AI Alerts', icon: AlertTriangle, code: '15' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/manage') return pathname === '/manage'
  return pathname === href || pathname.startsWith(href + '/')
}

export function AdminSidebarNav() {
  const pathname = usePathname() ?? ''

  return (
    <nav className="flex-1 p-3 space-y-1" aria-label="Admin">
      {ADMIN_NAV.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              'group flex items-center gap-3 px-3 py-2 text-[13px] border-l-2 transition-colors ' +
              (active
                ? 'text-electric border-electric bg-ink-700/50'
                : 'text-ink-100 hover:text-electric hover:bg-ink-700/50 border-transparent hover:border-electric')
            }
          >
            <Icon size={14} strokeWidth={1.5} aria-hidden />
            <span className="flex-1">{item.label}</span>
            <span
              className={
                'text-[9px] font-mono ' +
                (active ? 'text-electric' : 'text-ink-200 group-hover:text-electric')
              }
            >
              /{item.code}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminSidebarFooter() {
  return (
    <div className="p-3 border-t border-ink-400 space-y-2">
      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-2 text-[12px] text-ink-100 hover:text-electric transition-colors"
      >
        <Home size={12} strokeWidth={1.5} aria-hidden />
        Về trang chủ
      </Link>
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-3 py-2 text-[12px] text-ink-100 hover:text-danger transition-colors"
        >
          <LogOut size={12} strokeWidth={1.5} aria-hidden />
          Đăng xuất
        </button>
      </form>
    </div>
  )
}
