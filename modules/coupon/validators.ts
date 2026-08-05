import { z } from 'zod'

/**
 * Validators cho coupon module — P4-05.
 *
 * Validation ở route boundary.
 */

export const couponTypeSchema = z.enum(['percent', 'fixed'])

export const createCouponSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  type: couponTypeSchema,
  value: z.number().int().positive(),
  minOrderCents: z.bigint(),
  maxDiscountCents: z.bigint().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  maxUsesPerUser: z.number().int().positive().default(1),
  startsAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  applicableProductIds: z.array(z.string().uuid()).default([]),
  applicableCategoryIds: z.array(z.string().uuid()).default([]),
})

export const updateCouponSchema = z.object({
  type: couponTypeSchema.optional(),
  value: z.number().int().positive().optional(),
  minOrderCents: z.bigint().optional(),
  maxDiscountCents: z.bigint().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  maxUsesPerUser: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  applicableProductIds: z.array(z.string().uuid()).optional(),
  applicableCategoryIds: z.array(z.string().uuid()).optional(),
})

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  cartTotalCents: z.bigint(),
  productIds: z.array(z.string().uuid()).default([]),
  categoryIds: z.array(z.string().uuid()).default([]),
})

export type CreateCouponInput = z.infer<typeof createCouponSchema>
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>
