import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const TABS = [
  { key: 'general', label: 'Chung', code: '01' },
  { key: 'payment', label: 'Thanh toán', code: '02' },
  { key: 'email', label: 'Email', code: '03' },
  { key: 'notifications', label: 'Thông báo', code: '04' },
  { key: 'sla', label: 'SLA', code: '05' },
] as const

export default function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { category: string }
}) {
  // Sanity: nếu param không thuộc tab known → 404 (defensive)
  const valid = TABS.some((t) => t.key === params.category)
  if (!valid) notFound()

  return (
    <div className="container-narrow py-8 space-y-6">
      {/* Sub-nav */}
      <nav
        aria-label="Settings tabs"
        className="flex flex-wrap gap-1 border-b border-ink-400 pb-2"
      >
        {TABS.map((t) => {
          const active = t.key === params.category
          return (
            <Link
              key={t.key}
              href={`/manage/settings/${t.key}`}
              className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide border ${
                active
                  ? 'border-electric text-electric bg-electric/5'
                  : 'border-transparent text-ink-200 hover:text-electric'
              }`}
            >
              {t.label}
              <span className="ml-2 text-[9px] opacity-60">/{t.code}</span>
            </Link>
          )
        })}
      </nav>

      {children}
    </div>
  )
}
