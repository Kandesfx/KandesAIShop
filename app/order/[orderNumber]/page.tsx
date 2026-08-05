import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { checkoutService } from '@/modules/checkout'
import { buildQrUrl, isSepayConfigured } from '@/modules/checkout'
import { Countdown } from '@/components/checkout/countdown'
import { QrDisplay } from '@/components/checkout/qr-display'
import { OrderStatusPoller } from '@/components/checkout/order-status-poller'
import { Button } from '@/components/ui/button'
import { formatVnd } from '@/lib/format'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Đơn hàng · Kandes.shop',
}

/**
 * /order/[orderNumber] — Phase 2 P2-07.
 *
 * Server-side:
 *   - Load OrderView qua service (ownership check userId hoặc guestToken).
 *   - Render QR (nếu pending + unpaid + SePay đã config).
 *   - Render countdown 15 phút (BR-1.2).
 *   - Render summary items + status badge.
 *
 * Client:
 *   - OrderStatusPoller polling /api/orders/[orderNumber]/status mỗi 5s.
 *   - Khi paid/cancelled → reload page.
 */
export default async function OrderPage({ params }: { params: { orderNumber: string } }) {
  const user = await getCurrentUser()
  let order
  try {
    order = await checkoutService.getOrderView(params.orderNumber, user?.id ?? null)
  } catch {
    notFound()
  }

  const isPending = order.status === 'pending' && order.paymentStatus === 'unpaid'
  const showQr = isPending && isSepayConfigured() && Boolean(order.paymentReference)
  const qrUrl =
    showQr && order.paymentReference
      ? buildQrUrl({
          amountVnd: Number(order.totalCents),
          paymentReference: order.paymentReference,
        })
      : ''

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-6 pb-6 border-b border-ink-400 space-y-2">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-ink-200 hover:text-electric text-body-sm"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden />
          Quay lại giỏ hàng
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric block">
          [ ORDER · {order.isGuest ? 'GUEST' : 'MEMBER'} ]
        </span>
        <h1 className="text-h1 font-display text-ink-50">
          Đơn hàng{' '}
          <span className="font-mono text-ink-100 text-h3 align-middle">{order.orderNumber}</span>
        </h1>
        <div className="flex items-center gap-3 text-body-sm">
          <StatusBadge status={order.status} paymentStatus={order.paymentStatus} />
          <span className="text-ink-300">
            Tạo lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
          </span>
        </div>
      </header>

      {/* Polling status */}
      <OrderStatusPoller
        orderNumber={order.orderNumber}
        initialStatus={order.status}
        initialPaymentStatus={order.paymentStatus}
      />

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Items */}
        <section className="space-y-4">
          <div className="mb-3 pb-3 border-b border-ink-400 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
              [ SẢN PHẨM · {order.items.length} ]
            </span>
            <h2 className="text-h3 font-display text-ink-50">Chi tiết đơn</h2>
          </div>

          <ul className="space-y-2">
            {order.items.map((it) => (
              <li
                key={it.id}
                className="flex items-start justify-between gap-3 p-3 border border-ink-700 bg-ink-900"
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
                <span className="text-ink-100 tabular-nums flex-shrink-0 text-body-sm">
                  {formatVnd(it.totalPriceCents)}
                </span>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div className="border border-ink-700 bg-ink-900 p-4 space-y-1.5 text-body-sm">
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
          </div>

          {order.notes && (
            <div className="border border-ink-700 bg-ink-900 p-3 text-body-sm">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-300 block mb-1">
                GHI CHÚ
              </span>
              <p className="text-ink-100 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {order.guestEmail && (
            <div className="border border-ink-700 bg-ink-900 p-3 text-body-sm space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-300 block">
                THÔNG TIN LIÊN HỆ
              </span>
              <p className="text-ink-100">
                <span className="text-ink-300">Email:</span> {order.guestEmail}
              </p>
              <p className="text-ink-100">
                <span className="text-ink-300">SĐT:</span> {order.guestPhone}
              </p>
              <p className="text-ink-300 text-body-xs mt-2">
                Tra cứu đơn sau này qua trang{' '}
                <Link href="/track-order" className="text-electric hover:underline">
                  /track-order
                </Link>
                .
              </p>
            </div>
          )}
        </section>

        {/* QR / Countdown */}
        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          {isPending && order.expiresAt && (
            <div className="border border-ink-700 bg-ink-900 p-4 space-y-3 text-center">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-300">
                THỜI GIAN CÒN LẠI
              </span>
              <Countdown expiresAt={order.expiresAt} size="lg" className="justify-center" />
              <p className="text-body-xs text-ink-300">
                Đơn sẽ tự động huỷ nếu hết thời gian mà chưa nhận được thanh toán (BR-1.2).
              </p>
            </div>
          )}

          {showQr && qrUrl ? (
            <QrDisplay
              qrUrl={qrUrl}
              paymentReference={order.paymentReference!}
              amount={Number(order.totalCents)}
              expiresAt={order.expiresAt!}
            />
          ) : isPending && !isSepayConfigured() ? (
            <div className="border border-warning/40 bg-warning/10 p-4 text-body-sm text-warning space-y-2">
              <p className="font-semibold">Thanh toán QR chưa sẵn sàng</p>
              <p className="text-body-xs">
                Hệ thống chưa cấu hình tài khoản ngân hàng. Vui lòng liên hệ admin và quay lại sau.
              </p>
            </div>
          ) : null}

          {order.status === 'paid' && (
            <div className="border border-success/40 bg-success/10 p-4 text-body-sm text-success space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={16} aria-hidden />
                ĐÃ THANH TOÁN
              </div>
              <p className="text-ink-100 text-body-xs">
                Đơn đang được xử lý. Bạn sẽ nhận key/sản phẩm qua email hoặc trong mục đơn hàng.
              </p>
            </div>
          )}

          {order.status === 'cancelled' && (
            <div className="border border-danger/40 bg-danger/10 p-4 text-body-sm text-danger space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <XCircle size={16} aria-hidden />
                ĐÃ HUỶ
              </div>
              <p className="text-ink-100 text-body-xs">
                Đơn đã bị huỷ do hết thời gian thanh toán hoặc bị admin huỷ.
              </p>
              <Link href="/cart">
                <Button variant="outline" size="sm">
                  TẠO ĐƠN MỚI
                </Button>
              </Link>
            </div>
          )}

          {(order.status === 'processing' ||
            order.status === 'delivered' ||
            order.status === 'completed') && (
            <div className="border border-electric/40 bg-electric/10 p-4 text-body-sm text-electric space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Clock size={16} aria-hidden />
                ĐANG XỬ LÝ / ĐÃ GIAO
              </div>
              <p className="text-ink-100 text-body-xs">
                Sản phẩm đang được giao tự động hoặc đã giao. Vào mục{' '}
                <Link href="/account/orders" className="underline">
                  đơn của tôi
                </Link>{' '}
                để xem chi tiết.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus: string }) {
  let label = status.toUpperCase()
  let cls = 'badge-neutral'

  if (status === 'pending' && paymentStatus === 'unpaid') {
    label = 'CHỜ THANH TOÁN'
    cls = 'badge-warning'
  } else if (paymentStatus === 'paid' || status === 'paid') {
    label = 'ĐÃ THANH TOÁN'
    cls = 'badge-electric'
  } else if (status === 'cancelled') {
    label = 'ĐÃ HUỶ'
    cls = 'badge-danger'
  } else if (status === 'delivered') {
    label = 'ĐÃ GIAO'
    cls = 'badge-electric'
  } else if (status === 'completed') {
    label = 'HOÀN TẤT'
    cls = 'badge-electric'
  } else if (status === 'processing') {
    label = 'ĐANG XỬ LÝ'
    cls = 'badge-plasma'
  }

  return <span className={cls}>{label}</span>
}
