import Link from 'next/link'
import {
  LogOut,
  Package,
  FolderTree,
  Home,
  BarChart3,
  Users,
  Star,
  Ticket,
  Receipt,
  Settings,
  PieChart,
  Activity,
  FileText,
  HelpCircle,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { getCurrentUser } from '@/lib/auth'

/**
 * Admin layout — UI shell (sidebar + main content).
 * Auth guard đã được check ở (admin)/layout.tsx (route group).
 *
 * Path: app/(admin)/admin/layout.tsx
 * Group (admin) ngăn root layout render Header/Footer cho các trang admin.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }

  const NAV = [
    { href: '/admin', label: 'Tổng quan', icon: BarChart3, code: '00' },
    { href: '/admin/products', label: 'Sản phẩm', icon: Package, code: '01' },
    { href: '/admin/categories', label: 'Danh mục', icon: FolderTree, code: '02' },
    { href: '/admin/users', label: 'Người dùng', icon: Users, code: '03' },
    { href: '/admin/reviews', label: 'Reviews', icon: Star, code: '04' },
    { href: '/admin/coupons', label: 'Coupons', icon: Ticket, code: '05' },
    { href: '/admin/orders', label: 'Đơn hàng', icon: Receipt, code: '06' },
    { href: '/admin/settings', label: 'Cài đặt', icon: Settings, code: '07' },
    { href: '/admin/reports', label: 'Reports', icon: PieChart, code: '08' },
    { href: '/admin/faq', label: 'FAQ', icon: HelpCircle, code: '09' },
    { href: '/admin/audit', label: 'Audit Logs', icon: FileText, code: '10' },
    { href: '/admin/health', label: 'Health', icon: Activity, code: '11' },
  ]

  return (
    <div className="min-h-screen bg-ink-900 grid grid-cols-1 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="border-r border-ink-400 bg-ink-800/50 lg:sticky lg:top-0 lg:h-screen flex flex-col">
        <div className="p-5 border-b border-ink-400">
          <Link href="/" className="block hover:opacity-90">
            <Logo variant="full" size={28} />
          </Link>
          {user && (
            <span className="mt-3 inline-block tech-tag">
              <span>ADMIN · {user.role.toUpperCase()}</span>
            </span>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Admin">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 px-3 py-2 text-[13px] text-ink-100 hover:text-electric hover:bg-ink-700/50 border-l-2 border-transparent hover:border-electric transition-colors"
              >
                <Icon size={14} strokeWidth={1.5} aria-hidden />
                <span className="flex-1">{item.label}</span>
                <span className="text-[9px] font-mono text-ink-200 group-hover:text-electric">
                  /{item.code}
                </span>
              </Link>
            )
          })}
        </nav>

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
      </aside>

      {/* Main */}
      <main className="min-h-screen">{children}</main>
    </div>
  )
}
