import { db } from '../../lib/db'
import { logger } from '../../lib/logger'
import { NotFoundError, AppError } from '../../lib/errors'
import type { RecordPaymentInput, RecordPaymentResult } from './types'
import { PAYMENT_REFERENCE_PATTERN } from './validators'

/**
 * Payment service — Phase 3 P3-01.
 *
 * Xử lý SePay webhook:
 *   1. Idempotency: check `Payment.providerTransactionId` đã tồn tại → skip.
 *   2. Tìm order qua `paymentReference` match từ content (regex KDS \d{4}).
 *   3. So sánh amount với order.total:
 *      - amount < total → partial (lưu payment + log warning).
 *      - amount >= total → paid (cập nhật order + insert OrderStatusHistory).
 *   4. KHÔNG log raw payload (chứa PII).
 *
 * Out of scope: BullMQ queue (Phase 4). Phase 3 gọi delivery service trực tiếp
 * sau khi record payment.
 */

/** Extract paymentReference từ content — match "KDS-YYYYMMDD-XXXX" hoặc "KDS XXXX". */
export function extractPaymentReference(content: string): string | null {
  const m = content.match(PAYMENT_REFERENCE_PATTERN)
  if (!m) return null
  return m[1] ?? m[2] ?? null
}

/** Tính total paid từ các Payment rows của order (status = 'succeeded'). */
async function sumPaidCents(orderId: string): Promise<bigint> {
  const rows = await db.payment.findMany({
    where: { orderId, status: 'succeeded' },
    select: { amountCents: true },
  })
  return rows.reduce((sum, r) => sum + r.amountCents, BigInt(0))
}

/**
 * Record payment từ SePay webhook.
 *
 * Idempotent: gọi nhiều lần với cùng providerTransactionId → chỉ xử lý 1 lần.
 *
 * ⚠️ KHÔNG log content raw (chứa thông tin khách).
 */
export async function recordPayment(input: RecordPaymentInput): Promise<RecordPaymentResult> {
  const { providerTransactionId, orderNumber, amountCents, transactionDate, rawPayload } = input

  // 1. Idempotency check
  const existing = await db.payment.findUnique({
    where: { providerTransactionId },
    select: { id: true, orderId: true },
  })
  if (existing) {
    logger.info(
      { providerTransactionId, paymentId: existing.id },
      'Payment duplicate (đã xử lý trước đó)'
    )
    return { kind: 'duplicate', paymentId: existing.id }
  }

  // 2. Tìm order — extractPaymentReference trả full orderNumber (KDS-YYYYMMDD-XXXX).
  // Nếu là short ref "KDSxxxx" (6-8 alphanumeric) → tìm theo paymentReference field (set bởi checkout).
  let order = null
  if (orderNumber.match(/^KDS-\d{8}-\d{4}$/)) {
    // Full orderNumber
    order = await db.order.findUnique({
      where: { orderNumber },
      select: { id: true, totalCents: true, paymentStatus: true, status: true, paymentReference: true },
    })
  } else if (orderNumber.match(/^KDS[A-Za-z0-9]{6,8}$/)) {
    // Short ref → tìm theo paymentReference field (full short ref, e.g. KDSAB12CD)
    order = await db.order.findFirst({
      where: { paymentReference: orderNumber, paymentStatus: { in: ['unpaid', 'partial'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, totalCents: true, paymentStatus: true, status: true, paymentReference: true },
    })
  } else {
    // Format khác → không match
    order = null
  }

  if (!order) {
    // KHÔNG tạo Payment row khi không match order — tránh orphan FK violations.
    // SePay vẫn được xem là đã nhận (chuyển khoản thật), nhưng ta không biết cho order nào.
    logger.warn(
      { orderNumber, providerTransactionId, amountCents: amountCents.toString() },
      'Không tìm thấy order khớp paymentReference — bỏ qua (no_match)'
    )
    return { kind: 'no_match', orderNumber }
  }

  // 3. Persist Payment row
  const payment = await db.payment.create({
    data: {
      orderId: order.id,
      provider: 'sepay',
      providerTransactionId,
      amountCents,
      status: 'succeeded',
      receivedAt: transactionDate,
      rawPayload: rawPayload as object,
    },
  })

  // 4. So sánh amount
  const paidSoFar = (await sumPaidCents(order.id)) + BigInt(0) // vừa tạo payment trên
  const isPartial = amountCents < order.totalCents

  if (isPartial) {
    // Partial → giữ status 'awaiting', payment_status 'partial'
    await db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'partial',
      },
    })
    logger.warn(
      {
        orderId: order.id,
        orderNumber,
        amountCents: amountCents.toString(),
        totalCents: order.totalCents.toString(),
        providerTransactionId,
      },
      'Partial payment nhận được'
    )
    return { kind: 'partial', orderId: order.id, paymentId: payment.id, paidSoFar: amountCents, orderTotal: order.totalCents }
  }

  // 5. Full payment → set order paid
  await db.$transaction([
    db.order.update({
      where: { id: order.id },
      data: {
        status: 'paid',
        paymentStatus: 'paid',
        paidAt: transactionDate,
      },
    }),
    db.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: 'paid',
        reason: `Payment received (provider=${providerTransactionId})`,
      },
    }),
  ])

  logger.info(
    {
      orderId: order.id,
      orderNumber,
      paymentId: payment.id,
      amountCents: amountCents.toString(),
    },
    'Order marked paid (SePay webhook)'
  )

  return {
    kind: 'processed',
    orderId: order.id,
    paymentId: payment.id,
    orderStatus: 'paid',
  }
}

/**
 * Mark order delivered (sau khi delivery service xử lý xong).
 * Gọi từ delivery service.
 */
export async function markOrderDelivered(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, paymentStatus: true },
  })
  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')

  if (order.status === 'delivered' || order.status === 'completed') {
    logger.info({ orderId }, 'Order đã được mark delivered trước đó — skip')
    return
  }

  if (order.paymentStatus !== 'paid') {
    throw new AppError(
      'INVALID_STATE',
      'Chỉ mark delivered khi order đã paid',
      400
    )
  }

  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: {
        status: 'delivered',
        deliveredAt: new Date(),
      },
    }),
    db.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'delivered',
        reason: 'Auto-delivery completed',
      },
    }),
  ])

  logger.info({ orderId }, 'Order delivered')
}