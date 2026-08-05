/**
 * Public types cho checkout module.
 *
 * OrderView là shape trả về cho client — denormalize thông tin cần thiết cho
 * trang `/order/[orderNumber]` và trang `/checkout` (sau khi tạo).
 *
 * Mọi BigInt serialize thành string để JSON.stringify không throw.
 */

export type OrderItemView = {
  id: string
  productId: string
  variantId: string | null
  productNameSnapshot: string
  variantNameSnapshot: string | null
  quantity: number
  unitPriceCents: string
  totalPriceCents: string
}

export type OrderView = {
  id: string
  orderNumber: string
  status:
    | 'created'
    | 'pending'
    | 'paid'
    | 'processing'
    | 'delivered'
    | 'completed'
    | 'cancelled'
    | 'refunded'
  paymentStatus: 'unpaid' | 'awaiting' | 'paid' | 'partial' | 'refunded' | 'failed'
  paymentMethod: 'sepay_qr' | 'bank_transfer' | 'cod'
  paymentReference: string | null
  isGuest: boolean
  guestEmail: string | null
  guestPhone: string | null
  notes: string | null
  items: OrderItemView[]
  subtotalCents: string
  discountCents: string
  shippingCents: string
  taxCents: string
  totalCents: string
  currency: string
  expiresAt: string | null
  cancelledAt: string | null
  paidAt: string | null
  createdAt: string
}

/**
 * Result trả về cho client sau khi POST /api/checkout.
 * Bao gồm QR URL + countdown để client render ngay tại trang order.
 */
export type CheckoutResult = {
  orderId: string
  orderNumber: string
  qrUrl: string
  qrPayload: string
  amount: number
  paymentReference: string
  expiresAt: string
  redirectUrl: string
}
