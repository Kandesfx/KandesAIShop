'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, ShoppingCart, User, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { useCart } from '@/lib/cart-context'
import { useFocusTrap } from '@/lib/use-focus-trap'

interface NavItem {
  href: string
  label: string
  badge?: string
  onClick?: () => void
}

interface NavGroup {
  title?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Sản phẩm',
    items: [
      { href: '/products', label: 'Tất cả sản phẩm' },
      { href: '/products?category=ai-code', label: 'AI Code Tools' },
      { href: '/products?category=ai-chat', label: 'AI Chat' },
      { href: '/products?category=api-credits', label: 'API Credits' },
    ],
  },
  {
    title: 'Tài liệu API',
    items: [
      { href: '/docs/api', label: 'Tổng quan' },
      { href: '/docs/api/getting-started', label: 'Bắt đầu' },
      { href: '/docs/api/models', label: 'Models' },
      { href: '/docs/api/codex', label: 'Codex CLI' },
    ],
  },
  {
    title: 'Tra cứu',
    items: [
      { href: '/tools/key-checker', label: 'Kiểm tra Key' },
      { href: '/tools/model-checker', label: 'Kiểm tra Models' },
      { href: '/track-order', label: 'Tra cứu đơn hàng' },
    ],
  },
  {
    title: 'Hỗ trợ',
    items: [
      { href: '/help/faq', label: 'FAQ' },
      { href: '/help/contact', label: 'Liên hệ' },
    ],
  },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
  currentUser?: {
    email: string
    name?: string | null
  } | null
}

export function MobileNav({ open, onClose, currentUser }: MobileNavProps) {
  const pathname = usePathname()
  const { cart } = useCart()
  const navRef = useFocusTrap<HTMLDivElement>(open)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  // ESC to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Close on route change
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  if (!open) return null

  const cartCount = cart?.itemCount ?? 0

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Điều hướng">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div
        ref={navRef}
        className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-ink-900 border-r border-ink-700 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ink-700">
          <Link href="/" onClick={onClose} aria-label="Kandes — trang chủ">
            <Logo variant="full" size={28} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng menu"
            className="p-1.5 text-ink-300 hover:text-ink-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        {currentUser && (
          <div className="px-4 py-3 border-b border-ink-700 bg-ink-800/50">
            <p className="text-[13px] text-ink-50 font-medium truncate">
              {currentUser.name ?? currentUser.email}
            </p>
            <p className="text-[11px] text-ink-300 truncate">{currentUser.email}</p>
          </div>
        )}

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Di động">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="border-b border-ink-700/50 last:border-0">
              {group.title && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title!)}
                  className="flex items-center justify-between w-full px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-200 hover:text-ink-50 transition-colors"
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${expandedGroups.includes(group.title!) ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
              {(!group.title || expandedGroups.includes(group.title)) && (
                <div className="pb-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-2 px-4 py-2.5 text-[14px] text-ink-100 hover:text-electric hover:bg-ink-800 transition-colors"
                    >
                      {item.label}
                      {item.badge && (
                        <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={14} className="ml-auto text-ink-300" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* API Studio - Coming Soon */}
          <div className="px-4 py-3 mt-2">
            <button
              type="button"
              onClick={() => {
                alert('API Studio đang được phát triển và sẽ ra mắt trong thời gian tới!\n\nHãy tham gia group Zalo để nắm bắt tin tức: https://zalo.me/g/kandes')
              }}
              className="flex items-center gap-2 w-full px-4 py-3 text-[14px] text-ink-100 bg-ink-800/50 border border-ink-400/50 rounded-xl hover:bg-ink-800 transition-colors"
            >
              <AlertCircle size={16} className="text-amber-400" />
              <span>API Studio</span>
              <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                Sắp ra mắt
              </span>
            </button>
          </div>

          {/* Cart link */}
          <Link
            href="/cart"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 text-[14px] text-ink-100 hover:text-electric hover:bg-ink-800 transition-colors border-t border-ink-700 mt-2"
          >
            <ShoppingCart size={16} aria-hidden />
            Giỏ hàng
            {cartCount > 0 && (
              <span className="ml-auto bg-electric text-ink-900 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-sm">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Auth */}
          {currentUser ? (
            <>
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-[14px] text-ink-100 hover:text-electric hover:bg-ink-800 transition-colors"
              >
                <User size={16} aria-hidden />
                Tài khoản
              </Link>
              <Link
                href="/account/orders"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-[14px] text-ink-100 hover:text-electric hover:bg-ink-800 transition-colors"
              >
                Đơn hàng
              </Link>
            </>
          ) : (
            <Link
              href="/auth/login"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-[14px] text-ink-100 hover:text-electric hover:bg-ink-800 transition-colors"
            >
              <User size={16} aria-hidden />
              Đăng nhập
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-ink-700 text-[10px] font-mono text-ink-300">
          Kandes.shop · Made with ♥
        </div>
      </div>
    </div>
  )
}
