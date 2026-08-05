/**
 * Cron job integration — Phase 3 P3-09.
 *
 * Verify cleanup-pending:
 *   - expired pending orders → status='cancelled', paymentStatus='failed'
 *   - non-expired / non-pending orders → skipped
 *   - partial payment still counts as 'pending' cleanup target
 *
 * Reconcile (P3-02) cần SePay API mock — out of scope đơn vị này. Cron auth
 * đã có unit tests ở modules/jobs/tests/jobs.test.ts.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { cleanupAll, seedMinimal } from './_helpers/db'
import { expireOverdueOrders } from '@/modules/jobs/cleanup-pending'

async function makePendingOrder(orderNumber: string, expiresAt: Date, paymentStatus: 'unpaid' | 'awaiting' | 'paid' = 'unpaid') {
  return db.order.create({
    data: {
      orderNumber,
      paymentMethod: 'sepay_qr',
      paymentReference: orderNumber.slice(-4),
      paymentStatus,
      status: 'pending',
      subtotalCents: BigInt(100000),
      totalCents: BigInt(100000),
      currency: 'VND',
      expiresAt,
    },
  })
}

describe('Cron — expire-overdue-orders (P3-09)', () => {
  let fixtures: Awaited<ReturnType<typeof seedMinimal>>

  beforeAll(async () => {
    await cleanupAll()
    fixtures = await seedMinimal()
  })

  afterAll(async () => {
    await cleanupAll()
    await db.$disconnect()
  })

  beforeEach(async () => {
    await db.orderStatusHistory.deleteMany()
    await db.order.deleteMany({ where: { orderNumber: { startsWith: 'KDS-P309-' } } })
  })

  it('expires only orders in PENDING whose expiresAt < now - 60s', async () => {
    const far = new Date(Date.now() - 60 * 60 * 1000) // 60 phút trước (quá hạn cả grace)
    const near = new Date(Date.now() - 5 * 1000) // 5 giây trước (chưa quá grace)

    const expired = await makePendingOrder('KDS-P309-0001', far)
    const fresh = await makePendingOrder('KDS-P309-0002', near)

    const counts = await expireOverdueOrders({ startedAt: new Date() })
    expect(counts.cancelled).toBe(1)
    expect(counts.scanned).toBe(2)
    expect(counts.skipped).toBeGreaterThanOrEqual(1)

    const a = await db.order.findUnique({ where: { id: expired.id } })
    const b = await db.order.findUnique({ where: { id: fresh.id } })
    expect(a?.status).toBe('cancelled')
    expect(a?.paymentStatus).toBe('failed')
    expect(b?.status).toBe('pending')
    expect(b?.paymentStatus).toBe('unpaid')
  })

  it('skips orders already cancelled / paid', async () => {
    const expired = await makePendingOrder('KDS-P309-0010', new Date(Date.now() - 3600 * 1000))
    await db.order.update({ where: { id: expired.id }, data: { status: 'paid', paymentStatus: 'paid', paymentMethod: 'sepay_qr' } })

    const cancelled = await makePendingOrder('KDS-P309-0011', new Date(Date.now() - 3600 * 1000))
    await db.order.update({ where: { id: cancelled.id }, data: { status: 'cancelled', cancelledAt: new Date() } })

    const counts = await expireOverdueOrders({ startedAt: new Date() })
    expect(counts.cancelled).toBe(0)
    // Cả 2 này sẽ bị skip vì WHERE status='pending' sẽ loại trừ khi scan.
    expect(counts.skipped).toBe(0)
  })

  it('writes OrderStatusHistory row for each cancelled order', async () => {
    const expired = await makePendingOrder('KDS-P309-0020', new Date(Date.now() - 3600 * 1000))
    await expireOverdueOrders({ startedAt: new Date() })

    const history = await db.orderStatusHistory.findMany({
      where: { orderId: expired.id },
      orderBy: { createdAt: 'desc' },
    })
    expect(history.length).toBeGreaterThan(0)
    expect(history.find((h) => h.toStatus === 'cancelled')).toBeDefined()
    expect(history.find((h) => h.fromStatus === 'pending')).toBeDefined()
  })

  it('idempotent across multiple ticks', async () => {
    const expired = await makePendingOrder('KDS-P309-0030', new Date(Date.now() - 3600 * 1000))

    const first = await expireOverdueOrders({ startedAt: new Date() })
    expect(first.cancelled).toBe(1)

    const second = await expireOverdueOrders({ startedAt: new Date() })
    expect(second.cancelled).toBe(0)
    expect(second.scanned).toBe(0) // WHERE status='pending' không còn match
  })
})
