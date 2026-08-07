'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Menu } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { CartButton } from '@/components/cart/cart-button'
import { HeaderAuth } from './header-auth'
import { MobileNav } from './mobile-nav'
import { NavLink } from './nav-link'

const NAV_ITEMS = [
  { href: '/products', label: 'Sản phẩm' },
  { href: '/products?category=ai-code', label: 'AI Code' },
  { href: '/products?category=ai-chat', label: 'AI Chat' },
  { href: '/help/faq', label: 'Hỗ trợ' },
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
      <header className="sticky top-0 z-50 w-full bg-ink-900/85 backdrop-blur-sm border-b border-ink-400">
        {/* Top bar */}
        <div className="border-b border-ink-400/60">
          <div className="container-narrow flex items-center justify-between py-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-200">
            <span className="hidden sm:inline">v0.1.0 · SYS.ONLINE</span>
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-electric animate-pulse-dot" aria-hidden />
              NODE:ASIA-SG
            </span>
            <Link href="/help/contact" className="hover:text-electric transition-colors">
              Liên hệ →
            </Link>
          </div>
        </div>

        {/* Main nav */}
        <div className="container-narrow flex h-16 items-center justify-between gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="hover:opacity-90 transition-opacity flex-shrink-0"
            aria-label="Kandes — trang chủ"
          >
            <Logo variant="full" size={32} />
          </Link>

          {/* Desktop nav — ẩn dưới lg (1024px) thay vì md (768px) để
              tránh overflow ở tablet portrait + mobile landscape.
              Trên mobile thuần (<lg), hamburger button đảm nhận nav. */}
          <nav className="hidden lg:flex items-center" aria-label="Chính">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Mobile hamburger — hiển thị dưới lg */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-ink-100 hover:text-electric transition-colors"
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
