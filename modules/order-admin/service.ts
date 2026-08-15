/**
 * Order admin service — Phase 3 P3-05.
 *
 * Business logic for admin actions on orders:
 *   - list/get
 *   - approve / deliver (manual_key or pick_from_stock) / refund / cancel
 *   - internal note
 *
 * Role policy (D26): staff | admin | super_admin có thể READ. admin | super_admin
 * mới có thể WRITE (approve/deliver/refund/cancel/note).
 *
 * Multi-step writes dùng `db.$transaction([...])` để tránh race (consistent với
 * modules/payment + modules/delivery). Encryption xuyên suốt — plaintext key
 * KHÔNG được log, KHÔNG vào error message, chỉ đi qua OrderItem.deliveredContentEncrypted.
 */

import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  ForbiddenError,
  NotFoundError,
  OutOfStockError,
  ValidationError,
  AppError,
} from '@/lib/errors'
import { decrypt, encrypt } from '@/lib/encryption'
import * as inventoryService from '@/modules/inventory/service'
import { notifyOrderEvent } from '@/modules/notification'
import { auditService } from '@/modules/audit'
import type {
  ListOrdersInput,
  OrderListResult,
  OrderRow,
  OrderDetail,
  OrderDetailItem,
  OrderTimelineEntry,
  OrderPaymentEntry,
  RefundInput,
  CancelInput,
  NoteInput,
  DeliverInput,
  ActorContext,
} from './types'

const READ_ROLES = new Set(['staff', 'admin', 'super_admin'])
const WRITE_ROLES = new Set(['admin', 'super_admin'])

function assertRead(actor: ActorContext) {
  if (!READ_ROLES.has(actor.role)) throw new ForbiddenError('Không có quyền xem đơn hàng')
}
function assertWrite(actor: ActorContext) {
  if (!WRITE_ROLES.has(actor.role)) throw new ForbiddenError('Chỉ admin mới thao tác đơn hàng')
}

// === List ===

const DELIVERY_STRATEGIES = new Set([
  'INSTANT_AUTO',
  'MANUAL_KEY',
  'MANUAL_MESSAGE',
  'FILE_DOWNLOAD',
  'TOPUP',
  'EXTERNAL_INVITE',
])

export async function listOrders(
  input: ListOrdersInput,
  actor: ActorContext
): Promise<OrderListResult> {
  assertRead(actor)
  const { page, limit } = input
  const where: Prisma.OrderWhereInput = {}

  if (input.status && input.status !== 'all')
    where.status = input.status as Prisma.OrderWhereInput['status']
  if (input.paymentStatus && input.paymentStatus !== 'all') {
    where.paymentStatus = input.paymentStatus as Prisma.OrderWhereInput['paymentStatus']
  }
  if (input.deliveryStrategy && input.deliveryStrategy !== 'all') {
    where.items = {
      some: { product: { deliveryStrategy: input.deliveryStrategy } },
    }
  }
  if (input.search) {
    const q = input.search
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { guestEmail: { contains: q, mode: 'insensitive' } },
      { guestPhone: { contains: q } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { user: { phone: { contains: q } } },
    ]
  }
  if (input.from || input.to) {
    where.createdAt = {
      ...(input.from ? { gte: new Date(input.from) } : {}),
      ...(input.to ? { lte: new Date(input.to) } : {}),
    }
  }

  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { items: true } },
        items: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: {
            product: { select: { deliveryStrategy: true } },
          },
        },
        user: { select: { email: true, name: true, phone: true } },
      },
    }),
    db.order.count({ where }),
  ])

  const items: OrderRow[] = rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    totalCents: o.totalCents.toString(),
    currency: o.currency,
    customerName: o.user?.name ?? 'Khách lẻ',
    customerEmail: o.user?.email ?? o.guestEmail ?? '',
    customerPhone: o.user?.phone ?? o.guestPhone ?? null,
    itemCount: o._count.items,
    primaryDeliveryStrategy: o.items[0]?.product?.deliveryStrategy ?? null,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
  }))

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total,
  }
}

// === Detail ===

