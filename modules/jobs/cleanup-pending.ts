/**
 * Expire overdue pending orders — Phase 3 P3-09.
 *
 * Migrate Phase 2's manual-on-poll expiry into a real cron (D13).
 * Behavior matching `modules/checkout/service.ts#expireOverdueOrder`:
 *   - status='pending'
 *   - expiresAt exists
 *   - expiresAt + 60s grace < now
 *   → set status='cancelled', paymentStatus='failed', write OrderStatusHistory.
 *
 * Idempotent: gặp lại order đã cancel → skip (status != pending).
 */

import { db } from '../../lib/db'
import { logger } from '../../lib/logger'
import type { JobHandler } from './types'

const GRACE_MS = 60 * 1000 // 60 giây sau expiresAt (đồng bộ với checkout EXPIRY_OVERDUE_GRACE_MS)
const DEFAULT_BATCH_LIMIT = 100

export const expireOverdueOrders: JobHandler<
  'scanned' | 'cancelled' | 'skipped' | 'errors'
> = async () => {
  const counts = { scanned: 0, cancelled: 0, skipped: 0, errors: 0 }
  const cutoff = new Date(Date.now() - GRACE_MS)

  const orders = await db.order.findMany({
    where: {
      status: 'pending',
      paymentStatus: { in: ['unpaid', 'awaiting', 'failed'] },
      expiresAt: { lt: cutoff },
    },
    select: { id: true, orderNumber: true, status: true, expiresAt: true },
    orderBy: { expiresAt: 'asc' },
    take: DEFAULT_BATCH_LIMIT,
  })

  counts.scanned = orders.length

  for (const order of orders) {
    try {
      // Skip race-window orders whose status vừa flip (wh-polling).
      const fresh = await db.order.findUnique({
        where: { id: order.id },
        select: { status: true, expiresAt: true, paymentStatus: true },
      })
      if (!fresh) {
        counts.skipped += 1
        continue
      }
      if (fresh.status !== 'pending') {
        counts.skipped += 1
        continue
      }
      if (!fresh.expiresAt || fresh.expiresAt > cutoff) {
        counts.skipped += 1
        continue
      }

      await db.$transaction([
        db.order.update({
          where: { id: order.id },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            paymentStatus: 'failed',
          },
        }),
        db.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: 'pending',
            toStatus: 'cancelled',
            reason: 'Auto-cancelled: payment timeout (cron BR-1.2)',
          },
        }),
      ])

      counts.cancelled += 1
    } catch (err) {
      counts.errors += 1
      logger.error(
        { err: (err as Error).message, orderId: order.id, orderNumber: order.orderNumber },
        'expire-overdue-orders: cancel error'
      )
    }
  }

  logger.info(counts, 'expire-overdue-orders: tick done')
  return counts
}
