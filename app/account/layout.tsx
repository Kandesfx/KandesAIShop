import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { User, Settings, ShoppingBag, Key, Database } from 'lucide-react'
import { LogoutButton } from '@/components/account/logout-button'

export const dynamic = 'force-dynamic'

/**
 * Layout cho customer area (/account/*). Yêu cầu auth.
 * Sidebar đơn giản với 3 mục chính.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }
  if (!user) redirect('/auth/login?next=/account')

  return (
    <div className="min-h-screen bg-ink-900">
      <div className="container-wide py-8">
        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="space-y-1 lg:sticky lg:top-6 lg:self-start">
            <div className="px-3 py-3 mb-3 border border-ink-400 bg-ink-800">
              <p className="text-[10px] font-mono text-ink-200 uppercase tracking-[0.15em]">
                Tài khoản
              </p>
              <p className="text-body font-display mt-1 truncate">{user.name || user.email}</p>
              <p className="text-[11px] text-ink-200 truncate">{user.email}</p>
            </div>

            <NavItem href="/account" icon={<User size={14} />} label="Hồ sơ" exact />
            <NavItem href="/account/api-keys" icon={<Key size={14} />} label="API Keys" />
            <NavItem href="/account/orders" icon={<ShoppingBag size={14} />} label="Đơn hàng" />
            <NavItem href="/account/settings" icon={<Settings size={14} />} label="Cài đặt" />
            <NavItem href="/account/settings/notifications" icon={<Settings size={14} />} label="Thông báo" />
            <NavItem href="/account/data" icon={<Database size={14} />} label="Dữ liệu" />

            <div className="pt-2">
              <LogoutButton />
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}

function NavItem({
  href,
  icon,
  label,
  exact,
}: {
  href: string
  icon: React.ReactNode
  label: string
  exact?: boolean
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 text-body-sm text-ink-100 hover:text-electric hover:bg-ink-800 transition-colors flex items-center gap-2"
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
