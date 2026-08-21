import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Key } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getUserOrder } from '@/modules/checkout'
import { Card } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/account/order-status-badge'
import { RevealKeyDialog } from '@/components/account/reveal-key-dialog'
import { formatVnd, formatDate } from '@/lib/format'
import { AutoLinkText } from '@/components/ui/auto-link-text'

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
          className="inline-flex items-center gap-1.5 text-ink-100 hover:text-electric text-body-sm"
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
        <p className="text-body-sm text-ink-100 mt-1">
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
        <Card className="p-5 border-electric/40 bg-ink-900/90 space-y-3 shadow-lg shadow-electric/5">
          <div className="flex items-center gap-2 text-electric font-semibold text-body-base">
            <span className="inline-block w-2 h-2 rounded-full bg-electric animate-ping" />
            <span>ĐƠN HÀNG ĐANG ĐƯỢC XỬ LÝ & BÀN GIAO</span>
          </div>
          <p className="text-ink-100 text-body-sm leading-relaxed">
            Hệ thống đã nhận thanh toán thành công. Đơn hàng của bạn đang được kỹ thuật viên xử lý và sẽ cấp mã Key / tài khoản cho bạn sau ít phút (thông thường từ 2 - 10 phút), vui lòng chờ trong giây lát.
          </p>
          <div className="p-3.5 bg-ink-950 border border-ink-700/70 rounded text-body-xs space-y-2 text-ink-100">
            <div className="font-semibold text-ink-50 flex items-center gap-1.5">
              <span className="text-electric">📌</span>
              <span>Hỗ trợ kích hoạt & giải đáp thắc mắc</span>
            </div>
            <p className="text-ink-100">
              Nếu thời gian thực hiện quá lâu hoặc bạn cần kích hoạt gấp, vui lòng liên hệ ngay với Admin để được hỗ trợ:
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 font-mono text-[13px]">
              <a
                href="https://zalo.me/0865834117"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-electric/10 hover:bg-electric/20 text-electric border border-electric/30 rounded transition-colors font-semibold"
              >
                💬 Zalo Admin: 0865.834.117 ↗
              </a>
              <a
                href="https://zalo.me/g/1wpnubuk0nzczx5n8jbl"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ink-800 hover:bg-ink-700 text-ink-100 border border-ink-600 rounded transition-colors"
              >
                👥 Nhóm Zalo hỗ trợ ↗
              </a>
              <Link
                href="/help/faq"
                className="inline-flex items-center gap-1 text-ink-100 hover:text-electric underline ml-1"
              >
                ❓ Câu hỏi thường gặp
              </Link>
            </div>
          </div>
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
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-electric">
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
                  <p className="text-ink-100 text-body-xs mt-0.5">
                    Phân loại: {it.variantNameSnapshot}
                  </p>
                )}
                <p className="text-ink-100 text-body-xs mt-1 font-mono">
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
          <span className="text-ink-100">Mã đơn</span>
          <span className="font-mono text-ink-100">{order.orderNumber}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-100">Tạm tính</span>
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
            <span className="text-ink-100">Phương thức</span>
            <span className="text-ink-100 text-body-xs">
              {order.paymentMethod === 'sepay_qr' ? 'SePay QR' : order.paymentMethod}
            </span>
          </div>
        )}
      </Card>

      {order.notes && (
        <Card className="p-3 text-body-sm">
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-100 block mb-1">
            GHI CHÚ
          </span>
          <div className="text-ink-100 whitespace-pre-wrap">
            <AutoLinkText text={order.notes} />
          </div>
        </Card>
      )}
    </div>
  )
}
