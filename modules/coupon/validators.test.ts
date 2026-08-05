import { describe, it, expect } from 'vitest'
import {
  createCouponSchema,
  updateCouponSchema,
  applyCouponSchema,
} from './validators'

describe('coupon validators', () => {
  describe('createCouponSchema', () => {
    it('valid với đầy đủ data', () => {
      const input = {
        code: 'SUMMER2024',
        type: 'percent',
        value: 15,
        minOrderCents: 100000n,
        maxDiscountCents: 50000n,
        maxUses: 100,
        maxUsesPerUser: 1,
        startsAt: '2024-06-01T00:00:00Z',
        expiresAt: '2024-08-31T23:59:59Z',
        applicableProductIds: [],
        applicableCategoryIds: [],
      }
      expect(createCouponSchema.safeParse(input).success).toBe(true)
    })

    it('valid với fixed type', () => {
      const input = {
        code: 'GIAM50K',
        type: 'fixed',
        value: 50000,
        minOrderCents: 100000n,
        startsAt: '2024-06-01T00:00:00Z',
        expiresAt: '2024-08-31T23:59:59Z',
      }
      expect(createCouponSchema.safeParse(input).success).toBe(true)
    })

    it('code được uppercase', () => {
      const input = {
        code: 'summer2024',
        type: 'percent',
        value: 10,
        minOrderCents: 0n,
        startsAt: '2024-06-01T00:00:00Z',
        expiresAt: '2024-08-31T23:59:59Z',
      }
      const result = createCouponSchema.parse(input)
      expect(result.code).toBe('SUMMER2024')
    })

    it('fail khi code < 3 ký tự', () => {
      const input = {
        code: 'AB',
        type: 'percent',
        value: 10,
        minOrderCents: 0n,
        startsAt: '2024-06-01T00:00:00Z',
        expiresAt: '2024-08-31T23:59:59Z',
      }
      expect(createCouponSchema.safeParse(input).success).toBe(false)
    })

    it('fail khi value <= 0', () => {
      const input = {
        code: 'TEST',
        type: 'percent',
        value: 0,
        minOrderCents: 0n,
        startsAt: '2024-06-01T00:00:00Z',
        expiresAt: '2024-08-31T23:59:59Z',
      }
      expect(createCouponSchema.safeParse(input).success).toBe(false)
    })

    it('fail khi type không hợp lệ', () => {
      const input = {
        code: 'TEST',
        type: 'invalid',
        value: 10,
        minOrderCents: 0n,
        startsAt: '2024-06-01T00:00:00Z',
        expiresAt: '2024-08-31T23:59:59Z',
      }
      expect(createCouponSchema.safeParse(input).success).toBe(false)
    })
  })

  describe('applyCouponSchema', () => {
    it('valid với đầy đủ data', () => {
      const input = {
        code: 'SUMMER2024',
        cartTotalCents: 500000n,
        productIds: [],
        categoryIds: [],
      }
      expect(applyCouponSchema.safeParse(input).success).toBe(true)
    })

    it('code được uppercase', () => {
      const input = {
        code: 'summer2024',
        cartTotalCents: 500000n,
      }
      const result = applyCouponSchema.parse(input)
      expect(result.code).toBe('SUMMER2024')
    })

    it('fail khi cartTotalCents là string', () => {
      const input = {
        code: 'TEST',
        cartTotalCents: 'invalid',
      }
      expect(applyCouponSchema.safeParse(input).success).toBe(false)
    })
  })
})
