import { reportsService, revenueQuerySchema } from '@/modules/reports'
import { ReportFilters, formatCents, formatDate } from '@/components/admin/reports/report-filters'
import { Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { preset?: string; from?: string; to?: string }
}

export default async function RevenueReportPage({ searchParams }: PageProps) {
  const parsed = revenueQuerySchema.safeParse({
    preset: searchParams.preset ?? '30d',
    from: searchParams.from,
    to: searchParams.to,
  })
  const range = parsed.success
    ? reportsService.resolveRange(parsed.data)
    : reportsService.resolveRange({ preset: '30d' })

  const report = await reportsService.getRevenueReport(range)

  const csvUrl = `/api/admin/reports/revenue?preset=${range.preset}${
    range.preset === 'custom'
      ? `&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
      : ''
  }&format=csv`

  const maxNet = Math.max(1, ...report.buckets.map((b) => Number(b.netCents)))

  return (
    <>
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ REPORTS / REVENUE ]
        </span>
        <h1 className="text-display-md font-display">
          Doanh thu
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200">
          {formatDate(range.from)} — {formatDate(range.to)}
        </p>
      </div>

      <div className="flex justify-between items-center gap-2">
        <ReportFilters
          preset={(parsed.success ? parsed.data.preset : '30d') as never}
          from={searchParams.from}
          to={searchParams.to}
          basePath="/admin/reports/revenue"
        />
        <a
          href={csvUrl}
          className="btn-outline text-[11px] inline-flex items-center gap-1.5"
        >
          <Download size={12} strokeWidth={1.5} aria-hidden />
          Export CSV
        </a>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard label="Đơn hàng" value={report.totals.orderCount.toString()} />
        <StatCard label="Gross" value={formatCents(report.totals.grossCents)} />
        <StatCard label="Discount" value={formatCents(report.totals.discountCents)} />
        <StatCard label="Net" value={formatCents(report.totals.netCents)} />
        <StatCard label="Avg / order" value={formatCents(report.totals.avgOrderCents)} />
      </div>

      {/* By payment method */}
      {report.byPaymentMethod.length > 0 && (
        <div className="border border-ink-400 bg-ink-800/40">
          <div className="p-3 border-b border-ink-400">
            <h3 className="text-[11px] font-mono uppercase tracking-wide text-electric">
              Theo phương thức thanh toán
            </h3>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] text-ink-200 font-mono uppercase bg-ink-700/50">
                <th className="text-left p-3">Phương thức</th>
                <th className="text-right p-3">Số đơn</th>
                <th className="text-right p-3">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-400/30">
              {report.byPaymentMethod.map((p) => (
                <tr key={p.method}>
                  <td className="p-3 font-mono text-electric">{p.method}</td>
                  <td className="p-3 text-right text-ink-200">{p.orderCount}</td>
                  <td className="p-3 text-right text-ink-50">
                    {formatCents(p.netCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Daily chart (CSS bar — không cần external chart lib) */}
      <div className="border border-ink-400 bg-ink-800/40">
        <div className="p-3 border-b border-ink-400">
          <h3 className="text-[11px] font-mono uppercase tracking-wide text-electric">
            Daily breakdown
          </h3>
        </div>
        <div className="p-4 space-y-1.5 max-h-96 overflow-y-auto">
          {report.buckets.map((b) => {
            const pct = (Number(b.netCents) / maxNet) * 100
            return (
              <div key={b.date} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 font-mono text-ink-200">{b.date}</span>
                <div className="flex-1 h-5 bg-ink-700/50 relative">
                  <div
                    className="h-full bg-electric/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-28 text-right text-ink-200 text-[10px]">
                  {b.orderCount} đơn
                </span>
                <span className="w-28 text-right text-ink-50 font-mono text-[10px]">
                  {formatCents(b.netCents)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink-400 bg-ink-800/40 p-3">
      <p className="text-[10px] font-mono uppercase tracking-wide text-ink-200">
        {label}
      </p>
      <p className="text-[16px] font-display text-ink-50 mt-0.5">{value}</p>
    </div>
  )
}
