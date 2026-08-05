import Link from 'next/link'
import { Search, User } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { CartButton } from '@/components/cart/cart-button'

const NAV_ITEMS = [
  { href: '/products', label: 'Sản phẩm' },
  { href: '/products?category=ai-code', label: 'AI Code' },
  { href: '/products?category=ai-chat', label: 'AI Chat' },
  { href: '/help/faq', label: 'Hỗ trợ' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-ink-900/85 backdrop-blur-sm border-b border-ink-400">
      {/* Top bar — version/meta nhỏ */}
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
        <Link
          href="/"
          className="hover:opacity-90 transition-opacity"
          aria-label="Kandes — trang chủ"
        >
          <Logo variant="full" size={32} />
        </Link>

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

        <div className="flex items-center gap-1">
          <Link
            href="/products?q="
            className="p-2 text-ink-100 hover:text-electric transition-colors"
            aria-label="Tìm kiếm"
          >
            <Search size={16} strokeWidth={1.5} aria-hidden />
          </Link>
          <CartButton />
          <Link
            href="/auth/login"
            className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 border border-ink-300 hover:border-electric hover:text-electric text-[11px] font-mono uppercase tracking-[0.12em] text-ink-100 transition-colors"
            aria-label="Đăng nhập"
          >
            <User size={12} strokeWidth={1.5} aria-hidden />
            <span className="hidden sm:inline">Đăng nhập</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
