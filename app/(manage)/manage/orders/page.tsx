import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listOrders } from '@/modules/order-admin/service'
import { listOrdersSchema } from '@/modules/order-admin/validators'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE_CLASS,
  DELIVERY_LABELS,
  DELIVERY_BADGE_CLASS,
  formatVND,
  formatDate,
} from '@/lib/format'
import { Pagination } from '@/components/product/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { ClickableRow } from '@/components/admin/orders/clickable-row'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: {
    page?: string
    status?: string
    paymentStatus?: string
    deliveryStrategy?: string
    q?: string
    from?: string
    to?: string
  }
}

/**
 * Admin orders list — server component.
 * Read OK with staff + admin + super_admin (D26).
 */
export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const user = await requireRole('staff', 'admin', 'super_admin').catch(() => null)
  if (!user) redirect('/manage/login?next=/manage/orders')

  const parsed = listOrdersSchema.parse(searchParams)
  const result = await listOrders(parsed, { id: user.id, role: user.role })

  const baseParams: Record<string, string | undefined> = {
    status: searchParams.status,
    paymentStatus: searchParams.paymentStatus,
    deliveryStrategy: searchParams.deliveryStrategy,
    q: searchParams.q,
    from: searchParams.from,
    to: searchParams.to,
  }

  const statusOpts = [
    'all',
    'pending',
    'paid',
    'processing',
    'delivered',
    'completed',
    'cancelled',
    'refunded',
  ]
  const paymentOpts = ['all', 'unpaid', 'awaiting', 'paid', 'partial', 'refunded', 'failed']
  const strategyOpts = [
    'all',
    'INSTANT_AUTO',
    'MANUAL_KEY',
    'MANUAL_MESSAGE',
    'FILE_DOWNLOAD',
    'TOPUP',
    'EXTERNAL_INVITE',
  ]

  return (
    <div className="container-narrow py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-ink-400">
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
            [ ADMIN / 06 / ORDERS · {String(result.total).padStart(3, '0')} ]
          </span>
          <h1 className="text-h1 font-display">Đơn hàng</h1>
        </div>
      </div>

      <form className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Tìm theo mã đơn, email, SĐT..."
            className="input flex-1"
          />
          <input
            type="date"
            name="from"
            defaultValue={searchParams.from?.slice(0, 10) ?? ''}
            className="input md:w-40"
            aria-label="Từ ngày"
          />
          <input
            type="date"
            name="to"
            defaultValue={searchParams.to?.slice(0, 10) ?? ''}
            className="input md:w-40"
            aria-label="Đến ngày"
          />
          <button type="submit" className="btn-outline text-[12px]">
            ÁP DỤNG
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-100 mr-1">
            STATUS
          </span>
          {statusOpts.map((s) => {
            const isActive = (searchParams.status ?? 'all') === s
            const href = new URLSearchParams()
            Object.entries({ ...baseParams, status: s === 'all' ? '' : s }).forEach(([k, v]) => {
              if (v) href.set(k, v)
            })
            return (
              <Link
                key={s}
                href={`/manage/orders${href.toString() ? `?${href}` : ''}`}
                className={`px-2 py-1 border ${
                  isActive
                    ? 'border-electric text-electric'
                    : 'border-ink-400 text-ink-100 hover:border-electric hover:text-electric'
                } transition-colors`}
              >
                {s === 'all' ? 'Tất cả' : (ORDER_STATUS_LABELS[s] ?? s)}
              </Link>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-100 mr-1">
            PAYMENT
          </span>
          {paymentOpts.map((p) => {
            const isActive = (searchParams.paymentStatus ?? 'all') === p
            const href = new URLSearchParams()
            Object.entries({ ...baseParams, paymentStatus: p === 'all' ? '' : p }).forEach(
              ([k, v]) => {
                if (v) href.set(k, v)
              }
            )
            return (
              <Link
                key={p}
                href={`/manage/orders${href.toString() ? `?${href}` : ''}`}
                className={`px-2 py-1 border ${
                  isActive
                    ? 'border-electric text-electric'
                    : 'border-ink-400 text-ink-100 hover:border-electric hover:text-electric'
                } transition-colors`}
              >
                {p === 'all' ? 'Tất cả' : (PAYMENT_STATUS_LABELS[p] ?? p)}
              </Link>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-100 mr-1">
            DELIVERY
          </span>
          {strategyOpts.map((d) => {
            const isActive = (searchParams.deliveryStrategy ?? 'all') === d
            const href = new URLSearchParams()
            Object.entries({ ...baseParams, deliveryStrategy: d === 'all' ? '' : d }).forEach(
              ([k, v]) => {
                if (v) href.set(k, v)
              }
            )
            return (
              <Link
                key={d}
                href={`/manage/orders${href.toString() ? `?${href}` : ''}`}
                className={`px-2 py-1 border ${
                  isActive
                    ? 'border-electric text-electric'
                    : 'border-ink-400 text-ink-100 hover:border-electric hover:text-electric'
                } transition-colors`}
              >
                {d === 'all' ? 'Tất cả' : (DELIVERY_LABELS[d] ?? d)}
              </Link>
            )
          })}
        </div>
      </form>

      <div className="border border-ink-400 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-ink-800 border-b border-ink-400">
            <tr className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-100">
              <th className="px-3 py-2 text-left">MÃ</th>
              <th className="px-3 py-2 text-left">KHÁCH</th>
              <th className="px-3 py-2 text-right">TỔNG</th>
              <th className="px-3 py-2 text-center">TRẠNG THÁI</th>
              <th className="px-3 py-2 text-center">PAYMENT</th>
              <th className="px-3 py-2 text-left hidden lg:table-cell">DELIVERY</th>
              <th className="px-3 py-2 text-left hidden md:table-cell">NGÀY</th>
              <th className="px-3 py-2 text-right">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-400">
            {result.items.map((o) => (
              <ClickableRow key={o.id} href={`/manage/orders/${o.id}`} className="hover:bg-ink-700/30 text-[13px] transition-colors">
                <td className="px-3 py-3 mono text-electric text-[12px]">
                  <Link href={`/manage/orders/${o.id}`}>{o.orderNumber}</Link>
                </td>
                <td className="px-3 py-3 text-ink-100">
                  <div className="font-medium text-ink-50">{o.customerName}</div>
                  <div className="text-[12px] text-ink-100">{o.customerEmail || '—'}</div>
                </td>
                <td className="px-3 py-3 text-right mono text-ink-100">
                  {formatVND(o.totalCents)}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`text-[11px] font-mono uppercase ${ORDER_STATUS_BADGE_CLASS[o.status] ?? 'badge-neutral'}`}
                  >
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`text-[11px] font-mono uppercase ${PAYMENT_STATUS_BADGE_CLASS[o.paymentStatus] ?? 'badge-neutral'}`}
                  >
                    {PAYMENT_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus}
                  </span>
                </td>
                <td className="px-3 py-3 hidden lg:table-cell">
                  {o.primaryDeliveryStrategy ? (
                    <span
                      className={`text-[11px] font-mono uppercase ${DELIVERY_BADGE_CLASS[o.primaryDeliveryStrategy] ?? 'badge-neutral'}`}
                    >
                      {DELIVERY_LABELS[o.primaryDeliveryStrategy] ?? o.primaryDeliveryStrategy}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-3 hidden md:table-cell text-[12px] text-ink-100 mono">
                  {formatDate(o.createdAt)}
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/manage/orders/${o.id}`}
                    className={`inline-flex items-center justify-center px-3 py-1.5 text-[12px] font-medium uppercase tracking-wider rounded transition-colors ${
                      o.status === 'processing' || o.status === 'pending'
                        ? 'bg-electric text-ink-900 hover:bg-electric-hover'
                        : 'border border-ink-400 text-ink-100 hover:border-electric hover:text-electric'
                    }`}
                  >
                    {o.status === 'processing' || o.status === 'pending' ? 'XỬ LÝ' : 'CHI TIẾT'}
                  </Link>
                </td>
              </ClickableRow>
            ))}
          </tbody>
        </table>
        {result.items.length === 0 && (
          <div className="p-2">
            <EmptyState
              variant="no-results"
              title="Không có đơn nào"
              description="Thử đổi filter hoặc tìm kiếm khác."
            />
          </div>
        )}
      </div>

      <Pagination
        currentPage={parsed.page}
        totalPages={result.totalPages}
        basePath="/manage/orders"
        searchParams={baseParams}
      />
    </div>
  )
}
