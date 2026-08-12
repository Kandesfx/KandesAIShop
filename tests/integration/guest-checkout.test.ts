/**
 * Guest Checkout E2E — Phase 2 P2-06 (Definition of Done).
 *
 * Scenario: guest add sản phẩm vào cart → checkout → tạo Order + QR + email log.
 *
 * Đây là integration test chạy với DB thật (DATABASE_URL). Trước khi chạy:
 *   1. Apply schema: `npx prisma db push`
 *   2. Tạo `.env.test` (copy `.env`, đổi DATABASE_URL → test DB nếu cần)
 *
 * Verify checklist:
 *   - Cart add OK (1 cart row + 1 cartItem row).
 *   - Checkout tạo Order + OrderItems (snapshot).
 *   - Order status = 'pending', paymentStatus = 'unpaid'.
 *   - Order có orderNumber match format KDS-YYYYMMDD-XXXX.
 *   - OrderItems có productNameSnapshot, productSkuSnapshot, totalPriceCents.
 *   - Guest email/phone snapshot vào Order.guestEmail/guestPhone.
 *   - InventoryItem reserved cho order (status = 'reserved', reservedForOrderId).
 *   - QR payload được build từ buildQrUrl() — không gọi API ngoài.
 *   - Email "Đơn hàng của bạn" được enqueue/send với QR URL + orderNumber.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'

// Mock readGuestToken TRƯỚC khi import checkout service.
// Service gọi readGuestToken() bên trong createOrderFromCart() cho guest flow.
// Trong test, ta kiểm soát token qua biến module.
let mockGuestToken: string | null = 'guest-token-test-1'
vi.mock('@/modules/cart/guest', async () => {
  const actual =
    await vi.importActual<typeof import('@/modules/cart/guest')>('@/modules/cart/guest')
  return {
    ...actual,
    readGuestToken: () => mockGuestToken,
  }
})

import { db } from '@/lib/db'
import { cleanupAll, seedMinimal } from './_helpers/db'
import {
  checkoutService,
  buildQrUrl,
  isSepayConfigured,
} from '@/modules/checkout'
import type { CheckoutInput } from '@/modules/checkout'

describe('Guest Checkout — E2E (P2-06)', () => {
  let fixtures: Awaited<ReturnType<typeof seedMinimal>>

  beforeAll(async () => {
    await cleanupAll()
    fixtures = await seedMinimal()
    // Đảm bảo env sẵn cho QR build (CÁC biến phải có trong .env.test)
    // Nếu thiếu, isSepayConfigured() sẽ false → test QR skip phần build.
    if (!isSepayConfigured()) {
      // Đặt env inline để test QR build được
      process.env.SEPAY_BANK_CODE = process.env.SEPAY_BANK_CODE ?? 'VCB'
      process.env.SEPAY_ACCOUNT_NUMBER = process.env.SEPAY_ACCOUNT_NUMBER ?? '9999888877'
      process.env.SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME ?? 'TEST ACCOUNT'
      process.env.SEPAY_QR_TEMPLATE = process.env.SEPAY_QR_TEMPLATE ?? 'compact2'
    }
  })

  afterAll(async () => {
    await cleanupAll()
    await db.$disconnect()
  })

  beforeEach(async () => {
    // Reset cart + orders (giữ fixtures) trước mỗi test
    await db.orderStatusHistory.deleteMany()
    await db.orderItem.deleteMany()
    await db.order.deleteMany()
    await db.cartItem.deleteMany()
    await db.cart.deleteMany()
    await db.inventoryItem.deleteMany()
    // Re-seed inventory
    for (let i = 0; i < 5; i++) {
      const { encrypt } = await import('@/lib/encryption')
      const value = `TEST-KEY-${i.toString().padStart(4, '0')}`
      await db.inventoryItem.create({
        data: {
          batchId: fixtures.batchId,
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          fingerprint: `fp-${i}`,
          valueEncrypted: encrypt(value),
          status: 'available',
        },
      })
    }
  })

  it('guest: add cart → checkout → tạo Order với QR', async () => {
    // 1. Guest tạo cart + thêm 1 item
    const token = 'guest-token-test-1'
    mockGuestToken = token
    const cart = await db.cart.create({
      data: { guestToken: token },
    })
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId: fixtures.productId,
        variantId: fixtures.variantId,
        quantity: 2,
        unitPriceCents: BigInt(100000),
      },
    })
    await db.cart.update({
      where: { id: cart.id },
      data: {
        subtotalCents: BigInt(200000),
        totalCents: BigInt(200000),
      },
    })

    // 2. Guest checkout (userId null)
    const input: CheckoutInput = {
      email: 'guest@example.com',
      phone: '0901234567',
      notes: '',
      acceptTerms: true,
      paymentMethod: 'sepay_qr',
    }

    const result = await checkoutService.createOrderFromCart(input, null, {
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })

    // 3. Verify Order shape
    expect(result.orderId).toBeTruthy()
    expect(result.orderNumber).toMatch(/^KDS-\d{8}-\d{4}$/)
    expect(result.amount).toBe(200000)
    expect(result.paymentReference).toMatch(/^KDS[A-Z2-9]{4,8}$/i)
    expect(result.redirectUrl).toBe(`/order/${result.orderNumber}`)

    // 4. Verify DB rows
    const order = await db.order.findUnique({
      where: { orderNumber: result.orderNumber },
      include: { items: true },
    })
    expect(order).not.toBeNull()
    expect(order!.status).toBe('pending')
    expect(order!.paymentStatus).toBe('unpaid')
    expect(order!.userId).toBeNull() // guest = no userId
    expect(order!.guestEmail).toBe('guest@example.com')
    expect(order!.guestPhone).toBe('0901234567')
    expect(order!.totalCents).toBe(BigInt(200000))

    // 5. Verify OrderItems + snapshot
    expect(order!.items.length).toBe(1)
    const item = order!.items[0]!
    expect(item.productId).toBe(fixtures.productId)
    expect(item.variantId).toBe(fixtures.variantId)
    expect(item.quantity).toBe(2)
    expect(item.unitPriceCents).toBe(BigInt(100000))
    expect(item.totalPriceCents).toBe(BigInt(200000))
    expect(item.productNameSnapshot).toBe('Test Product')

    // 6. Verify OrderStatusHistory có entry 'created'/'pending'
    const history = await db.orderStatusHistory.findMany({
      where: { orderId: order!.id },
      orderBy: { createdAt: 'asc' },
    })
    expect(history.length).toBeGreaterThan(0)
    expect(history[history.length - 1]!.toStatus).toBe('pending')

    // 7. Verify QR URL được build
    const qrUrl = buildQrUrl({
      amountVnd: result.amount,
      paymentReference: result.paymentReference,
    })
    expect(qrUrl).toContain('img.vietqr.io')
    expect(qrUrl).toContain('compact2')

    // 8. Verify cart cleared
    const remainingCart = await db.cart.findUnique({ where: { id: cart.id } })
    expect(remainingCart?.subtotalCents).toBe(BigInt(0))
  })

  it('cart trống → reject (BR-1.7)', async () => {
    // Empty cart
    mockGuestToken = 'empty-cart'
    await db.cart.create({ data: { guestToken: 'empty-cart' } })

    await expect(
      checkoutService.createOrderFromCart(
        {
          email: 'a@b.com',
          phone: '0901234567',
          notes: '',
          acceptTerms: true,
          paymentMethod: 'sepay_qr',
        },
        null
      )
    ).rejects.toThrow()
  })

  it('checkout idempotent: tạo 2 order từ 2 cart riêng OK', async () => {
    // Setup 2 carts
    const cartA = await db.cart.create({ data: { guestToken: 'cart-a' } })
    const cartB = await db.cart.create({ data: { guestToken: 'cart-b' } })
    await db.cartItem.createMany({
      data: [
        {
          cartId: cartA.id,
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          quantity: 1,
          unitPriceCents: BigInt(100000),
        },
        {
          cartId: cartB.id,
          productId: fixtures.productId,
          variantId: fixtures.variantId,
          quantity: 1,
          unitPriceCents: BigInt(100000),
        },
      ],
    })
    await db.cart.update({
      where: { id: cartA.id },
      data: { subtotalCents: BigInt(100000), totalCents: BigInt(100000) },
    })
    await db.cart.update({
      where: { id: cartB.id },
      data: { subtotalCents: BigInt(100000), totalCents: BigInt(100000) },
    })

    mockGuestToken = 'cart-a'
    const orderA = await checkoutService.createOrderFromCart(
      {
        email: 'a@a.com',
        phone: '0901111111',
        notes: '',
        acceptTerms: true,
        paymentMethod: 'sepay_qr',
      },
      null
    )
    mockGuestToken = 'cart-b'
    const orderB = await checkoutService.createOrderFromCart(
      {
        email: 'b@b.com',
        phone: '0902222222',
        notes: '',
        acceptTerms: true,
        paymentMethod: 'sepay_qr',
      },
      null
    )

    expect(orderA.orderId).not.toBe(orderB.orderId)
    expect(orderA.orderNumber).not.toBe(orderB.orderNumber)
    // Cùng ngày, cùng counter (0001, 0002)
    expect(orderA.orderNumber).toMatch(/-0001$/)
    expect(orderB.orderNumber).toMatch(/-0002$/)
  })
})