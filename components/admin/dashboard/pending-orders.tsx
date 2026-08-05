'use client'

import Link from 'next/link'

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

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(cents)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-warning/20 text-warning',
    paid: 'bg-electric/20 text-electric',
    processing: 'bg-info/20 text-info',
  }
  const labels: Record<string, string> = {
    pending: 'Chờ TT',
    paid: 'Đã trả',
    processing: 'Đang xử lý',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${styles[status] ?? 'bg-ink-600 text-ink-100'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export function PendingOrders({ data }: PendingOrdersProps) {
  return (
    <div className="border border-ink-400 bg-ink-800/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-display text-ink-50">Đơn cần xử lý</h3>
        <Link href="/admin/orders" className="text-[11px] text-electric hover:underline">
          Xem tất cả →
        </Link>
      </div>

      {data.length === 0 ? (
        <p className="text-[12px] text-ink-200 py-8 text-center">Không có đơn nào</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] text-ink-200 font-mono uppercase border-b border-ink-400">
                <th className="text-left py-2 pr-4">Mã đơn</th>
                <th className="text-left py-2 pr-4">Khách</th>
                <th className="text-left py-2 pr-4">Trạng thái</th>
                <th className="text-right py-2 pr-4">Tổng</th>
                <th className="text-right py-2">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-400/30">
              {data.map((order) => (
                <tr key={order.id} className="hover:bg-ink-700/30">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-electric hover:underline font-mono"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-ink-100">
                    {order.customer}
                  </td>
                  <td className="py-3 pr-4">
                    {statusBadge(order.status)}
                  </td>
                  <td className="py-3 pr-4 text-right text-ink-50">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="py-3 text-right text-ink-200 font-mono text-[10px]">
                    {formatDate(order.createdAt)}
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