export async function getOrderDetail(id: string, actor: ActorContext): Promise<OrderDetail> {
  assertRead(actor)
  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true, phone: true } },
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: { select: { deliveryStrategy: true } },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')

  const items: OrderDetailItem[] = order.items.map((it) => ({
    id: it.id,
    productId: it.productId,
    variantId: it.variantId,
    productNameSnapshot: it.productNameSnapshot,
    productSkuSnapshot: it.productSkuSnapshot,
    quantity: it.quantity,
    unitPriceCents: it.unitPriceCents.toString(),
    totalPriceCents: it.totalPriceCents.toString(),
    hasDeliveredContent: it.deliveredContentEncrypted !== null || it.deliveredMessage !== null,
    deliveryStrategy: it.product?.deliveryStrategy ?? null,
  }))

  const timeline: OrderTimelineEntry[] = order.statusHistory.map((h) => ({
    id: h.id,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    changedBy: h.changedBy,
    reason: h.reason,
    createdAt: h.createdAt.toISOString(),
  }))

  const payments: OrderPaymentEntry[] = order.payments.map((p) => ({
    id: p.id,
    provider: p.provider,
    providerTransactionId: p.providerTransactionId,
    amountCents: p.amountCents.toString(),
    status: p.status,
    receivedAt: p.receivedAt ? p.receivedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }))

  // Primary strategy = strategy of the first non-null item (UI rút gọn).
  const primaryDeliveryStrategy =
    items.find((it) => DELIVERY_STRATEGIES.has(it.deliveryStrategy ?? ''))?.deliveryStrategy ?? null

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
    subtotalCents: order.subtotalCents.toString(),
    discountCents: order.discountCents.toString(),
    shippingCents: order.shippingCents.toString(),
    taxCents: order.taxCents.toString(),
    totalCents: order.totalCents.toString(),
    currency: order.currency,
    customerEmail: order.user?.email ?? order.guestEmail,
    customerPhone: order.user?.phone ?? order.guestPhone,
    customerName: order.user?.name ?? null,
    notes: order.notes,
    internalNotes: order.internalNotes,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    refundedAt: order.refundedAt ? order.refundedAt.toISOString() : null,
    expiresAt: order.expiresAt ? order.expiresAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    ipAddress: order.ipAddress,
    items,
    timeline,
    payments,
    primaryDeliveryStrategy,
  }
}

// === Approve ===

/**
 * Move order from paid → processing (manual delivery pending).
 * Idempotent: nếu đã ở processing/delivered thì no-op (log only).
 */
export async function approveOrder(id: string, actor: ActorContext): Promise<OrderDetail> {
  assertWrite(actor)
  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, status: true, paymentStatus: true },
  })
  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')

  if (
    order.status === 'processing' ||
    order.status === 'delivered' ||
    order.status === 'completed'
  ) {
    logger.info({ orderId: id, currentStatus: order.status }, 'Approve no-op')
    return getOrderDetail(id, actor)
  }

  if (order.status !== 'paid') {
    throw new AppError(
      'INVALID_STATE',
      `Chỉ approve được đơn ở trạng thái 'paid' (hiện tại '${order.status}')`,
      400
    )
  }
  if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'partial') {
    throw new AppError('INVALID_PAYMENT_STATE', 'Đơn chưa nhận đủ thanh toán', 400)
  }

  await db.$transaction([
    db.order.update({
      where: { id },
      data: { status: 'processing' },
    }),
    db.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: 'processing',
        changedBy: actor.id,
        reason: 'Admin approved',
      },
    }),
  ])

  logger.info({ orderId: id, actor: actor.id }, 'Order approved by admin')
  void auditService.record({
    actorId: actor.id,
    actorType: actor.role === 'customer' ? 'user' : 'admin',
    action: 'order.approve',
    resourceType: 'order',
    resourceId: id,
    payload: { fromStatus: order.status, toStatus: 'processing' },
  }).catch(() => {})
  return getOrderDetail(id, actor)
}

// === Deliver ===

/**
 * Admin delivers order. Multiple modes:
 *   - pick_from_stock: chọn N inventory items (UUIDs) → reserve + decrypt + re-encrypt vào OrderItem.
 *   - manual_key: paste 1 key plaintext / item → encrypt vào OrderItem.
 *   - manual_message: paste 1 message / item → lưu OrderItem.deliveredMessage.
 *
 * Order phải ở 'paid' hoặc 'processing'. Sau khi giao xong → status = 'delivered',
 * deliveredAt set, OrderStatusHistory insert. Notification `order.delivered` được enqueue.
 */
