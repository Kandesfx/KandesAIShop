import { notFound } from 'next/navigation'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/account/order-status-badge'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { checkoutService } from '@/modules/checkout'
import { buildQrUrl, isSepayConfigured } from '@/modules/checkout'
import { OrderDetailView } from '@/components/checkout/order-detail-view'

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
  // D7: Timeline step — "payment" khi còn chờ thanh toán, "done" cho mọi trạng thái sau đó
  // (paid/processing/delivered/completed/cancelled — cancelled vẫn hiện "done" vì hành trình
  // đặt hàng đã kết thúc, không còn ở bước thanh toán).
  const timelineStep = isPending ? 'payment' : 'done'
  const qrUrl =
    showQr && order.paymentReference
      ? buildQrUrl({
          amountVnd: Number(order.totalCents),
          paymentReference: order.paymentReference,
        })
      : ''
  // C5+F4: khi paid, poller redirect sang /success thay vì reload trang hiện tại.
  const successHref = `/order/${order.orderNumber}/success`

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
          <OrderStatusBadge status={order.status} paymentStatus={order.paymentStatus} />
          <span className="text-ink-300">
            Tạo lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
          </span>
        </div>
      </header>

      <OrderDetailView
        order={order}
        showQr={showQr}
        qrUrl={qrUrl}
        timelineStep={timelineStep}
        onPaidHref={successHref}
        isSepayReady={isSepayConfigured()}
      />
    </div>
  )
}
