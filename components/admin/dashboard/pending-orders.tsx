'use client'

import Link from 'next/link'
import { Clock, ArrowRight, CheckCircle2 } from 'lucide-react'

interface PendingOrder {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  customer: string
}

interface PendingOrdersProps {
  data: PendingOrder[]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    paid: 'bg-electric/10 text-electric border-electric/30',
    processing: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  }
  const labels: Record<string, string> = {
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    processing: 'Đang xử lý',
  }
  return (
    <span
      className={`px-2 py-0.5 rounded text-[11px] font-mono border uppercase tracking-wider ${
        styles[status] ?? 'bg-ink-700 text-ink-100 border-ink-400'
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}

export function PendingOrders({ data }: PendingOrdersProps) {
  return (
    <div className="border border-ink-400 bg-ink-800/60 p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="text-[14px] font-display font-semibold text-ink-50">Đơn hàng cần xử lý</h3>
            <div className="text-[12px] text-ink-100 mt-0.5">Các đơn hàng mới chưa hoàn tất giao cho khách</div>
          </div>
        </div>
        <Link
          href="/manage/orders"
          className="text-[12px] text-electric hover:underline flex items-center gap-1 font-mono"
        >
          Xem tất cả đơn hàng <ArrowRight size={12} />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-ink-400/60 rounded bg-ink-900/30 my-2 space-y-2">
          <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
          <div className="text-[13px] font-medium text-ink-50">Tuyệt vời! Không có đơn hàng nào đang tồn đọng</div>
          <div className="text-[12px] text-ink-100">Tất cả các đơn đã được xử lý và giao hàng thành công.</div>
        </div>
      ) : (
        <div className="overflow-x-auto border border-ink-400/60 rounded-md">
          <table className="w-full text-[13px]">
            <thead className="bg-ink-900 border-b border-ink-400/60">
              <tr className="text-[11px] text-ink-100 font-mono uppercase tracking-wider">
                <th className="text-left py-2.5 px-4">Mã đơn</th>
                <th className="text-left py-2.5 px-4">Khách hàng</th>
                <th className="text-center py-2.5 px-4">Trạng thái</th>
                <th className="text-right py-2.5 px-4">Tổng tiền</th>
                <th className="text-right py-2.5 px-4">Thời gian</th>
                <th className="text-right py-2.5 px-4">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-400/40 bg-ink-900/40">
              {data.map((order) => (
                <tr key={order.id} className="hover:bg-ink-700/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-electric">
                    <Link href={`/manage/orders/${order.id}`} className="hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-ink-50 font-medium">{order.customer || 'Khách vãng lai'}</td>
                  <td className="py-3 px-4 text-center">{statusBadge(order.status)}</td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-mono font-bold">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="py-3 px-4 text-right text-ink-100 font-mono text-[11px]">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/manage/orders/${order.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono uppercase rounded bg-electric text-ink-950 font-bold hover:bg-electric-hover transition-colors"
                    >
                      Xử lý
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
