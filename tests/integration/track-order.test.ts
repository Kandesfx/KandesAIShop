/**
 * Order Tracking (Guest) — Phase 2 P2-08 Integration.
 *
 * Verify:
 *   - Email match → trả OrderView đầy đủ.
 *   - Phone match (+84 prefix normalize) → trả OrderView.
 *   - Sai email + đúng orderNumber → 404 (không leak).
 *   - Sai orderNumber + đúng contact → 404.
 *   - Constant-time delay ~200ms ở cả match và không match.
 *   - Email case-insensitive (input 'Buyer@' = 'buyer@').
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { cleanupAll, seedMinimal } from './_helpers/db'
import { trackOrderByGuest } from '@/modules/checkout'

describe('Order Tracking (Guest) — Integration (P2-08)', () => {
  let fixtures: Awaited<ReturnType<typeof seedMinimal>>
  let orderNumber: string

  beforeAll(async () => {
    await cleanupAll()
    fixtures = await seedMinimal()
  })

  afterAll(async () => {
    await cleanupAll()
    await db.$disconnect()
  })

  beforeEach(async () => {
    // Reset orders (giữ fixtures)
    await db.orderStatusHistory.deleteMany()
    await db.orderItem.deleteMany()
    await db.order.deleteMany()

    // Tạo 1 order guest với email + phone
    const order = await db.order.create({
      data: {
        orderNumber: 'KDS-20260804-0001',
        userId: null,
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: 'sepay_qr',
        paymentReference: 'KDS 0001',
        guestEmail: 'guest@example.com',
        guestPhone: '0901234567',
        currency: 'VND',
        subtotalCents: BigInt(100000),
        totalCents: BigInt(100000),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        items: {
          create: {
            productId: fixtures.productId,
            variantId: fixtures.variantId,
            productNameSnapshot: 'Test Product',
            productSkuSnapshot: 'TEST-SKU-001',
            quantity: 1,
            unitPriceCents: BigInt(100000),
            totalPriceCents: BigInt(100000),
          },
        },
      },
    })
    orderNumber = order.orderNumber
  })

  it('match email → trả OrderView', async () => {
    const order = await trackOrderByGuest({
      orderNumber,
      contact: 'guest@example.com',
    })

    expect(order.orderNumber).toBe(orderNumber)
    expect(order.guestEmail).toBe('guest@example.com')
    expect(order.status).toBe('pending')
    expect(order.items.length).toBe(1)
  })

  it('email case-insensitive', async () => {
    const order = await trackOrderByGuest({
      orderNumber,
      contact: 'GUEST@Example.COM',
    })
    expect(order.orderNumber).toBe(orderNumber)
  })

  it('email có whitespace trim', async () => {
    const order = await trackOrderByGuest({
      orderNumber,
      contact: '  guest@example.com  ',
    })
    expect(order.orderNumber).toBe(orderNumber)
  })

  it('match phone exact → OK', async () => {
    const order = await trackOrderByGuest({
      orderNumber,
      contact: '0901234567',
    })
    expect(order.orderNumber).toBe(orderNumber)
  })

  it('phone với +84 prefix → OK (normalize)', async () => {
    const order = await trackOrderByGuest({
      orderNumber,
      contact: '+84901234567',
    })
    expect(order.orderNumber).toBe(orderNumber)
  })

  it('phone với spaces + +84 → OK', async () => {
    const order = await trackOrderByGuest({
      orderNumber,
      contact: '+84 901 234 567',
    })
    expect(order.orderNumber).toBe(orderNumber)
  })

  it('sai contact (đúng orderNumber) → 404', async () => {
    await expect(
      trackOrderByGuest({
        orderNumber,
        contact: 'wrong@example.com',
      })
    ).rejects.toThrow('Không tìm thấy')
  })

  it('sai orderNumber (đúng contact) → 404', async () => {
    await expect(
      trackOrderByGuest({
        orderNumber: 'KDS-20260804-9999',
        contact: 'guest@example.com',
      })
    ).rejects.toThrow('Không tìm thấy')
  })

  it('constant-time: cả match và mismatch đều ~200ms (D15)', async () => {
    const startMatch = Date.now()
    await trackOrderByGuest({ orderNumber, contact: 'guest@example.com' })
    const elapsedMatch = Date.now() - startMatch

    const startMiss = Date.now()
    await trackOrderByGuest({
      orderNumber,
      contact: 'wrong@example.com',
    }).catch(() => {})
    const elapsedMiss = Date.now() - startMiss

    // Cả 2 ≥ 180ms (cho phép ±20ms jitter)
    expect(elapsedMatch).toBeGreaterThanOrEqual(180)
    expect(elapsedMiss).toBeGreaterThanOrEqual(180)
    // Cùng khoảng (±100ms)
    expect(Math.abs(elapsedMatch - elapsedMiss)).toBeLessThan(100)
  })

  it('sai orderNumber + sai contact → 404', async () => {
    await expect(
      trackOrderByGuest({
        orderNumber: 'KDS-20260804-9999',
        contact: 'wrong@example.com',
      })
    ).rejects.toThrow('Không tìm thấy')
  })
})