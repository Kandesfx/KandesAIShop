import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TABS = [
  { key: 'revenue', label: 'Doanh thu', code: '01' },
  { key: 'inventory', label: 'Tồn kho', code: '02' },
  { key: 'top-products', label: 'Top sản phẩm', code: '03' },
] as const

export default function ReportsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { tab: string }
}) {
  const valid = TABS.some((t) => t.key === params.tab)

  return (
    <div className="container-narrow py-8 space-y-6">
      <nav
        aria-label="Reports tabs"
        className="flex flex-wrap gap-1 border-b border-ink-400 pb-2"
      >
        {TABS.map((t) => {
          const active = t.key === params.tab
          return (
            <Link
              key={t.key}
              href={`/manage/reports/${t.key}`}
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

      {valid ? children : null}
    </div>
  )
}
