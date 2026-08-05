/**
 * My Orders (User) — Phase 2 P2-09 Integration.
 *
 * Verify:
 *   - listUserOrders chỉ trả order của user (ownership).
 *   - getUserOrder reject order của user khác.
 *   - revealKeyForUser:
 *     - Password sai → INVALID_PASSWORD.
 *     - Status chưa delivered → NOT_DELIVERED.
 *     - Ownership khác user → 404.
 *     - Status = delivered + password đúng → decrypt key thành công.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { cleanupAll, seedMinimal, seedUser } from './_helpers/db'
import { encrypt } from '@/lib/encryption'
import {
  listUserOrders,
  getUserOrder,
  revealKeyForUser,
} from '@/modules/checkout'
import { AppError, NotFoundError } from '@/lib/errors'

describe('My Orders (User) — Integration (P2-09)', () => {
  let fixtures: Awaited<ReturnType<typeof seedMinimal>>
  let userA: Awaited<ReturnType<typeof seedUser>>
  let userB: Awaited<ReturnType<typeof seedUser>>
  let orderA: { id: string; orderNumber: string }

  beforeAll(async () => {
    await cleanupAll()
    fixtures = await seedMinimal()
    userA = await seedUser({ email: 'alice@example.com' })
    userB = await seedUser({ email: 'bob@example.com' })
  })

  afterAll(async () => {
    await cleanupAll()
    await db.$disconnect()
  })

  beforeEach(async () => {
    await db.orderStatusHistory.deleteMany()
    await db.orderItem.deleteMany()
    await db.order.deleteMany()
    await db.inventoryItem.deleteMany()

    // Re-seed inventory
    for (let i = 0; i < 3; i++) {
      await db.inventoryItem.create({
        data: {
          batchId: fixtures.batchId,
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          fingerprint: `fp-${i}`,
          valueEncrypted: encrypt(`KEY-${i}`),
          status: 'available',
        },
      })
    }

    // Order của userA — status pending
    const order = await db.order.create({
      data: {
        orderNumber: 'KDS-20260804-0001',
        userId: userA.id,
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: 'sepay_qr',
        paymentReference: 'KDS 0001',
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
    orderA = { id: order.id, orderNumber: order.orderNumber }
  })

  describe('listUserOrders', () => {
    it('trả orders của user', async () => {
      const result = await listUserOrders(userA.id, {
        status: 'all',
        page: 1,
        limit: 20,
      })
      expect(result.items.length).toBe(1)
      expect(result.items[0]!.orderNumber).toBe(orderA.orderNumber)
      expect(result.total).toBe(1)
    })

    it('không trả order của user khác', async () => {
      // Order của userB
      await db.order.create({
        data: {
          orderNumber: 'KDS-20260804-0002',
          userId: userB.id,
          status: 'paid',
          paymentStatus: 'paid',
          paymentMethod: 'sepay_qr',
          paymentReference: 'KDS 0002',
          currency: 'VND',
          subtotalCents: BigInt(100000),
          totalCents: BigInt(100000),
        },
      })

      const resultA = await listUserOrders(userA.id, {
        status: 'all',
        page: 1,
        limit: 20,
      })
      const resultB = await listUserOrders(userB.id, {
        status: 'all',
        page: 1,
        limit: 20,
      })

      expect(resultA.items.length).toBe(1)
      expect(resultA.items[0]!.orderNumber).toBe(orderA.orderNumber)
      expect(resultB.items.length).toBe(1)
      expect(resultB.items[0]!.orderNumber).toBe('KDS-20260804-0002')
    })

    it('filter theo status', async () => {
      await db.order.create({
        data: {
          orderNumber: 'KDS-20260804-0003',
          userId: userA.id,
          status: 'paid',
          paymentStatus: 'paid',
          paymentMethod: 'sepay_qr',
          paymentReference: 'KDS 0003',
          currency: 'VND',
          subtotalCents: BigInt(100000),
          totalCents: BigInt(100000),
        },
      })

      const pending = await listUserOrders(userA.id, {
        status: 'pending',
        page: 1,
        limit: 20,
      })
      expect(pending.items.length).toBe(1)
      expect(pending.items[0]!.status).toBe('pending')

      const paid = await listUserOrders(userA.id, {
        status: 'paid',
        page: 1,
        limit: 20,
      })
      expect(paid.items.length).toBe(1)
      expect(paid.items[0]!.status).toBe('paid')
    })

    it('pagination', async () => {
      // Tạo 3 orders paid
      for (let i = 0; i < 3; i++) {
        await db.order.create({
          data: {
            orderNumber: `KDS-20260804-001${i + 1}`,
            userId: userA.id,
            status: 'paid',
            paymentStatus: 'paid',
            paymentMethod: 'sepay_qr',
            paymentReference: `KDS 001${i + 1}`,
            currency: 'VND',
            subtotalCents: BigInt(100000),
            totalCents: BigInt(100000),
          },
        })
      }

      const page1 = await listUserOrders(userA.id, {
        status: 'all',
        page: 1,
        limit: 2,
      })
      expect(page1.items.length).toBe(2)
      expect(page1.hasMore).toBe(true)

      const page2 = await listUserOrders(userA.id, {
        status: 'all',
        page: 2,
        limit: 2,
      })
      expect(page2.items.length).toBe(2)
      expect(page2.hasMore).toBe(false)
    })
  })

  describe('getUserOrder', () => {
    it('trả order của user', async () => {
      const order = await getUserOrder(userA.id, orderA.orderNumber)
      expect(order.orderNumber).toBe(orderA.orderNumber)
      expect(order.status).toBe('pending')
    })

    it('reject order của user khác (404 — không leak)', async () => {
      const otherOrder = await db.order.create({
        data: {
          orderNumber: 'KDS-20260804-9999',
          userId: userB.id,
          status: 'pending',
          paymentStatus: 'unpaid',
          paymentMethod: 'sepay_qr',
          paymentReference: 'KDS 9999',
          currency: 'VND',
          subtotalCents: BigInt(100000),
          totalCents: BigInt(100000),
        },
      })

      await expect(getUserOrder(userA.id, otherOrder.orderNumber)).rejects.toThrow(NotFoundError)
    })

    it('order không tồn tại → 404', async () => {
      await expect(getUserOrder(userA.id, 'KDS-20260804-0000')).rejects.toThrow(NotFoundError)
    })
  })

  describe('revealKeyForUser', () => {
    it('reject password sai → INVALID_PASSWORD', async () => {
      await db.order.update({
        where: { orderNumber: orderA.orderNumber },
        data: { status: 'delivered', deliveredAt: new Date() },
      })

      await expect(
        revealKeyForUser(userA.id, orderA.orderNumber, { password: 'wrong' }, userA.passwordHash)
      ).rejects.toThrow(AppError)
    })

    it('reject status chưa delivered → NOT_DELIVERED', async () => {
      // orderA status = 'pending' (chưa delivered)
      await expect(
        revealKeyForUser(
          userA.id,
          orderA.orderNumber,
          { password: userA.password },
          userA.passwordHash
        )
      ).rejects.toThrow(/chỉ có sẵn sau khi/i)
    })

    it('reject ownership khác user → 404', async () => {
      const otherOrder = await db.order.create({
        data: {
          orderNumber: 'KDS-20260804-0007',
          userId: userB.id,
          status: 'delivered',
          deliveredAt: new Date(),
          paymentStatus: 'paid',
          paymentMethod: 'sepay_qr',
          paymentReference: 'KDS 0007',
          currency: 'VND',
          subtotalCents: BigInt(100000),
          totalCents: BigInt(100000),
          items: {
            create: {
              productId: fixtures.productId,
              variantId: fixtures.variantId,
              productNameSnapshot: 'Test Product',
              productSkuSnapshot: 'TEST-SKU-001',
              quantity: 1,
              unitPriceCents: BigInt(100000),
              totalPriceCents: BigInt(100000),
              deliveredContentEncrypted: encrypt('KEY-FOR-USER-B'),
            },
          },
        },
      })

      await expect(
        revealKeyForUser(
          userA.id, // userA cố reveal order của userB
          otherOrder.orderNumber,
          { password: userA.password },
          userA.passwordHash
        )
      ).rejects.toThrow(NotFoundError)
    })

    it('delivered + password đúng → decrypt key thành công', async () => {
      // Mark order as delivered + put encrypted key vào item
      await db.order.update({
        where: { orderNumber: orderA.orderNumber },
        data: { status: 'delivered', deliveredAt: new Date() },
      })
      const item = await db.orderItem.findFirst({
        where: { orderId: orderA.id },
      })
      await db.orderItem.update({
        where: { id: item!.id },
        data: { deliveredContentEncrypted: encrypt('KEY-LEAKED-FOR-TEST') },
      })

      const result = await revealKeyForUser(
        userA.id,
        orderA.orderNumber,
        { password: userA.password },
        userA.passwordHash
      )

      expect(result.orderNumber).toBe(orderA.orderNumber)
      expect(result.items.length).toBe(1)
      expect(result.items[0]!.content).toBe('KEY-LEAKED-FOR-TEST')
    })

    it('delivered nhưng item không có key → content null', async () => {
      await db.order.update({
        where: { orderNumber: orderA.orderNumber },
        data: { status: 'delivered', deliveredAt: new Date() },
      })

      const result = await revealKeyForUser(
        userA.id,
        orderA.orderNumber,
        { password: userA.password },
        userA.passwordHash
      )

      expect(result.items.length).toBe(1)
      expect(result.items[0]!.content).toBeNull()
    })
  })
})