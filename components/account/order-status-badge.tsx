/**
 * OrderStatusBadge — Phase 2 P2-09.
 * Shareable giữa /order/[orderNumber] (P2-07) và /account/orders/[orderNumber] (P2-09).
 *
 * Color mapping:
 *   - pending + unpaid → warning (chờ thanh toán)
 *   - paid / delivered / completed → electric (đã thanh toán / xong)
 *   - processing → plasma (đang xử lý)
 *   - cancelled → danger
 *   - refunded → plasma
 *   - khác → neutral
 */
export interface OrderStatusBadgeProps {
  status: string
  paymentStatus?: string
}

export function OrderStatusBadge({ status, paymentStatus }: OrderStatusBadgeProps) {
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
  } else if (status === 'refunded') {
    label = 'ĐÃ HOÀN TIỀN'
    cls = 'badge-plasma'
  }

  return <span className={cls}>{label}</span>
}
