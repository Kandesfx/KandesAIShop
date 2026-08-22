import Link from 'next/link'
import { ShoppingBag, Key, Eye, ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
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

export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; limit?: string } | Promise<{ status?: string; page?: string; limit?: string }>
}) {
  let user
  try {
    user = await requireUser()
  } catch {
    user = null
  }
  if (!user) return null

  const resolvedParams = await searchParams
  const parsed = ordersQuerySchema.safeParse({
    status: resolvedParams?.status ?? 'all',
    page: resolvedParams?.page ?? '1',
    limit: resolvedParams?.limit ?? '20',
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

  const totalPages = Math.max(1, Math.ceil(result.total / result.limit))

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Tất cả đơn' },
    { value: 'delivered', label: 'Đã giao key' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'pending', label: 'Chờ thanh toán' },
    { value: 'cancelled', label: 'Đã huỷ' },
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-2 pb-6 border-b border-ink-400">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ QUẢN LÝ TÀI KHOẢN · ĐƠN HÀNG ]
        </span>
        <h1 className="text-display-md font-display">
          Đơn hàng của tôi
          <span className="text-electric">.</span>
        </h1>
        <p className="text-sm text-ink-100">
          Theo dõi trạng thái, tiến độ xử lý và lấy mã License Key bản quyền của bạn.
        </p>
      </header>

      {/* Status filter tabs */}
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
              className={`px-3.5 py-1.5 text-xs font-mono rounded transition-all ${
                isActive
                  ? 'border border-electric text-electric bg-electric/15 font-semibold shadow-glow-electric'
                  : 'border border-ink-700 bg-ink-800 text-ink-200 hover:border-ink-400 hover:text-ink-50'
              }`}
            >
              {opt.label}
            </Link>
          )
        })}
      </nav>

      {result.items.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-ink-700 bg-ink-800/40">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink-700/60 text-ink-200">
            <ShoppingBag size={28} />
          </div>
          <div className="space-y-1">
            <p className="text-base font-display font-semibold text-ink-50">
              Chưa có đơn hàng nào
            </p>
            <p className="text-xs text-ink-200">
              {query.status === 'all'
                ? 'Bạn chưa có đơn hàng nào. Mua ngay các license AI coding chính hãng tại Kandes.shop!'
                : 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.'}
            </p>
          </div>
          <div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-buy-now text-ink-900 font-mono font-bold text-xs uppercase tracking-wider rounded shadow-glow-electric"
            >
              <span>Khám phá sản phẩm</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.items.map((order) => {
            const isDelivered = order.status === 'delivered' || order.status === 'completed'
            const isProcessing = order.status === 'processing' || order.status === 'paid'

            return (
              <div
                key={order.id}
                className="group rounded-lg border border-ink-400 bg-ink-800/60 p-4 sm:p-5 hover:border-electric/60 hover:bg-ink-800 transition-all duration-200 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/60 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-electric">
                      #{order.orderNumber}
                    </span>
                    <span className="text-xs text-ink-200 font-mono">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <OrderStatusBadge status={order.status} paymentStatus={order.paymentStatus} />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-ink-200">
                      Số lượng sản phẩm: <span className="font-mono text-ink-50 font-medium">{order.itemCount}</span>
                    </p>
                    <p className="text-xs text-ink-200">
                      Tổng tiền thanh toán:{' '}
                      <span className="font-mono text-base font-bold text-ink-50">
                        {formatVnd(order.totalCents)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {isDelivered ? (
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all"
                      >
                        <Key size={14} className="text-emerald-400" />
                        <span>XEM KEY NGAY</span>
                      </Link>
                    ) : isProcessing ? (
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all"
                      >
                        <Clock size={14} className="text-cyan-400 animate-spin" />
                        <span>TIẾN ĐỘ GIAO</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-ink-700 hover:bg-ink-600 text-ink-50 border border-ink-500 rounded text-xs font-mono uppercase tracking-wider transition-all"
                      >
                        <Eye size={14} />
                        <span>CHI TIẾT</span>
                      </Link>
                    )}

                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="p-2 text-ink-200 hover:text-electric transition-colors"
                      title="Xem chi tiết đơn"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
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
