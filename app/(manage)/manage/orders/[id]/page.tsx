import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect, notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getOrderDetail } from '@/modules/order-admin/service'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE_CLASS,
  DELIVERY_LABELS,
  DELIVERY_BADGE_CLASS,
  formatVND,
  formatDate,
} from '@/lib/format'
import { ApproveButton } from '@/components/admin/orders/approve-button'
import { DeliverAction, CancelAction, RefundAction } from '@/components/admin/orders/action-buttons'
import { NoteForm } from '@/components/admin/orders/note-form'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
}

/**
 * Admin order detail — server component.
 * Read OK with staff + admin + super_admin. Action buttons are client modals
 * that call the JSON endpoints.
 */
export default async function AdminOrderDetailPage({ params }: PageProps) {
  const user = await requireRole('staff', 'admin', 'super_admin').catch(() => null)
  if (!user) redirect(`/manage/login?next=/manage/orders/${params.id}`)

  let detail
  try {
    detail = await getOrderDetail(params.id, { id: user.id, role: user.role })
  } catch {
    notFound()
  }

  const canWrite = user.role === 'admin' || user.role === 'super_admin'
  const isPaid = detail.status === 'paid'
  const isPaidOrProcessing = detail.status === 'paid' || detail.status === 'processing'
  const isActive = isPaidOrProcessing || detail.status === 'pending'
  const isTerminal =
    detail.status === 'delivered' ||
    detail.status === 'completed' ||
    detail.status === 'refunded' ||
    detail.status === 'cancelled'

  return (
    <div className="container-narrow py-10 space-y-8">
      <div className="flex flex-col gap-4 pb-6 border-b border-ink-400">
        <Link
          href="/manage/orders"
          className="inline-flex items-center gap-2 text-[11px] mono uppercase tracking-[0.12em] text-ink-200 hover:text-electric"
        >
          <ArrowLeft size={12} /> QUAY LẠI DANH SÁCH
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
              [ ADMIN / 06 / ORDERS · {detail.orderNumber} ]
            </span>
            <h1 className="text-h1 font-display">{detail.orderNumber}</h1>
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <span
                className={`text-[10px] font-mono uppercase ${ORDER_STATUS_BADGE_CLASS[detail.status] ?? 'badge-neutral'}`}
              >
                {ORDER_STATUS_LABELS[detail.status] ?? detail.status}
              </span>
              <span
                className={`text-[10px] font-mono uppercase ${PAYMENT_STATUS_BADGE_CLASS[detail.paymentStatus] ?? 'badge-neutral'}`}
              >
                {PAYMENT_STATUS_LABELS[detail.paymentStatus] ?? detail.paymentStatus}
              </span>
              <span className="text-ink-200 mono">{formatVND(detail.totalCents)}</span>
            </div>
          </div>
        </div>
      </div>

      {canWrite && (
        <section className="border border-ink-400 p-4 space-y-3">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-200">
            HÀNH ĐỘNG
          </h2>
          <div className="flex flex-wrap gap-2">
            {isPaid && <ApproveButton orderId={detail.id} />}
            {isPaidOrProcessing && (
              <DeliverAction
                orderId={detail.id}
                items={detail.items.map((it) => ({
                  id: it.id,
                  productNameSnapshot: it.productNameSnapshot,
                  variantId: it.variantId,
                }))}
                strategy={detail.primaryDeliveryStrategy}
              />
            )}
            {(isPaid || detail.status === 'processing' || detail.status === 'delivered') && (
              <RefundAction orderId={detail.id} totalLabel={formatVND(detail.totalCents)} />
            )}
            {isActive && <CancelAction orderId={detail.id} />}
            <NoteForm orderId={detail.id} />
          </div>
          {isTerminal && (
            <p className="text-[11px] text-ink-200">
              Đơn ở trạng thái terminal (<span className="mono">{detail.status}</span>) — chỉ có thể
              thêm note.
            </p>
          )}
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <DetailSection title="Khách hàng">
          <Field label="Email" value={detail.customerEmail} />
          <Field label="SĐT" value={detail.customerPhone} />
          <Field label="Tên" value={detail.customerName} />
          <Field label="IP" value={detail.ipAddress} mono />
        </DetailSection>

        <DetailSection title="Thanh toán">
          <Field label="Phương thức" value={detail.paymentMethod} mono />
          <Field label="Mã tham chiếu" value={detail.paymentReference} mono />
          <Field
            label="Trạng thái"
            value={PAYMENT_STATUS_LABELS[detail.paymentStatus] ?? detail.paymentStatus}
          />
          <Field label="Đã TT lúc" value={detail.paidAt ? formatDate(detail.paidAt) : null} />
        </DetailSection>

        <DetailSection title="Tổng tiền">
          <Field label="Subtotal" value={formatVND(detail.subtotalCents)} />
          <Field label="Discount" value={formatVND(detail.discountCents)} />
          <Field label="Shipping" value={formatVND(detail.shippingCents)} />
          <Field label="Tax" value={formatVND(detail.taxCents)} />
          <Field label="Tổng" value={formatVND(detail.totalCents)} emphasis />
        </DetailSection>
      </div>

      <section className="border border-ink-400">
        <header className="flex items-center justify-between p-3 border-b border-ink-400">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-200">
            ITEMS ({detail.items.length})
          </h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-ink-800 border-b border-ink-400">
              <tr className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-200">
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">TÊN</th>
                <th className="px-3 py-2 text-right">SL</th>
                <th className="px-3 py-2 text-right">ĐƠN GIÁ</th>
                <th className="px-3 py-2 text-right">TỔNG</th>
                <th className="px-3 py-2 text-left">DELIVERY</th>
                <th className="px-3 py-2 text-center">ĐÃ GIAO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-400">
              {detail.items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-3 mono text-[11px] text-ink-200">
                    {it.productSkuSnapshot}
                  </td>
                  <td className="px-3 py-3 text-ink-50">{it.productNameSnapshot}</td>
                  <td className="px-3 py-3 text-right mono">{it.quantity}</td>
                  <td className="px-3 py-3 text-right mono">{formatVND(it.unitPriceCents)}</td>
                  <td className="px-3 py-3 text-right mono">{formatVND(it.totalPriceCents)}</td>
                  <td className="px-3 py-3">
                    {it.deliveryStrategy && (
                      <span
                        className={`text-[10px] font-mono uppercase ${DELIVERY_BADGE_CLASS[it.deliveryStrategy] ?? 'badge-neutral'}`}
                      >
                        {DELIVERY_LABELS[it.deliveryStrategy] ?? it.deliveryStrategy}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {it.hasDeliveredContent ? (
                      <span className="badge-electric text-[9px]">OK</span>
                    ) : (
                      <span className="badge-neutral text-[9px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-ink-400">
        <header className="p-3 border-b border-ink-400">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-200">
            TIMELINE ({detail.timeline.length})
          </h2>
        </header>
        <ol className="p-3 space-y-2 text-[13px]">
          {detail.timeline.length === 0 ? (
            <li className="text-ink-200 text-[12px]">Chưa có lịch sử.</li>
          ) : (
            detail.timeline.map((h) => (
              <li key={h.id} className="flex items-baseline gap-3">
                <span className="mono text-ink-200 text-[11px] whitespace-nowrap">
                  {formatDate(h.createdAt)}
                </span>
                <span className="text-ink-100">
                  <span className="text-ink-50">{h.fromStatus ?? '·'}</span>
                  {' → '}
                  <span className="text-electric">{h.toStatus}</span>
                </span>
                {h.reason && <span className="text-ink-200 text-[12px]">— {h.reason}</span>}
              </li>
            ))
          )}
        </ol>
      </section>

      <section className="border border-ink-400">
        <header className="p-3 border-b border-ink-400">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-200">
            PAYMENTS ({detail.payments.length})
          </h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-ink-800 border-b border-ink-400">
              <tr className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-200">
                <th className="px-3 py-2 text-left">PROVIDER</th>
                <th className="px-3 py-2 text-left">TX ID</th>
                <th className="px-3 py-2 text-right">SỐ TIỀN</th>
                <th className="px-3 py-2 text-left">STATUS</th>
                <th className="px-3 py-2 text-left">RECEIVED AT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-400">
              {detail.payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-ink-200 text-[12px]">
                    Chưa có payment row.
                  </td>
                </tr>
              ) : (
                detail.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-3 mono text-[11px]">{p.provider}</td>
                    <td className="px-3 py-3 mono text-[11px] text-ink-200">
                      {p.providerTransactionId ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-right mono">{formatVND(p.amountCents)}</td>
                    <td className="px-3 py-3 mono text-[11px]">{p.status}</td>
                    <td className="px-3 py-3 mono text-[11px] text-ink-200">
                      {formatDate(p.receivedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detail.internalNotes && (
        <section className="border border-ink-400">
          <header className="p-3 border-b border-ink-400">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-200">
              INTERNAL NOTES
            </h2>
          </header>
          <pre className="p-3 text-[12px] text-ink-100 whitespace-pre-wrap break-words">
            {detail.internalNotes}
          </pre>
        </section>
      )}
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-ink-400">
      <header className="p-3 border-b border-ink-400">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-200">{title}</h2>
      </header>
      <div className="p-3 space-y-2 text-[13px]">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  mono,
  emphasis,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  emphasis?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-200">
        {label}
      </span>
      <span
        className={`${mono ? 'mono' : ''} ${emphasis ? 'text-ink-50 font-medium' : 'text-ink-100'} text-right break-all`}
      >
        {value && value.length ? value : '—'}
      </span>
    </div>
  )
}
