import Link from 'next/link'
import { Github, Mail, MessageCircle, Heart } from 'lucide-react'
import { Logo } from '@/components/brand/logo'

const COLUMNS = [
  {
    title: 'Sản phẩm',
    links: [
      { href: '/products?category=ai-code', label: 'AI Code Tools' },
      { href: '/products?category=ai-chat', label: 'AI Chat' },
      { href: '/products?category=api-credits', label: 'API Credits' },
      { href: '/products', label: 'Tất cả →' },
    ],
  },
  {
    title: 'API & Tài liệu',
    links: [
      { href: '/docs/api', label: 'Kandes API' },
      { href: '/docs/api/getting-started', label: 'Bắt đầu' },
      { href: '/docs/api/codex', label: 'Codex CLI' },
      { href: '/docs/api/models', label: 'Models' },
      { href: '/tools/model-checker', label: 'Kiểm tra Models' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { href: '/help/faq', label: 'FAQ' },
      { href: '/track-order', label: 'Tra cứu đơn hàng' },
      { href: '/help/contact', label: 'Liên hệ' },
    ],
  },
  {
    title: 'Pháp lý',
    links: [
      { href: '/legal/terms', label: 'Điều khoản' },
      { href: '/legal/privacy', label: 'Bảo mật' },
      { href: '/legal/refund-policy', label: 'Hoàn tiền' },
    ],
  },
]

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-32 border-t border-ink-400 bg-ink-900">
      <div className="container-narrow py-16">
        {/* Top: brand + tagline + ctas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-12 border-b border-ink-400">
          <div className="lg:col-span-5 space-y-6">
            <Logo variant="full" size={36} />
            <p className="text-[15px] text-ink-100 max-w-sm leading-relaxed">
              Năng lượng cho lập trình viên. Công cụ AI coding chính hãng, giao tự động qua
              email trong 30 giây.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 border border-ink-300 hover:border-electric hover:text-electric transition-colors"
                aria-label="GitHub"
              >
                <Github size={16} strokeWidth={1.5} aria-hidden />
              </a>
              <a
                href="mailto:support@kandes.shop"
                className="p-2.5 border border-ink-300 hover:border-electric hover:text-electric transition-colors"
                aria-label="Email"
              >
                <Mail size={16} strokeWidth={1.5} aria-hidden />
              </a>
              <a
                href="https://t.me/kandes"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 border border-ink-300 hover:border-electric hover:text-electric transition-colors"
                aria-label="Telegram"
              >
                <MessageCircle size={16} strokeWidth={1.5} aria-hidden />
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[10px] uppercase tracking-[0.16em] text-ink-200 font-mono font-medium mb-4">
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-ink-100 hover:text-electric transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: terminal-style meta */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
          <span>© {year} Kandes.shop</span>
          <span className="sm:text-center text-ink-300">Kandes AI Platform</span>
          <span className="sm:text-right inline-flex items-center gap-2 sm:justify-end">
            <Heart size={10} className="text-danger" aria-hidden />
            <span>AI Power for Developers</span>
            <span className="w-1.5 h-1.5 bg-success animate-pulse-dot" aria-hidden />
            STATUS:OK
          </span>
        </div>
      </div>
    </footer>
  )
}
