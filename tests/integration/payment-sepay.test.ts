/**
 * SePay Webhook + Auto-Delivery E2E — Phase 3 P3-01 + P3-04.
 *
 * Flow:
 *   1. Setup: 1 product với strategy INSTANT_AUTO, 3 inventory keys encrypted.
 *   2. Tạo order guest pending (qua cart → checkout).
 *   3. Build raw webhook body + HMAC signature (SHA-256).
 *   4. Gọi recordPayment() trực tiếp (skip HTTP layer cho test).
 *   5. Verify: order paid → processOrder() tự trigger → delivered.
 *   6. Verify inventory: 1 reserved → delivered.
 *   7. Verify OrderItem: deliveredContentEncrypted populated.
 *
 * ⚠️ KHÔNG gọi HTTP webhook route trong integration test — test logic trực tiếp.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { cleanupAll, seedMinimal } from './_helpers/db'
import {
  checkoutService,
} from '@/modules/checkout'
import { recordPayment, extractPaymentReference } from '@/modules/payment'
import { deliveryService } from '@/modules/delivery'
import type { CheckoutInput } from '@/modules/checkout'

let mockGuestToken: string | null = 'guest-token-sepay-1'

import { vi } from 'vitest'
vi.mock('@/modules/cart/guest', async () => {
  const actual =
    await vi.importActual<typeof import('@/modules/cart/guest')>('@/modules/cart/guest')
  return {
    ...actual,
    readGuestToken: () => mockGuestToken,
  }
})

describe('SePay Webhook + Auto-Delivery E2E (P3-01 + P3-04)', () => {
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
    await db.orderStatusHistory.deleteMany()
    await db.orderItem.deleteMany()
    await db.order.deleteMany()
    await db.cartItem.deleteMany()
    await db.cart.deleteMany()
    await db.delivery.deleteMany()
    await db.inventoryItem.deleteMany()
    await db.payment.deleteMany()

    // Re-seed 3 inventory items
    const { encrypt } = await import('@/lib/encryption')
    for (let i = 0; i < 3; i++) {
      await db.inventoryItem.create({
        data: {
          batchId: fixtures.batchId,
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          fingerprint: `fp-${i}`,
          valueEncrypted: encrypt(`KEY-${i.toString().padStart(4, '0')}`),
          status: 'available',
        },
      })
    }
  })

  it('SePay webhook → mark paid → auto-deliver INSTANT_AUTO', async () => {
    // 1. Setup cart + checkout
    const token = 'guest-token-sepay-1'
    mockGuestToken = token
    const cart = await db.cart.create({ data: { guestToken: token } })
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId: fixtures.productId,
        variantId: fixtures.variantId,
        quantity: 1,
        unitPriceCents: BigInt(100000),
      },
    })
    await db.cart.update({
      where: { id: cart.id },
      data: { subtotalCents: BigInt(100000), totalCents: BigInt(100000) },
    })

    const input: CheckoutInput = {
      email: 'guest@example.com',
      phone: '0901234567',
      notes: '',
      acceptTerms: true,
      paymentMethod: 'sepay_qr',
    }
    const checkout = await checkoutService.createOrderFromCart(input, null, {
      ipAddress: '127.0.0.1',
    })
    orderNumber = checkout.orderNumber

    // Verify pending
    let order = await db.order.findUnique({ where: { orderNumber } })
    expect(order!.status).toBe('pending')
    expect(order!.paymentStatus).toBe('unpaid')

    // 2. Build webhook payload
    const webhookPayload = {
      id: 987654,
      gateway: 'Vietcombank',
      transactionDate: '2026-08-04T10:00:00Z',
      accountNumber: '9999888877',
      content: `KH ${orderNumber} thanh toan`,
      transferAmount: 100000,
    }

    // Extract paymentReference — full orderNumber format
    const ref = extractPaymentReference(webhookPayload.content)
    expect(ref).toBe(orderNumber)

    // 3. Record payment
    const result = await recordPayment({
      providerTransactionId: String(webhookPayload.id),
      orderNumber: ref!,
      amountCents: BigInt(webhookPayload.transferAmount),
      transactionDate: new Date(webhookPayload.transactionDate),
      rawPayload: webhookPayload,
    })

    expect(result.kind).toBe('processed')
    if (result.kind === 'processed') {
      expect(result.orderStatus).toBe('paid')
    }

    // Verify order paid
    order = await db.order.findUnique({ where: { orderNumber } })
    expect(order!.status).toBe('paid')
    expect(order!.paymentStatus).toBe('paid')
    expect(order!.paidAt).not.toBeNull()

    // Verify Payment row
    const payments = await db.payment.findMany({ where: { orderId: order!.id } })
    expect(payments.length).toBe(1)
    expect(payments[0]!.providerTransactionId).toBe('987654')

    // 4. Auto-delivery (called from webhook handler — invoke manually ở test)
    const delivery = await deliveryService.processOrder(order!.id)
    expect(delivery.status).toBe('delivered')
    expect(delivery.strategy).toBe('INSTANT_AUTO')
    expect(delivery.deliveredItemIds.length).toBe(1)

    // Verify order delivered
    order = await db.order.findUnique({ where: { orderNumber } })
    expect(order!.status).toBe('delivered')
    expect(order!.deliveredAt).not.toBeNull()

    // Verify OrderItem: deliveredContentEncrypted populated
    const items = await db.orderItem.findMany({ where: { orderId: order!.id } })
    expect(items.length).toBe(1)
    expect(items[0]!.deliveredContentEncrypted).not.toBeNull()

    // Verify inventory: 1 delivered, 2 available
    const availableInv = await db.inventoryItem.count({
      where: { status: 'available' },
    })
    const deliveredInv = await db.inventoryItem.count({
      where: { status: 'delivered' },
    })
    expect(availableInv).toBe(2)
    expect(deliveredInv).toBe(1)

    // Verify Delivery row
    const deliveries = await db.delivery.findMany({ where: { orderId: order!.id } })
    expect(deliveries.length).toBe(0) // INSTANT_AUTO không tạo Delivery row (delivery instant)
  })

  it('idempotency: gọi recordPayment 2 lần cùng providerTransactionId → duplicate', async () => {
    const token = 'guest-token-2'
    mockGuestToken = token
    const cart = await db.cart.create({ data: { guestToken: token } })
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId: fixtures.productId,
        variantId: fixtures.variantId,
        quantity: 1,
        unitPriceCents: BigInt(100000),
      },
    })
    await db.cart.update({
      where: { id: cart.id },
      data: { subtotalCents: BigInt(100000), totalCents: BigInt(100000) },
    })

    const checkout = await checkoutService.createOrderFromCart(
      {
        email: 'a@b.com',
        phone: '0901234567',
        notes: '',
        acceptTerms: true,
        paymentMethod: 'sepay_qr',
      },
      null
    )
    orderNumber = checkout.orderNumber
    const ref = extractPaymentReference(`KH ${orderNumber}`)!

    // First call
    const first = await recordPayment({
      providerTransactionId: 'TX-IDEMPOTENT-1',
      orderNumber: ref,
      amountCents: BigInt(100000),
      transactionDate: new Date(),
      rawPayload: {},
    })
    expect(first.kind).toBe('processed')

    // Second call (same providerTransactionId)
    const second = await recordPayment({
      providerTransactionId: 'TX-IDEMPOTENT-1',
      orderNumber: ref,
      amountCents: BigInt(100000),
      transactionDate: new Date(),
      rawPayload: {},
    })
    expect(second.kind).toBe('duplicate')

    // Only 1 Payment row
    const order = await db.order.findUnique({ where: { orderNumber } })
    const payments = await db.payment.findMany({ where: { orderId: order!.id } })
    expect(payments.length).toBe(1)
  })

  it('partial payment: amount < total → status partial, không delivered', async () => {
    const token = 'guest-token-3'
    mockGuestToken = token
    const cart = await db.cart.create({ data: { guestToken: token } })
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId: fixtures.productId,
        variantId: fixtures.variantId,
        quantity: 1,
        unitPriceCents: BigInt(100000),
      },
    })
    await db.cart.update({
      where: { id: cart.id },
      data: { subtotalCents: BigInt(100000), totalCents: BigInt(100000) },
    })

    const checkout = await checkoutService.createOrderFromCart(
      {
        email: 'a@b.com',
        phone: '0901234567',
        notes: '',
        acceptTerms: true,
        paymentMethod: 'sepay_qr',
      },
      null
    )
    const ref = extractPaymentReference(`KH ${checkout.orderNumber}`)!

    const result = await recordPayment({
      providerTransactionId: 'TX-PARTIAL-1',
      orderNumber: ref,
      amountCents: BigInt(50000), // nửa tiền
      transactionDate: new Date(),
      rawPayload: {},
    })

    expect(result.kind).toBe('partial')

    const order = await db.order.findUnique({ where: { orderNumber: checkout.orderNumber } })
    expect(order!.paymentStatus).toBe('partial')
    expect(order!.status).toBe('pending') // chưa paid
  })

  it('no_match: paymentReference không khớp order nào → no_match (không persist)', async () => {
    const result = await recordPayment({
      providerTransactionId: 'TX-ORPHAN-1',
      orderNumber: 'KDS 9999',
      amountCents: BigInt(100000),
      transactionDate: new Date(),
      rawPayload: {},
    })

    expect(result.kind).toBe('no_match')

    const payments = await db.payment.findMany({})
    expect(payments.length).toBe(0)
  })
})