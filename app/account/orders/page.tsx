import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { listUserOrders, ordersQuerySchema } from '@/modules/checkout'
import type { ListUserOrdersResult } from '@/modules/checkout/service'
import { formatVnd, formatDate } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/account/order-status-badge'
import { Pagination } from '@/components/product/pagination'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Đơn hàng của tôi · Kandes.shop',
}

/**
 * /account/orders — Phase 2 P2-09.
 *
 * List đơn của user (server-side load). Search params:
 *   - status: enum | 'all' (default 'all')
 *   - page: 1..200 (default 1)
 *   - limit: 1..50 (default 20)
 *
 * Client không có filter UI (Phase 2) — pagination qua URL params.
 */
export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; limit?: string }
}) {
  let user
  try {
    user = await requireUser()
  } catch {
    user = null
  }
  if (!user) return null

  const parsed = ordersQuerySchema.safeParse({
    status: searchParams.status ?? 'all',
    page: searchParams.page ?? '1',
    limit: searchParams.limit ?? '20',
  })
  const query = parsed.success
    ? parsed.data
    : ordersQuerySchema.parse({ status: 'all', page: 1, limit: 20 })

  let result: ListUserOrdersResult = { items: [], total: 0, page: 1, hasMore: false, limit: 20 }
  try {
    result = await listUserOrders(user.id, query)
  } catch {
    result = { items: [], total: 0, page: 1, hasMore: false, limit: 20 }
  }

  // Tính totalPages từ total + limit để dùng Pagination component.
  const totalPages = Math.max(1, Math.ceil(result.total / result.limit))

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ thanh toán' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'delivered', label: 'Đã giao' },
    { value: 'completed', label: 'Hoàn tất' },
    { value: 'cancelled', label: 'Đã huỷ' },
    { value: 'refunded', label: 'Hoàn tiền' },
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-2 pb-6 border-b border-ink-400">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ACCOUNT · ORDERS ]
        </span>
        <h1 className="text-display-lg font-display">
          Đơn hàng của tôi
          <span className="text-electric">.</span>
        </h1>
        <p className="text-body-sm text-ink-200">
          Tổng {result.total} đơn · Trang {result.page}
        </p>
      </header>

      {/* Status filter */}
      <nav className="flex flex-wrap gap-2" aria-label="Lọc theo trạng thái">
        {statusOptions.map((opt) => {
          const isActive = query.status === opt.value
          const params = new URLSearchParams({
            status: opt.value,
            page: '1',
            limit: String(query.limit),
          })
          return (
            <Link
              key={opt.value}
              href={`/account/orders?${params.toString()}`}
              className={`px-3 py-1.5 text-body-sm border transition-colors ${
                isActive
                  ? 'border-electric text-electric bg-electric/10'
                  : 'border-ink-700 text-ink-100 hover:border-ink-400 hover:text-ink-50'
              }`}
            >
              {opt.label}
            </Link>
          )
        })}
      </nav>

      {result.items.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <ShoppingBag size={48} className="mx-auto text-ink-300" aria-hidden />
          <p className="text-body font-display text-ink-100">Chưa có đơn hàng nào</p>
          <p className="text-body-sm text-ink-200">
            {query.status === 'all'
              ? 'Bạn chưa từng đặt hàng. Khám phá sản phẩm của chúng tôi!'
              : 'Không có đơn nào ở trạng thái này.'}
          </p>
          <Link
            href="/products"
            className="inline-block mt-2 text-electric hover:underline text-body-sm"
          >
            Xem sản phẩm →
          </Link>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-body-sm">
            <thead className="bg-ink-800">
              <tr className="text-left text-ink-200">
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em]">
                  Mã đơn
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em]">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em]">SP</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-right">
                  Tổng
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em]">
                  Trạng thái
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {result.items.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-ink-700 hover:bg-ink-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-ink-100">
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="hover:text-electric"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-200">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-100 tabular-nums">{order.itemCount}</td>
                  <td className="px-4 py-3 text-ink-50 text-right tabular-nums">
                    {formatVnd(order.totalCents)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} paymentStatus={order.paymentStatus} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="text-electric hover:underline text-body-xs"
                    >
                      Chi tiết →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Pagination */}
      {result.items.length > 0 && (
        <Pagination
          currentPage={result.page}
          totalPages={totalPages}
          basePath="/account/orders"
          searchParams={{ status: query.status, limit: String(query.limit) }}
        />
      )}
    </div>
  )
}
