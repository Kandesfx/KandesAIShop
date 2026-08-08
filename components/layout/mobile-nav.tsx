'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, ShoppingCart, User } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { useCart } from '@/lib/cart-context'
import { useFocusTrap } from '@/lib/use-focus-trap'

interface NavItem {
  href: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/products', label: 'Sản phẩm' },
  { href: '/docs/api', label: 'Tài liệu API' },
  { href: '/tools/key-checker', label: 'Kiểm tra Key' },
  { href: '/track-order', label: 'Tra cứu đơn' },
  { href: '/help/faq', label: 'Hỗ trợ' },
  { href: '/help/contact', label: 'Liên hệ' },
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

  // ESC để đóng
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
        className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-ink-900 border-r border-ink-700 flex flex-col"
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Di động">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '?')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={[
                  'flex items-center gap-3 px-4 py-3 text-[14px] transition-colors',
                  active
                    ? 'text-electric font-medium border-l-2 border-l-electric bg-electric/5'
                    : 'text-ink-100 hover:text-electric hover:bg-ink-800',
                ].join(' ')}
              >
                {item.label}
              </Link>
            )
          })}

          {/* Cart link */}
          <Link
            href="/cart"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 text-[14px] text-ink-100 hover:text-electric hover:bg-ink-800 transition-colors"
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
          v0.1.0 · Kandes.shop
        </div>
      </div>
    </div>
  )
}
