import Link from 'next/link'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { OrderStatusBadge } from '@/components/account/order-status-badge'
import { RevealKeyDialog } from '@/components/account/reveal-key-dialog'
import { Countdown } from '@/components/checkout/countdown'
import { QrDisplay } from '@/components/checkout/qr-display'
import { OrderStatusPoller } from '@/components/checkout/order-status-poller'
import { CheckoutTimeline, type CheckoutStep } from '@/components/checkout/checkout-timeline'
import { Button } from '@/components/ui/button'
import { formatVnd } from '@/lib/format'
import type { OrderView, SepayQrConfig } from '@/modules/checkout'

export interface OrderDetailViewProps {
  order: OrderView
  showQr: boolean
  qrUrl: string
  timelineStep: CheckoutStep
  /** Khi paid → redirect sang route này thay vì reload trang hiện tại. */
  onPaidHref?: string
  /** false ở trang /success để không hiện lại poller (đã final state). */
  enablePolling?: boolean
  isSepayReady: boolean
  bankConfig?: SepayQrConfig
}

/**
 * OrderDetailView — Phase 9 C5+F4.
 *
 * Tách phần render chi tiết đơn hàng (items/totals/QR/countdown/status blocks)
 * dùng chung giữa `/order/[orderNumber]` và `/order/[orderNumber]/success`,
 * tránh duplicate ~200 dòng JSX (F4: success page cần cùng nội dung, chỉ khác
 * header/breadcrumb + không cần poll lại nếu đã ở trạng thái final).
 */
