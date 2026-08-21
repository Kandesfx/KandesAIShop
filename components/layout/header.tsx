'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Zap, Search, Menu } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { CartButton } from '@/components/cart/cart-button'
import { HeaderAuth } from './header-auth'
import { MobileNav } from './mobile-nav'

interface NavItem {
  href: string
  label: string
  badge?: string
  onClick?: () => void
}

interface NavDropdown {
  label: string
  items: NavItem[]
}

const NAV_ITEMS_MAIN: NavItem[] = [
  { href: '/products', label: 'Sản phẩm' },
  { href: '/docs/api/models', label: 'Models' },
  { href: '/docs/api/getting-started', label: 'Bắt đầu' },
]

const NAV_DROPDOWNS: NavDropdown[] = [
  {
    label: 'Tra cứu',
    items: [
      { href: '/tools/key-checker', label: 'Kiểm tra Key' },
      { href: '/tools/model-checker', label: 'Kiểm tra Models' },
      { href: '/track-order', label: 'Tra cứu đơn hàng' },
    ],
  },
]

const NAV_ITEMS_RIGHT: NavItem[] = [
  { href: '/help/faq', label: 'Hỗ trợ' },
  {
    href: '#',
    label: 'API Studio',
    badge: 'Sắp ra mắt',
    onClick: () => {
      alert('API Studio đang được phát triển và sẽ ra mắt trong thời gian tới!\n\nHãy tham gia group Zalo để nắm bắt tin tức: https://zalo.me/g/kandes')
    },
  },
]

interface HeaderProps {
  currentUser?: {
    id: string
    email: string
    name?: string | null
    avatarUrl?: string | null
    role: string
  } | null
}

export function Header({ currentUser }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null)
  }, [pathname])

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-ink-900/60 backdrop-blur-md border-b border-white/10">
        <div className="container-narrow flex h-16 items-center justify-between gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="hover:opacity-90 transition-opacity"
            aria-label="Kandes — trang chủ"
          >
            <Logo variant="full" size={32} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Chính">
            {NAV_ITEMS_MAIN.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative px-4 py-2 text-[13px] font-medium text-ink-100 hover:text-electric transition-colors"
              >
                {item.label}
                <span className="absolute left-4 right-4 -bottom-0.5 h-px bg-electric scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-fast" />
              </Link>
            ))}

            {/* Dropdowns */}
            <div ref={dropdownRef} className="relative">
              {NAV_DROPDOWNS.map((dropdown) => (
                <div key={dropdown.label} className="inline-block">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === dropdown.label ? null : dropdown.label)}
                    className="group relative px-4 py-2 text-[13px] font-medium text-ink-100 hover:text-electric transition-colors inline-flex items-center gap-1"
                  >
                    {dropdown.label}
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-fast ${openDropdown === dropdown.label ? 'rotate-180' : ''}`}
                    />
                    <span className="absolute left-4 right-4 -bottom-0.5 h-px bg-electric scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-fast" />
                  </button>

                  {/* Dropdown menu */}
                  {openDropdown === dropdown.label && (
                    <div className="absolute top-full left-0 mt-2 w-52 bg-ink-800 border border-ink-400 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      {dropdown.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-4 py-3 text-[13px] text-ink-100 hover:text-electric hover:bg-ink-700/50 transition-colors border-b border-ink-400/50 last:border-0"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right items */}
            {NAV_ITEMS_RIGHT.map((item) =>
              item.onClick ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="group relative px-4 py-2 text-[13px] font-medium text-ink-100 hover:text-electric transition-colors inline-flex items-center gap-1.5"
                >
                  {item.label}
                  {item.badge && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/40">
                      {item.badge}
                    </span>
                  )}
                  <span className="absolute left-4 right-4 -bottom-0.5 h-px bg-electric scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-fast" />
                </button>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative px-4 py-2 text-[13px] font-medium text-ink-100 hover:text-electric transition-colors inline-flex items-center gap-1.5"
                >
                  {item.label}
                  {item.badge && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/40">
                      {item.badge}
                    </span>
                  )}
                  <span className="absolute left-4 right-4 -bottom-0.5 h-px bg-electric scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-fast" />
                </Link>
              )
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-ink-100 hover:text-electric transition-colors"
              aria-label="Mở menu"
            >
              <Menu size={18} strokeWidth={1.5} aria-hidden />
            </button>

            {/* Search */}
            <Link
              href="/products?q="
              className="p-2 text-ink-100 hover:text-electric transition-colors"
              aria-label="Tìm kiếm"
            >
              <Search size={16} strokeWidth={1.5} aria-hidden />
            </Link>

            {/* Cart */}
            <CartButton />

            {/* Auth */}
            <HeaderAuth currentUser={currentUser ?? null} />
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        currentUser={currentUser}
      />
    </>
  )
}
