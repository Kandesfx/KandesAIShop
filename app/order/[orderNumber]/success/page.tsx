import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { OrderStatusBadge } from '@/components/account/order-status-badge'
import { OrderDetailView } from '@/components/checkout/order-detail-view'
import { getCurrentUser } from '@/lib/auth'
import { checkoutService } from '@/modules/checkout'
import { isSepayConfigured } from '@/modules/checkout'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Đặt hàng thành công · Kandes.shop',
}

/**
 * /order/[orderNumber]/success — Phase 9 C5+F4.
 *
 * Route riêng cho trạng thái "đã thanh toán / đang xử lý / đã giao / hoàn tất"
 * (F4: checkout.redirectUrl trỏ về đây sau khi OrderStatusPoller phát hiện paid).
 *
 * - Nếu order vẫn đang pending/unpaid → redirect về /order/[orderNumber] (trang
 *   chờ thanh toán có QR/countdown), tránh hiển thị "thành công" sai trạng thái.
 * - Không enable lại polling (đã ở trạng thái final hoặc gần final — poller ở
 *   trang gốc đã lo việc chuyển hướng).
 */
export default async function OrderSuccessPage({
  params,
}: {
  params: { orderNumber: string }
}) {
  const user = await getCurrentUser()
  let order
  try {
    order = await checkoutService.getOrderView(params.orderNumber, user?.id ?? null)
  } catch {
    notFound()
  }

  const isPending = order.status === 'pending' && order.paymentStatus === 'unpaid'
  if (isPending) {
    redirect(`/order/${order.orderNumber}`)
  }

  // Ở /success, isPending luôn false (đã redirect ở trên) nên showQr luôn false —
  // giữ lại logic để OrderDetailView nhận đủ props giống trang gốc.
  const showQr = false
  const qrUrl = ''

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-6 pb-6 border-b border-ink-400 space-y-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
          <Link href="/" className="hover:text-electric transition-colors">
            Trang chủ
          </Link>
          <span aria-hidden>›</span>
          <Link href={`/order/${order.orderNumber}`} className="hover:text-electric transition-colors">
            Đơn hàng
          </Link>
          <span aria-hidden>›</span>
          <span className="text-electric">Thành công</span>
        </nav>
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-ink-200 hover:text-electric text-body-sm"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden />
          Quay lại giỏ hàng
        </Link>

        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 size={20} aria-hidden />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]">
            [ ĐẶT HÀNG THÀNH CÔNG ]
          </span>
        </div>
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
        timelineStep="done"
        enablePolling={false}
        isSepayReady={isSepayConfigured()}
      />
    </div>
  )
}