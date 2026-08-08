'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Menu } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { CartButton } from '@/components/cart/cart-button'
import { HeaderAuth } from './header-auth'
import { MobileNav } from './mobile-nav'

const NAV_ITEMS = [
  { href: '/products', label: 'Sản phẩm' },
  { href: '/docs/api', label: 'Tài liệu API' },
  { href: '/tools/key-checker', label: 'Kiểm tra Key' },
  { href: '/track-order', label: 'Tra cứu đơn' },
  { href: '/help/faq', label: 'Hỗ trợ' },
  { href: '/help/contact', label: 'Liên hệ' },
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

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-ink-900/60 backdrop-blur-md border-b border-white/10">
        {/* Main nav */}
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
          <nav className="hidden md:flex items-center" aria-label="Chính">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative px-4 py-2 text-[13px] font-medium text-ink-100 hover:text-electric transition-colors"
              >
                {item.label}
                <span className="absolute left-4 right-4 -bottom-0.5 h-px bg-electric scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-fast" />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-ink-100 hover:text-electric transition-colors"
              aria-label="Mở menu"
              aria-expanded={mobileOpen}
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
