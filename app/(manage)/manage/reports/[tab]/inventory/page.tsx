import { reportsService, inventoryQuerySchema } from '@/modules/reports'
import { formatCents } from '@/components/admin/reports/report-filters'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { lowStockThreshold?: string }
}

export default async function InventoryReportPage({ searchParams }: PageProps) {
  const parsed = inventoryQuerySchema.safeParse({
    lowStockThreshold: searchParams.lowStockThreshold ?? '5',
  })
  const threshold = parsed.success ? parsed.data.lowStockThreshold : 5
  const report = await reportsService.getInventoryReport(threshold)

  return (
    <>
      <div className="space-y-1">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ REPORTS / INVENTORY ]
        </span>
        <h1 className="text-display-md font-display">
          Tồn kho
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[13px] text-ink-100">
          Low-stock threshold: {threshold} items
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        <StatCard label="Sản phẩm" value={report.totals.products.toString()} />
        <StatCard label="Available" value={report.totals.itemsAvailable.toString()} />
        <StatCard label="Reserved" value={report.totals.itemsReserved.toString()} />
        <StatCard label="Delivered" value={report.totals.itemsDelivered.toString()} />
        <StatCard label="Expired" value={report.totals.itemsExpired.toString()} />
        <StatCard
          label="Low-stock"
          value={report.totals.lowStockProducts.toString()}
          warn={report.totals.lowStockProducts > 0}
        />
      </div>

      {/* Per-product */}
      <div className="border border-ink-400 bg-ink-800/40 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[11px] text-ink-100 font-mono uppercase bg-ink-700/50">
              <th className="text-left p-3">Sản phẩm</th>
              <th className="text-right p-3">Available</th>
              <th className="text-right p-3">Reserved</th>
              <th className="text-right p-3">Delivered</th>
              <th className="text-right p-3">Total</th>
              <th className="text-center p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-400/30">
            {report.byProduct.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-ink-100 text-[12px]">
                  Chưa có inventory items.
                </td>
              </tr>
            ) : (
              report.byProduct.map((p) => (
                <tr key={p.productId} className="hover:bg-ink-700/30">
                  <td className="p-3">
                    <p className="text-ink-50">{p.productName}</p>
                    <p className="text-[11px] font-mono text-ink-100">
                      {p.productSku}
                    </p>
                  </td>
                  <td className="p-3 text-right text-ink-100">{p.available}</td>
                  <td className="p-3 text-right text-ink-100">{p.reserved}</td>
                  <td className="p-3 text-right text-ink-100">{p.delivered}</td>
                  <td className="p-3 text-right text-ink-100">{p.total}</td>
                  <td className="p-3 text-center">
                    {p.isLowStock ? (
                      <span className="px-2 py-0.5 rounded bg-warning/20 text-warning text-[11px] font-mono">
                        Low stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-success/20 text-success text-[11px] font-mono">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-ink-100">
        Tip: chỉnh lowStockThreshold qua query <code>?lowStockThreshold=N</code>.
      </p>
    </>
  )
}

function StatCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`border ${warn ? 'border-warning' : 'border-ink-400'} bg-ink-800/40 p-3`}>
      <p className="text-[11px] font-mono uppercase tracking-wide text-ink-100">
        {label}
      </p>
      <p className={`text-[16px] font-display mt-0.5 ${warn ? 'text-warning' : 'text-ink-50'}`}>
        {value}
      </p>
    </div>
  )
}

// Tránh linter báo unused import nếu người dùng chỉ xem totals
void formatCents