export async function deliverOrder(
  id: string,
  input: DeliverInput,
  actor: ActorContext
): Promise<OrderDetail> {
  assertWrite(actor)
  const order = await db.order.findUnique({
    where: { id },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  })
  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')

  if (order.status === 'delivered' || order.status === 'completed') {
    throw new AppError('ALREADY_DELIVERED', 'Đơn này đã được giao', 409)
  }
  if (order.status !== 'paid' && order.status !== 'processing') {
    throw new AppError(
      'INVALID_STATE',
      `Chỉ giao được đơn ở trạng thái 'paid' hoặc 'processing' (hiện tại '${order.status}')`,
      400
    )
  }

  if (input.mode === 'pick_from_stock') {
    await deliverPickFromStock(order.id, order.items, input.itemIds)
  } else if (input.mode === 'manual_key') {
    await deliverManualKey(order.id, order.items, input.keys)
  } else {
    await deliverManualMessage(order.id, order.items, input.messages)
  }

  // Snapshot OrderStatusHistory + status flip delivered.
  await db.$transaction([
    db.order.update({
      where: { id },
      data: { status: 'delivered', deliveredAt: new Date() },
    }),
    db.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: 'delivered',
        changedBy: actor.id,
        reason: `Delivered (mode=${input.mode})`,
      },
    }),
  ])

  logger.info({ orderId: id, mode: input.mode, actor: actor.id }, 'Order delivered by admin')
  void auditService.record({
    actorId: actor.id,
    actorType: actor.role === 'customer' ? 'user' : 'admin',
    action: 'order.deliver',
    resourceType: 'order',
    resourceId: id,
    payload: { mode: input.mode },
  }).catch(() => {})

  // Notification — fire-and-forget; helper itself catches no recipient case.
  void notifyOrderEvent('order.delivered', id).catch((err) => {
    logger.error({ err, orderId: id }, 'Failed to enqueue delivery notification')
  })

  return getOrderDetail(id, actor)
}

type OrderItemRow = { id: string; productId: string; variantId: string | null; quantity: number }

async function deliverPickFromStock(orderId: string, items: OrderItemRow[], itemIds: string[]) {
  if (itemIds.length !== items.length) {
    throw new ValidationError('Số lượng item key phải khớp số order item')
  }
  // Reserve + mark delivered + sửa OrderItem.deliveredContentEncrypted.
  for (let i = 0; i < itemIds.length; i++) {
    const orderItem = items[i]
    const itemId = itemIds[i]
    if (!orderItem || !itemId) {
      throw new ValidationError('Thiếu order item hoặc inventory item id')
    }
    const reserved = await inventoryService.reserveSpecificItem(itemId, orderId).catch(() => {
      throw new OutOfStockError('Item không khả dụng — admin refresh lại')
    })
    const plain = decrypt(reserved.valueEncrypted)
    await db.orderItem.update({
      where: { id: orderItem.id },
      data: {
        deliveredContentEncrypted: encrypt(plain),
        deliveryMetadata: {
          source: 'pick_from_stock',
          inventoryItemId: reserved.id,
          inventoryFingerprint: reserved.fingerprint,
        },
      },
    })
    await inventoryService.markDelivered(reserved.id)
    // We do NOT log plain.
  }
}

async function deliverManualKey(
  orderId: string,
  items: OrderItemRow[],
  keys: Array<{ orderItemId: string; key: string }>
) {
  if (keys.length !== items.length) {
    throw new ValidationError('Số key phải khớp số order item')
  }
  const keyByItem = new Map(keys.map((k) => [k.orderItemId, k.key]))
  for (const it of items) {
    const key = keyByItem.get(it.id)
    if (!key) throw new ValidationError(`Thiếu key cho order item ${it.id}`)
    await db.orderItem.update({
      where: { id: it.id },
      data: {
        deliveredContentEncrypted: encrypt(key),
        deliveryMetadata: { source: 'manual_key', orderId },
      },
    })
  }
}

async function deliverManualMessage(
  orderId: string,
  items: OrderItemRow[],
  messages: Array<{ orderItemId: string; message: string }>
) {
  if (messages.length !== items.length) {
    throw new ValidationError('Số message phải khớp số order item')
  }
  const msgByItem = new Map(messages.map((m) => [m.orderItemId, m.message]))
  for (const it of items) {
    const msg = msgByItem.get(it.id)
    if (!msg) throw new ValidationError(`Thiếu message cho order item ${it.id}`)
    await db.orderItem.update({
      where: { id: it.id },
      data: {
        deliveredMessage: msg,
        deliveryMetadata: { source: 'manual_message', orderId },
      },
    })
  }
}

// === Refund ===

/**
 * Refund → status='refunded', refundedAt set, OrderStatusHistory + reason.
 *
 * D27 (Phase 3): chỉ ghi nhận trạng thái nội bộ, KHÔNG gọi SePay API.
 * Nếu order có inventory items 'reserved' → return to stock.
 */
