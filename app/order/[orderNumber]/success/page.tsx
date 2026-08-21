import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react'
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
 * /order/[orderNumber]/success
 *
 * Giao diện hoàn tất đơn hàng cao cấp, an tâm tuyệt đối, vừa vặn màn hình.
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

  const showQr = false
  const qrUrl = ''

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Top navigation & breadcrumb */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-ink-800">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-ink-300 hover:text-electric text-body-xs font-mono transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={1.5} aria-hidden />
          Quay lại giỏ hàng
        </Link>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-300"
        >
          <Link href="/" className="hover:text-electric transition-colors">
            Trang chủ
          </Link>
          <span aria-hidden>›</span>
          <Link
            href={`/order/${order.orderNumber}`}
            className="hover:text-electric transition-colors"
          >
            Đơn hàng
          </Link>
          <span aria-hidden>›</span>
          <span className="text-emerald-400 font-semibold">Thành công</span>
        </nav>
      </div>

      {/* Hero Success Banner: Siêu nổi bật, tích xanh an tâm */}
      <div className="border border-emerald-500/40 bg-gradient-to-r from-emerald-950/50 via-ink-900/90 to-ink-900/90 rounded-xl p-5 sm:p-6 mb-6 shadow-2xl shadow-emerald-500/10 backdrop-blur-md relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/80 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={28} className="text-emerald-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  ✓ THANH TOÁN THÀNH CÔNG
                </span>
                <span className="text-body-xs text-ink-300 hidden sm:inline">
                  · Giao dịch được bảo vệ 100%
                </span>
              </div>
              <h1 className="text-h2 sm:text-h1 font-display text-ink-50 font-bold flex flex-wrap items-center gap-x-2">
                <span>Đơn hàng</span>
                <span className="font-mono text-emerald-400 text-h3 sm:text-h2 bg-ink-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 select-all">
                  {order.orderNumber}
                </span>
              </h1>
              <p className="text-body-xs sm:text-body-sm text-ink-200">
                Hệ thống Kandes đã nhận được thanh toán và đang tự động xử lý bàn giao mã bản quyền.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <OrderStatusBadge status={order.status} paymentStatus={order.paymentStatus} />
          </div>
        </div>
      </div>

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