export function OrderDetailView({
  order,
  showQr,
  qrUrl,
  timelineStep,
  onPaidHref,
  enablePolling = true,
  isSepayReady,
  bankConfig,
}: OrderDetailViewProps) {
  const isPending = order.status === 'pending' && order.paymentStatus === 'unpaid'

  return (
    <>
      <CheckoutTimeline current={timelineStep} className="pt-2" />

      {enablePolling && (
        <OrderStatusPoller
          orderNumber={order.orderNumber}
          initialStatus={order.status}
          initialPaymentStatus={order.paymentStatus}
          onPaidHref={onPaidHref}
        />
      )}

      <div className="grid lg:grid-cols-[1fr_420px] gap-6 mt-6">
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
                className="flex items-start justify-between gap-3 p-3.5 border border-ink-700 bg-ink-900/90 rounded-lg shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-ink-50 font-medium line-clamp-2 leading-tight">{it.productNameSnapshot}</p>
                  {it.variantNameSnapshot && (
                    <p className="text-ink-300 text-body-xs mt-0.5">
                      Phân loại: <span className="text-ink-100">{it.variantNameSnapshot}</span>
                    </p>
                  )}
                  <p className="text-ink-300 text-body-xs mt-1 font-mono">
                    × {it.quantity} · {formatVnd(it.unitPriceCents)}
                  </p>
                </div>
                <span className="text-ink-100 tabular-nums flex-shrink-0 text-body-sm font-semibold">
                  {formatVnd(it.totalPriceCents)}
                </span>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div className="border border-ink-700 bg-ink-900/90 rounded-lg p-4 space-y-2 text-body-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-200">Tạm tính</span>
              <span className="tabular-nums text-ink-100 font-mono">{formatVnd(order.subtotalCents)}</span>
            </div>
            {order.discountCents !== '0' && (
              <div className="flex items-center justify-between">
                <span className="text-success">Giảm giá</span>
                <span className="tabular-nums text-success font-mono">-{formatVnd(order.discountCents)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2.5 border-t border-ink-800">
              <span className="text-ink-50 font-semibold text-body-base">Tổng thanh toán</span>
              <span className="text-h3 text-electric font-bold font-mono tabular-nums">
                {formatVnd(order.totalCents)}
              </span>
            </div>
          </div>

          {order.notes && (
            <div className="border border-ink-700 bg-ink-900/90 rounded-lg p-3.5 text-body-sm">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-300 block mb-1">
                GHI CHÚ
              </span>
              <p className="text-ink-100 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {order.guestEmail && (
            <div className="border border-ink-700 bg-ink-900/90 rounded-lg p-3.5 text-body-sm space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-300 block">
                THÔNG TIN LIÊN HỆ
              </span>
              <p className="text-ink-100">
                <span className="text-ink-300">Email:</span> <span className="font-mono text-ink-50">{order.guestEmail}</span>
              </p>
              <p className="text-ink-100">
                <span className="text-ink-300">SĐT:</span> <span className="font-mono text-ink-50">{order.guestPhone}</span>
              </p>
              <p className="text-ink-300 text-body-xs mt-2 pt-2 border-t border-ink-800">
                Tra cứu đơn sau này qua trang{' '}
                <Link href="/track-order" className="text-electric hover:underline font-mono">
                  /track-order
                </Link>
                .
              </p>
            </div>
          )}

          {/* Quick Support Card */}
          <div className="border border-ink-800 bg-ink-900/60 rounded-lg p-4 text-body-xs space-y-2.5">
            <div className="flex items-center gap-2 text-ink-100 font-semibold">
              <span className="text-electric">💬</span>
              <span>CẦN HỖ TRỢ VỀ ĐƠN HÀNG NÀY?</span>
            </div>
            <p className="text-ink-300 leading-normal">
              Đội ngũ Kandes sẵn sàng hỗ trợ bạn 24/7 qua Zalo & Hotline nếu cần hướng dẫn kích hoạt hoặc giao key nhanh:
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="https://zalo.me/0865834117"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-electric/10 hover:bg-electric/20 text-electric border border-electric/30 rounded text-xs font-mono font-medium transition-colors"
              >
                <span>Zalo: 0865.834.117</span>
              </a>
              <a
                href="tel:0865834117"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink-800 hover:bg-ink-700 text-ink-100 border border-ink-700 rounded text-xs font-mono font-medium transition-colors"
              >
                <span>Hotline: 0865.834.117</span>
              </a>
            </div>
          </div>
        </section>

        {/* QR / Countdown */}
        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          {isPending && order.expiresAt && (
            <div className="border border-electric/30 bg-ink-900/90 rounded-lg p-4 space-y-2 text-center shadow-lg shadow-electric/5 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-warning animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-warning font-semibold">
                  THỜI GIAN GIỮ ĐƠN HÀNG
                </span>
              </div>
              <Countdown
                expiresAt={order.expiresAt}
                orderNumber={order.orderNumber}
                size="lg"
                className="justify-center py-1"
              />
              <p className="text-[11px] text-ink-300">
                Đơn hàng sẽ tự động huỷ nếu chưa nhận được thanh toán trong thời gian trên.
              </p>
            </div>
          )}

          {showQr && qrUrl ? (
            <QrDisplay
              qrUrl={qrUrl}
              paymentReference={order.paymentReference!}
              amount={Number(order.totalCents)}
              expiresAt={order.expiresAt!}
              bankConfig={bankConfig}
            />
          ) : isPending && !isSepayReady ? (
            <div className="border border-warning/40 bg-warning/10 p-4 text-body-sm text-warning space-y-2 rounded">
              <p className="font-semibold">Thanh toán QR chưa sẵn sàng</p>
              <p className="text-body-xs">
                Hệ thống chưa cấu hình tài khoản ngân hàng. Vui lòng liên hệ admin và quay lại sau.
              </p>
            </div>
          ) : null}

          {(order.status === 'paid' || order.status === 'processing') && (
            <div className="border border-electric/40 bg-ink-900/90 p-5 text-body-sm text-ink-100 space-y-4 rounded-sm shadow-lg shadow-electric/5">
              <div className="flex items-center gap-2.5 text-electric font-semibold text-body-base">
                <Clock size={18} className="text-electric animate-pulse flex-shrink-0" aria-hidden />
                <span>ĐƠN HÀNG ĐANG ĐƯỢC XỬ LÝ & BÀN GIAO</span>
              </div>
              <p className="text-ink-100 text-body-sm leading-relaxed">
                Hệ thống đã ghi nhận thanh toán thành công! Đơn hàng của bạn đang được kỹ thuật viên xử lý và sẽ cấp mã Key / tài khoản cho bạn sau ít phút (thông thường từ 2 - 10 phút), vui lòng chờ trong giây lát.
              </p>
              <div className="p-3.5 bg-ink-950 border border-ink-700/70 rounded text-body-xs space-y-2 text-ink-200">
                <div className="font-semibold text-ink-50 flex items-center gap-1.5">
                  <span className="text-electric">📌</span>
                  <span>Hỗ trợ kích hoạt & giải đáp thắc mắc</span>
                </div>
                <p className="text-ink-200 leading-normal">
                  Mã Key và thông tin đơn hàng sẽ được gửi qua Email của bạn. Nếu thời gian thực hiện quá lâu hoặc cần kích hoạt gấp, vui lòng liên hệ ngay với Admin:
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 font-mono text-[12px]">
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
                    className="inline-flex items-center gap-1 text-ink-300 hover:text-electric underline ml-1"
                  >
                    ❓ Câu hỏi thường gặp
                  </Link>
                </div>
              </div>
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

          {(order.status === 'delivered' || order.status === 'completed') && (
            <div className="border border-success/40 bg-success/10 p-5 text-body-sm text-success space-y-3 rounded-sm shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-body-base">
                <CheckCircle2 size={18} className="text-success" aria-hidden />
                ĐÃ BÀN GIAO KEY THÀNH CÔNG
              </div>
              {order.hasAccount && !order.isOwner ? (
                <div className="p-3.5 bg-ink-950 border border-electric/40 rounded space-y-2.5 mt-2">
                  <p className="text-ink-50 text-body-xs font-semibold flex items-center gap-1.5 text-electric">
                    🔒 ĐƠN HÀNG THUỘC TÀI KHOẢN ĐÃ ĐĂNG KÝ
                  </p>
                  <p className="text-ink-200 text-body-xs leading-relaxed">
                    Đơn hàng này được liên kết với tài khoản Kandes của bạn. Vui lòng đăng nhập để xem chi tiết và nhận mã kích hoạt bản quyền an toàn.
                  </p>
                  <div className="pt-1">
                    <Link href={`/login?callbackUrl=/order/${order.orderNumber}`}>
                      <Button variant="primary" size="sm" className="w-full">
                        ĐĂNG NHẬP ĐỂ XEM MÃ KEY
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {order.status === 'delivered' && !order.isGuest && (
                    <div className="pt-1">
                      <RevealKeyDialog orderNumber={order.orderNumber} orderStatus={order.status} />
                    </div>
                  )}
                  <p className="text-ink-100 text-body-xs leading-relaxed">
                    {order.isGuest ? (
                      <>Key/sản phẩm đã được bàn giao và gửi qua Email của bạn.</>
                    ) : (
                      <>
                        Key/sản phẩm đã có sẵn. Bạn có thể bấm nút hiển thị key ở trên hoặc vào mục{' '}
                        <Link href="/account/orders" className="underline text-electric">
                          đơn của tôi
                        </Link>{' '}
                        để xem lại bất cứ lúc nào.
                      </>
                    )}
                  </p>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