export async function refundOrder(
  id: string,
  input: RefundInput,
  actor: ActorContext
): Promise<OrderDetail> {
  assertWrite(actor)
  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, status: true, paymentStatus: true, totalCents: true },
  })
  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')

  if (order.status === 'refunded') {
    logger.info({ orderId: id }, 'Refund no-op — already refunded')
    return getOrderDetail(id, actor)
  }
  if (order.status === 'cancelled' || order.status === 'pending') {
    throw new AppError(
      'INVALID_STATE',
      `Không thể refund đơn ở trạng thái '${order.status}' (chỉ refund sau khi paid)`,
      400
    )
  }

  const refundAmount = BigInt(input.amountCents)
  if (refundAmount <= BigInt(0)) {
    throw new ValidationError('Số tiền hoàn phải > 0')
  }
  if (refundAmount > order.totalCents) {
    throw new ValidationError(
      `Số tiền hoàn (${refundAmount}) vượt quá tổng đơn (${order.totalCents})`
    )
  }

  // Return all reserved inventory items for this order to stock.
  const reservedItems = await db.inventoryItem.findMany({
    where: { reservedForOrderId: id },
    select: { id: true },
  })
  await db.$transaction([
    db.order.update({
      where: { id },
      data: {
        status: 'refunded',
        refundedAt: new Date(),
        paymentStatus: refundAmount === order.totalCents ? 'refunded' : order.paymentStatus,
      },
    }),
    db.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: 'refunded',
        changedBy: actor.id,
        reason: `Refund ${refundAmount}: ${input.reason}`,
      },
    }),
    ...reservedItems.map((it) =>
      db.inventoryItem.update({
        where: { id: it.id },
        data: {
          status: 'available',
          reservedForOrderId: null,
          reservedAt: null,
          returnedAt: new Date(),
        },
      })
    ),
  ])

  logger.info(
    {
      orderId: id,
      refundAmount: refundAmount.toString(),
      actor: actor.id,
      itemsReturned: reservedItems.length,
    },
    'Order refunded'
  )
  void auditService.record({
    actorId: actor.id,
    actorType: actor.role === 'customer' ? 'user' : 'admin',
    action: 'order.refund',
    resourceType: 'order',
    resourceId: id,
    payload: { refundAmount: refundAmount.toString(), reason: input.reason },
  }).catch(() => {})

  void notifyOrderEvent('order.refunded', id, input.reason).catch((err) => {
    logger.error({ err, orderId: id }, 'Failed to enqueue refund notification')
  })

  return getOrderDetail(id, actor)
}

// === Cancel ===

export async function cancelOrder(
  id: string,
  input: CancelInput,
  actor: ActorContext
): Promise<OrderDetail> {
  assertWrite(actor)
  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, status: true, paymentStatus: true },
  })
  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')

  if (order.status === 'cancelled') {
    logger.info({ orderId: id }, 'Cancel no-op — already cancelled')
    return getOrderDetail(id, actor)
  }
  if (order.status === 'delivered' || order.status === 'completed' || order.status === 'refunded') {
    throw new AppError(
      'INVALID_STATE',
      `Không thể cancel đơn ở trạng thái '${order.status}' — dùng refund thay thế`,
      400
    )
  }

  // Return any reserved inventory.
  const reservedItems = await db.inventoryItem.findMany({
    where: { reservedForOrderId: id },
    select: { id: true },
  })
  await db.$transaction([
    db.order.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    }),
    db.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: 'cancelled',
        changedBy: actor.id,
        reason: input.reason,
      },
    }),
    ...reservedItems.map((it) =>
      db.inventoryItem.update({
        where: { id: it.id },
        data: {
          status: 'available',
          reservedForOrderId: null,
          reservedAt: null,
          returnedAt: new Date(),
        },
      })
    ),
  ])

  logger.info(
    { orderId: id, actor: actor.id, itemsReturned: reservedItems.length },
    'Order cancelled'
  )
  void auditService.record({
    actorId: actor.id,
    actorType: actor.role === 'customer' ? 'user' : 'admin',
    action: 'order.cancel',
    resourceType: 'order',
    resourceId: id,
    payload: { reason: input.reason, itemsReturned: reservedItems.length },
  }).catch(() => {})

  void notifyOrderEvent('order.cancelled', id, input.reason).catch((err) => {
    logger.error({ err, orderId: id }, 'Failed to enqueue cancel notification')
  })

  return getOrderDetail(id, actor)
}

// === Note ===

export async function addInternalNote(
  id: string,
  input: NoteInput,
  actor: ActorContext
): Promise<OrderDetail> {
  assertWrite(actor)
  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, internalNotes: true },
  })
  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')

  const sep = order.internalNotes ? '\n\n---\n' : ''
  const stamp = new Date().toISOString()
  const next = `${order.internalNotes ?? ''}${sep}[${stamp}] ${actor.role}: ${input.note}`

  await db.order.update({
    where: { id },
    data: { internalNotes: next },
  })

  logger.info({ orderId: id, actor: actor.id }, 'Internal note added')
  void auditService.record({
    actorId: actor.id,
    actorType: actor.role === 'customer' ? 'user' : 'admin',
    action: 'order.note',
    resourceType: 'order',
    resourceId: id,
    payload: { noteLength: input.note.length },
  }).catch(() => {})
  return getOrderDetail(id, actor)
}

// === Barrel ===

export const orderAdminService = {
  listOrders,
  getOrderDetail,
  approveOrder,
  deliverOrder,
  refundOrder,
  cancelOrder,
  addInternalNote,
}
