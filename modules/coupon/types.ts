/**
 * Coupon types — P4-05.
 */

export type CouponType = 'percent' | 'fixed'

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number // % hoặc cents
  minOrderCents: bigint
  maxDiscountCents: bigint | null
  maxUses: number | null
  usedCount: number
  maxUsesPerUser: number
  startsAt: string
  expiresAt: string
  isActive: boolean
  applicableProductIds: string[]
  applicableCategoryIds: string[]
  createdAt: string
}

export interface CreateCouponInput {
  code: string
  type: CouponType
  value: number
  minOrderCents: bigint
  maxDiscountCents?: bigint | null
  maxUses?: number | null
  maxUsesPerUser?: number
  startsAt: string
  expiresAt: string
  applicableProductIds?: string[]
  applicableCategoryIds?: string[]
}

export interface UpdateCouponInput {
  type?: CouponType
  value?: number
  minOrderCents?: bigint
  maxDiscountCents?: bigint | null
  maxUses?: number | null
  maxUsesPerUser?: number
  startsAt?: string
  expiresAt?: string
  isActive?: boolean
  applicableProductIds?: string[]
  applicableCategoryIds?: string[]
}

export interface CouponValidationResult {
  valid: boolean
  error?: string
  discountCents?: bigint
}
