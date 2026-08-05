import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Key } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getUserOrder } from '@/modules/checkout'
import { Card } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/account/order-status-badge'
import { RevealKeyDialog } from '@/components/account/reveal-key-dialog'
import { formatVnd, formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Chi tiết đơn · Kandes.shop',
}

/**
 * /account/orders/[orderNumber] — Phase 2 P2-09.
 *
 * Server-side load order qua `getUserOrder(userId, orderNumber)`:
 *   - Auth: requireUser.
 *   - Ownership: order.userId === userId (404 nếu khác).
 *
 * UI:
 *   - Header: orderNumber + status badge.
 *   - Items list.
 *   - Totals.
 *   - RevealKeyDialog button (chỉ khi delivered/completed).
 */
export default async function AccountOrderDetailPage({
  params,
}: {
  params: { orderNumber: string }
}) {
  const user = await requireUser()

  let order
  try {
    order = await getUserOrder(user.id, params.orderNumber)
  } catch {
    notFound()
  }

  const canReveal = order.status === 'delivered' || order.status === 'completed'

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-ink-200 hover:text-electric text-body-sm"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden />
          Về danh sách đơn
        </Link>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-h1 font-display text-ink-50">
            <span className="font-mono text-h3 align-middle text-ink-100">{order.orderNumber}</span>
          </h1>
          <OrderStatusBadge status={order.status} paymentStatus={order.paymentStatus} />
        </div>
        <p className="text-body-sm text-ink-200 mt-1">
          Tạo lúc {formatDate(order.createdAt)}
          {order.paidAt && ` · Thanh toán lúc ${formatDate(order.paidAt)}`}
        </p>
      </header>

      {/* Reveal key CTA */}
      {canReveal && (
        <Card className="p-4 border-electric/40 bg-electric/5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-ink-50">
            <Key size={16} className="text-electric" aria-hidden />
            <span className="text-body-sm">
              Đơn đã được giao. Hiển thị key / nội dung sản phẩm của bạn.
            </span>
          </div>
          <RevealKeyDialog orderNumber={order.orderNumber} orderStatus={order.status} />
        </Card>
      )}

      {(order.status === 'processing' || order.status === 'paid') && (
        <Card className="p-4 border-warning/40 bg-warning/5">
          <p className="text-body-sm text-warning">
            Đơn đang được xử lý. Key / nội dung sẽ hiển thị ở đây sau khi admin/auto-delivery giao
            hàng xong.
          </p>
        </Card>
      )}

      {order.status === 'cancelled' && (
        <Card className="p-4 border-danger/40 bg-danger/5">
          <p className="text-body-sm text-danger">
            Đơn đã bị huỷ. Nếu cần, hãy tạo đơn mới hoặc liên hệ support.
          </p>
        </Card>
      )}

      {/* Items */}
      <Card className="p-0 overflow-hidden">
        <div className="border-b border-ink-700 px-4 py-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-electric">
            [ SẢN PHẨM · {order.items.length} ]
          </span>
        </div>
        <ul>
          {order.items.map((it) => (
            <li
              key={it.id}
              className="flex items-start justify-between gap-3 p-4 border-b border-ink-700 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-ink-50 line-clamp-2 leading-tight">{it.productNameSnapshot}</p>
                {it.variantNameSnapshot && (
                  <p className="text-ink-300 text-body-xs mt-0.5">
                    Phân loại: {it.variantNameSnapshot}
                  </p>
                )}
                <p className="text-ink-300 text-body-xs mt-1 font-mono">
                  × {it.quantity} · {formatVnd(it.unitPriceCents)}
                </p>
              </div>
              <span className="text-ink-100 tabular-nums flex-shrink-0 text-body-sm self-start">
                {formatVnd(it.totalPriceCents)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Totals */}
      <Card className="p-4 space-y-1.5 text-body-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-200">Mã đơn</span>
          <span className="font-mono text-ink-100">{order.orderNumber}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-200">Tạm tính</span>
          <span className="tabular-nums text-ink-100">{formatVnd(order.subtotalCents)}</span>
        </div>
        {order.discountCents !== '0' && (
          <div className="flex items-center justify-between">
            <span className="text-success">Giảm giá</span>
            <span className="tabular-nums text-success">-{formatVnd(order.discountCents)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-ink-800">
          <span className="text-ink-50 font-semibold">Tổng thanh toán</span>
          <span className="text-h3 text-electric font-bold tabular-nums">
            {formatVnd(order.totalCents)}
          </span>
        </div>
        {order.paymentMethod && (
          <div className="flex items-center justify-between pt-2 border-t border-ink-800">
            <span className="text-ink-200">Phương thức</span>
            <span className="text-ink-100 text-body-xs">
              {order.paymentMethod === 'sepay_qr' ? 'SePay QR' : order.paymentMethod}
            </span>
          </div>
        )}
      </Card>

      {order.notes && (
        <Card className="p-3 text-body-sm">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-300 block mb-1">
            GHI CHÚ
          </span>
          <p className="text-ink-100 whitespace-pre-wrap">{order.notes}</p>
        </Card>
      )}
    </div>
  )
}
