/**
 * Order admin module — Phase 3 P3-05.
 *
 * Admin-facing shape của Order (UI table rows, detail timeline).
 * Re-export Prisma enum membership where helpful but never expose raw
 * BigInt / Bytes to clients.
 */

export type OrderStatusFilter =
  'all' | 'pending' | 'paid' | 'processing' | 'delivered' | 'completed' | 'cancelled' | 'refunded'

export type PaymentStatusFilter =
  'all' | 'unpaid' | 'awaiting' | 'paid' | 'partial' | 'refunded' | 'failed'

export type DeliveryStrategyFilter =
  | 'all'
  | 'INSTANT_AUTO'
  | 'MANUAL_KEY'
  | 'MANUAL_MESSAGE'
  | 'FILE_DOWNLOAD'
  | 'TOPUP'
  | 'EXTERNAL_INVITE'

export type OrderRow = {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  totalCents: string
  currency: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  itemCount: number
  primaryDeliveryStrategy: string | null
  createdAt: string
  paidAt: string | null
  deliveredAt: string | null
  expiresAt: string | null
}

export type OrderListResult = {
  items: OrderRow[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export type OrderTimelineEntry = {
  id: string
  fromStatus: string | null
  toStatus: string
  changedBy: string | null
  reason: string | null
  createdAt: string
}

export type OrderPaymentEntry = {
  id: string
  provider: string
  providerTransactionId: string | null
  amountCents: string
  status: string
  receivedAt: string | null
  createdAt: string
}

export type OrderDetailItem = {
  id: string
  productId: string
  variantId: string | null
  productNameSnapshot: string
  productSkuSnapshot: string
  quantity: number
  unitPriceCents: string
  totalPriceCents: string
  hasDeliveredContent: boolean
  deliveryStrategy: string | null
}

export type OrderDetail = {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  paymentReference: string | null
  subtotalCents: string
  discountCents: string
  shippingCents: string
  taxCents: string
  totalCents: string
  currency: string
  customerEmail: string | null
  customerPhone: string | null
  customerName: string | null
  notes: string | null
  internalNotes: string | null
  paidAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  refundedAt: string | null
  expiresAt: string | null
  createdAt: string
  ipAddress: string | null
  items: OrderDetailItem[]
  timeline: OrderTimelineEntry[]
  payments: OrderPaymentEntry[]
  // Aggregate delivery strategy per item — first non-null wins; "INSTANT_AUTO" etc.
  primaryDeliveryStrategy: string | null
}

/** Action: list orders input. */
export type ListOrdersInput = {
  page: number
  limit: number
  status?: OrderStatusFilter
  paymentStatus?: PaymentStatusFilter
  deliveryStrategy?: DeliveryStrategyFilter
  search?: string
  from?: string
  to?: string
}

/** Action: deliver order — discriminated union. */
export type DeliverPickInput = { mode: 'pick_from_stock'; itemIds: string[] }
export type DeliverManualKeyInput = {
  mode: 'manual_key'
  keys: Array<{ orderItemId: string; key: string }>
}
export type DeliverManualMessageInput = {
  mode: 'manual_message'
  messages: Array<{ orderItemId: string; message: string }>
}
export type DeliverInput = DeliverPickInput | DeliverManualKeyInput | DeliverManualMessageInput

export type RefundInput = {
  amountCents: string // BigInt as string (admin enters VND; we * 1 since VND has no decimals)
  reason: string
}

export type CancelInput = {
  reason: string
}

export type NoteInput = {
  note: string
}

export type ActorContext = { id: string; role: 'customer' | 'staff' | 'admin' | 'super_admin' }
