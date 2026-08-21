import { reportsService, topProductsQuerySchema } from '@/modules/reports'
import { ReportFilters, formatCents, formatDate } from '@/components/admin/reports/report-filters'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { preset?: string; from?: string; to?: string; limit?: string }
}

export default async function TopProductsReportPage({ searchParams }: PageProps) {
  const parsed = topProductsQuerySchema.safeParse({
    preset: searchParams.preset ?? '30d',
    from: searchParams.from,
    to: searchParams.to,
    limit: searchParams.limit ?? '10',
  })
  const data = parsed.success
    ? parsed.data
    : { preset: '30d' as const, limit: 10 }
  const range = reportsService.resolveRange({
    preset: data.preset,
    from: data.from,
    to: data.to,
  })
  const report = await reportsService.getTopProductsReport(range, data.limit)

  return (
    <>
      <div className="space-y-1">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ REPORTS / TOP PRODUCTS ]
        </span>
        <h1 className="text-display-md font-display">
          Top sản phẩm
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[13px] text-ink-100">
          {formatDate(range.from)} — {formatDate(range.to)} · Top {report.limit}
        </p>
      </div>

      <ReportFilters
        preset={data.preset as never}
        from={searchParams.from}
        to={searchParams.to}
        basePath="/manage/reports/top-products"
        extras={
          <form action="/manage/reports/top-products" method="get" className="flex items-end gap-2">
            <input
              type="hidden"
              name="preset"
              value={data.preset}
            />
            <div>
              <label className="block text-[11px] text-ink-100 mb-1">Limit</label>
              <input
                type="number"
                name="limit"
                defaultValue={String(data.limit)}
                min={1}
                max={100}
                className="input-field text-[13px] w-20"
              />
            </div>
            <button type="submit" className="btn-outline text-[12px] h-9">
              Apply
            </button>
          </form>
        }
      />

      <div className="border border-ink-400 bg-ink-800/40 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[11px] text-ink-100 font-mono uppercase bg-ink-700/50">
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Sản phẩm</th>
              <th className="text-right p-3">Số lượng</th>
              <th className="text-right p-3">Số đơn</th>
              <th className="text-right p-3">Gross</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-400/30">
            {report.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-ink-100 text-[12px]">
                  Chưa có order đã paid trong khoảng này.
                </td>
              </tr>
            ) : (
              report.items.map((p, idx) => (
                <tr key={p.productId} className="hover:bg-ink-700/30">
                  <td className="p-3 text-ink-100 font-mono w-10">{idx + 1}</td>
                  <td className="p-3">
                    <p className="text-ink-50">{p.productName}</p>
                    <p className="text-[11px] font-mono text-ink-100">{p.productSku}</p>
                  </td>
                  <td className="p-3 text-right text-electric font-mono">
                    {p.quantitySold}
                  </td>
                  <td className="p-3 text-right text-ink-100">{p.orderCount}</td>
                  <td className="p-3 text-right text-ink-50 font-mono">
                    {formatCents(p.grossCents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
