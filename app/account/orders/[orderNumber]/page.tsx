import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Key, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getUserOrder } from '@/modules/checkout'
import { Card } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/account/order-status-badge'
import { RevealKeyDialog } from '@/components/account/reveal-key-dialog'
import { formatVnd, formatDate } from '@/lib/format'
import { AutoLinkText } from '@/components/ui/auto-link-text'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Chi tiết đơn hàng · Kandes.shop',
}

export default async function AccountOrderDetailPage({
  params,
}: {
  params: { orderNumber: string } | Promise<{ orderNumber: string }>
}) {
  const user = await requireUser()
  const resolvedParams = await params

  let order
  try {
    order = await getUserOrder(user.id, resolvedParams.orderNumber)
  } catch {
    notFound()
  }

  const canReveal = order.status === 'delivered' || order.status === 'completed'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="space-y-3 pb-5 border-b border-ink-400">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-ink-200 hover:text-electric text-xs font-mono transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          ← QUAY LẠI DANH SÁCH ĐƠN
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric block mb-1">
              [ MÃ ĐƠN HÀNG ]
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink-50">
              #{order.orderNumber}
            </h1>
          </div>
          <OrderStatusBadge status={order.status} paymentStatus={order.paymentStatus} />
        </div>
        <p className="text-xs text-ink-200 font-mono">
          Thời gian tạo: {formatDate(order.createdAt)}
          {order.paidAt && ` • Đã thanh toán: ${formatDate(order.paidAt)}`}
        </p>
      </header>

      {/* 1. KEY DELIVERY BOX (TỰ ĐỘNG HIỂN THỊ KHI ĐÃ GIAO) */}
      {canReveal && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-display font-semibold text-sm">
            <Key size={16} />
            <span>THÔNG TIN BẢN QUYỀN / LICENSE KEY CỦA BẠN</span>
          </div>
          <RevealKeyDialog
            orderNumber={order.orderNumber}
            orderStatus={order.status}
            autoFetch={true}
          />
        </section>
      )}

      {/* 2. PROCESSING NOTICE */}
      {(order.status === 'processing' || order.status === 'paid') && (
        <Card className="p-5 border-cyan-500/40 bg-cyan-950/20 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>ĐƠN HÀNG ĐANG ĐƯỢC XỬ LÝ VÀ CẤP KEY (2 - 10 PHÚT)</span>
          </div>
          <p className="text-ink-100 text-xs leading-relaxed">
            Hệ thống đã xác nhận thanh toán. Kỹ thuật viên đang chuẩn bị mã key bản quyền cho bạn. Key sẽ tự động hiển thị tại trang này và gửi qua email ngay khi hoàn tất.
          </p>
          <div className="p-3 bg-ink-900 border border-ink-700 rounded text-xs space-y-2 text-ink-200">
            <p className="text-ink-50 font-medium">Bạn cần hỗ trợ gấp hoặc kích hoạt ngay?</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://zalo.me/0865834117"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded font-mono text-[11px]"
              >
                💬 Zalo Admin: 0865.834.117 ↗
              </a>
              <a
                href="https://zalo.me/g/1wpnubuk0nzczx5n8jbl"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-ink-800 text-ink-200 border border-ink-600 rounded font-mono text-[11px]"
              >
                👥 Nhóm Hỗ Trợ ↗
              </a>
            </div>
          </div>
        </Card>
      )}

      {/* 3. ORDER ITEMS */}
      <Card className="p-0 overflow-hidden border-ink-400 bg-ink-800/60">
        <div className="border-b border-ink-400/80 px-4 py-3 bg-ink-800 flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-electric">
            [ SẢN PHẨM TRONG ĐƠN · {order.items.length} ]
          </span>
        </div>
        <ul className="divide-y divide-ink-700/60">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-ink-50">{it.productNameSnapshot}</p>
                {it.variantNameSnapshot && (
                  <p className="text-xs text-ink-200 font-mono">Phân loại: {it.variantNameSnapshot}</p>
                )}
                <p className="text-xs text-ink-200 font-mono">
                  Số lượng: {it.quantity} × {formatVnd(it.unitPriceCents)}
                </p>
              </div>
              <span className="text-sm font-bold font-mono text-ink-50 self-center">
                {formatVnd(it.totalPriceCents)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* 4. TOTALS & SUMMARY */}
      <Card className="p-4 space-y-2.5 text-xs font-mono border-ink-400 bg-ink-800/60">
        <div className="flex items-center justify-between text-ink-200">
          <span>Tạm tính</span>
          <span>{formatVnd(order.subtotalCents)}</span>
        </div>
        {order.discountCents !== '0' && (
          <div className="flex items-center justify-between text-emerald-400">
            <span>Giảm giá</span>
            <span>-{formatVnd(order.discountCents)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-ink-700 text-sm font-bold text-ink-50">
          <span>Tổng tiền thanh toán</span>
          <span className="text-base text-electric">{formatVnd(order.totalCents)}</span>
        </div>
      </Card>
    </div>
  )
}
