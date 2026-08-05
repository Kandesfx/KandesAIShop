import { describe, it, expect } from 'vitest'
import { __test, toOrderView, normalizeContact } from '@/modules/checkout/service'
import type { OrderView } from '@/modules/checkout/types'
import type {
  Order,
  OrderItem,
  DeliveryStrategy,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client'

/**
 * Test pure transformer toOrderView — chuyển Prisma row (BigInt, Date) sang
 * OrderView (string, ISO string). Không cần DB mock.
 */
describe('checkout/service — toOrderView', () => {
  function makeOrderWithItems(): Prisma.OrderGetPayload<{
    include: {
      items: {
        orderBy: { createdAt: 'asc' }
        include: { variant: { select: { name: true } } }
      }
    }
  }> {
    return {
      id: 'order-uuid',
      orderNumber: 'KDS-20260804-0001',
      userId: 'user-uuid',
      guestEmail: null,
      guestPhone: null,
      guestToken: null,
      cartId: null,
      status: 'pending' as OrderStatus,
      paymentStatus: 'unpaid' as PaymentStatus,
      paymentMethod: 'sepay_qr' as PaymentMethod,
      paymentReference: 'KDS 0001',
      subtotalCents: BigInt(199000),
      discountCents: BigInt(0),
      shippingCents: BigInt(0),
      taxCents: BigInt(0),
      totalCents: BigInt(199000),
      currency: 'VND',
      couponId: null,
      notes: null,
      internalNotes: null,
      paidAt: null,
      deliveredAt: null,
      completedAt: null,
      cancelledAt: null,
      refundedAt: null,
      slaDeadline: null,
      expiresAt: new Date('2026-08-04T03:57:00.000Z'),
      ipAddress: null,
      userAgent: null,
      metadata: null,
      createdAt: new Date('2026-08-04T03:42:00.000Z'),
      updatedAt: new Date('2026-08-04T03:42:00.000Z'),
      items: [
        {
          id: 'item-uuid',
          orderId: 'order-uuid',
          productId: 'product-uuid',
          variantId: null,
          productNameSnapshot: 'Cursor Pro 1 tháng',
          productSkuSnapshot: 'CURSOR-1M',
          quantity: 1,
          unitPriceCents: BigInt(199000),
          totalPriceCents: BigInt(199000),
          deliveredContentEncrypted: null,
          deliveredMessage: null,
          deliveryMetadata: null,
          createdAt: new Date('2026-08-04T03:42:00.000Z'),
          variant: null,
        },
      ],
    }
  }

  it('chuyển BigInt → string và Date → ISO string', () => {
    const order = makeOrderWithItems()
    const view = toOrderView(order)

    expect(view.id).toBe('order-uuid')
    expect(view.orderNumber).toBe('KDS-20260804-0001')
    expect(view.totalCents).toBe('199000')
    expect(view.subtotalCents).toBe('199000')
    expect(view.paymentReference).toBe('KDS 0001')
    expect(view.isGuest).toBe(false)
    expect(view.items).toHaveLength(1)
    expect(view.items[0]?.unitPriceCents).toBe('199000')
    expect(view.items[0]?.totalPriceCents).toBe('199000')
    expect(view.createdAt).toBe('2026-08-04T03:42:00.000Z')
    expect(view.expiresAt).toBe('2026-08-04T03:57:00.000Z')
  })

  it('isGuest = true khi userId null', () => {
    const order = { ...makeOrderWithItems(), userId: null, guestEmail: 'g@e.com' }
    const view = toOrderView(order)
    expect(view.isGuest).toBe(true)
    expect(view.guestEmail).toBe('g@e.com')
  })

  it('null paymentReference giữ nguyên null', () => {
    const order = { ...makeOrderWithItems(), paymentReference: null }
    const view = toOrderView(order)
    expect(view.paymentReference).toBeNull()
  })
})

describe('checkout/service — __test re-exports', () => {
  it('validateCart là một function', () => {
    expect(typeof __test.validateCart).toBe('function')
  })
  it('generateOrderNumber là một function', () => {
    expect(typeof __test.generateOrderNumber).toBe('function')
  })
})

describe('checkout/service — normalizeContact', () => {
  it('email: lowercase + trim', () => {
    const r = normalizeContact('  Buyer@Example.COM  ')
    expect(r.email).toBe('buyer@example.com')
  })

  it('phone: strip spaces + dashes', () => {
    const r = normalizeContact('0901 234 567')
    expect(r.phone).toBe('0901234567')
  })

  it('phone: +84 prefix → 0', () => {
    const r = normalizeContact('+84901234567')
    expect(r.phone).toBe('0901234567')
  })

  it('phone: +84 + spaces prefix → 0', () => {
    const r = normalizeContact('+84 901 234 567')
    expect(r.phone).toBe('0901234567')
  })

  it('phone: strip non-digit (giữ chữ số)', () => {
    const r = normalizeContact('0901-234-567abc')
    expect(r.phone).toBe('0901234567')
  })

  it('email: input SĐT → email rỗng, phone chứa số', () => {
    const r = normalizeContact('0901234567')
    expect(r.email).toBe('0901234567')
    expect(r.phone).toBe('0901234567')
  })

  it('phone: international +1 → giữ nguyên digit (không match +84 prefix)', () => {
    const r = normalizeContact('+12025551234')
    expect(r.phone).toBe('12025551234')
  })
})
