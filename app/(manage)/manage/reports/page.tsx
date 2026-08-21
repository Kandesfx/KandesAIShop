import Link from 'next/link'
import { ChevronRight, DollarSign, Boxes, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TABS = [
  {
    key: 'revenue',
    label: 'Doanh thu',
    code: '01',
    description: 'Báo cáo doanh thu theo ngày, phương thức thanh toán.',
    icon: DollarSign,
  },
  {
    key: 'inventory',
    label: 'Tồn kho',
    code: '02',
    description: 'Đếm inventory items theo trạng thái, cảnh báo low-stock.',
    icon: Boxes,
  },
  {
    key: 'top-products',
    label: 'Top sản phẩm',
    code: '03',
    description: 'Sản phẩm bán chạy nhất theo số lượng và doanh thu.',
    icon: TrendingUp,
  },
] as const

export default function AdminReportsHubPage() {
  return (
    <div className="container-narrow py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / REPORTS ]
        </span>
        <h1 className="text-display-lg font-display">
          Reports
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[13px] text-ink-100">
          Báo cáo tổng hợp — doanh thu, tồn kho, top sản phẩm. Tính toán in-process
          mỗi request (D31); phase 5+ có thể cache/pre-aggregate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <Link
              key={t.key}
              href={`/manage/reports/${t.key}`}
              className="group border border-ink-400 bg-ink-800/40 hover:border-electric hover:bg-ink-800/60 transition-colors p-4 flex items-start gap-3"
            >
              <div className="flex-shrink-0 w-10 h-10 border border-ink-400 group-hover:border-electric flex items-center justify-center">
                <Icon size={16} strokeWidth={1.5} aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[13px] font-display text-ink-50">
                    {t.label}
                  </h3>
                  <ChevronRight
                    size={14}
                    strokeWidth={1.5}
                    className="text-ink-100 group-hover:text-electric flex-shrink-0"
                    aria-hidden
                  />
                </div>
                <p className="text-[12px] text-ink-100 mt-1 leading-relaxed">
                  {t.description}
                </p>
                <p className="text-[11px] font-mono text-ink-100 mt-2">
                  /{t.code}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
