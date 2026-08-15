/**
 * Coupon service — P4-05.
 *
 * Nghiệp vụ coupons:
 * - Admin CRUD coupon
 * - Validate khi apply
 * - Áp dụng cho sản phẩm/danh mục
 */

import { db } from '@/lib/db'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { auditService } from '@/modules/audit'
import type { CreateCouponInput, UpdateCouponInput } from './validators'

// ===== Admin CRUD =====

export async function createCoupon(input: CreateCouponInput, actorId: string) {
  // Kiểm tra code trùng
  const existing = await db.coupon.findUnique({
    where: { code: input.code },
  })
  if (existing) {
    throw new ValidationError('Mã coupon đã tồn tại')
  }

  const coupon = await db.coupon.create({
    data: {
      code: input.code.toUpperCase(),
      type: input.type,
      value: input.value,
      minOrderCents: input.minOrderCents,
      maxDiscountCents: input.maxDiscountCents ?? null,
      maxUses: input.maxUses ?? null,
      maxUsesPerUser: input.maxUsesPerUser ?? 1,
      startsAt: new Date(input.startsAt),
      expiresAt: new Date(input.expiresAt),
      applicableProductIds: input.applicableProductIds ?? [],
      applicableCategoryIds: input.applicableCategoryIds ?? [],
    },
  })

  logger.info({ couponId: coupon.id, code: coupon.code, actorId }, 'Coupon created')
  void auditService
    .record({
      actorId,
      actorType: 'admin',
      action: 'coupon.create',
      resourceType: 'coupon',
      resourceId: coupon.id,
      payload: { code: coupon.code },
    })
    .catch(() => {})
  return coupon
}

export async function updateCoupon(couponId: string, input: UpdateCouponInput, actorId: string) {
  const coupon = await db.coupon.findUnique({ where: { id: couponId } })
  if (!coupon) {
    throw new NotFoundError('Không tìm thấy coupon')
  }

  const updated = await db.coupon.update({
    where: { id: couponId },
    data: {
      type: input.type,
      value: input.value,
      minOrderCents: input.minOrderCents,
      maxDiscountCents: input.maxDiscountCents,
      maxUses: input.maxUses,
      maxUsesPerUser: input.maxUsesPerUser,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      isActive: input.isActive,
      applicableProductIds: input.applicableProductIds,
      applicableCategoryIds: input.applicableCategoryIds,
    },
  })

  logger.info({ couponId, code: updated.code }, 'Coupon updated')
  void auditService
    .record({
      actorId,
      actorType: 'admin',
      action: 'coupon.update',
      resourceType: 'coupon',
      resourceId: couponId,
      payload: { code: updated.code, isActive: input.isActive },
    })
    .catch(() => {})
  return updated
}

export async function deleteCoupon(couponId: string, actorId: string) {
  const coupon = await db.coupon.findUnique({ where: { id: couponId } })
  if (!coupon) {
    throw new NotFoundError('Không tìm thấy coupon')
  }

  await db.coupon.delete({ where: { id: couponId } })
  logger.info({ couponId, code: coupon.code }, 'Coupon deleted')
  void auditService
    .record({
      actorId,
      actorType: 'admin',
      action: 'coupon.delete',
      resourceType: 'coupon',
      resourceId: couponId,
      payload: { code: coupon.code },
    })
    .catch(() => {})
}

export async function getCouponById(couponId: string) {
  const coupon = await db.coupon.findUnique({ where: { id: couponId } })
  if (!coupon) {
    throw new NotFoundError('Không tìm thấy coupon')
  }
  return coupon
}

export async function listCoupons(page: number, limit: number, filter?: 'active' | 'expired' | 'all') {
  const skip = (page - 1) * limit

  const now = new Date()
  let where: Record<string, unknown> = {}

  if (filter === 'active') {
    where = { isActive: true, startsAt: { lte: now }, expiresAt: { gte: now } }
  } else if (filter === 'expired') {
    where = { OR: [{ isActive: false }, { expiresAt: { lt: now } }] }
  }

  const [coupons, total] = await Promise.all([
    db.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.coupon.count({ where }),
  ])

  return { coupons, page, limit, total, hasMore: page * limit < total }
}

// ===== Validate & Apply =====

export interface ApplyCouponParams {
  code: string
  cartTotalCents: bigint
  productIds: string[]
  categoryIds: string[]
  userId?: string // nếu có user
}

export interface ApplyCouponResult {
  valid: boolean
  discountCents: bigint
  couponId: string
  error?: string
}

export async function validateCoupon(params: ApplyCouponParams): Promise<ApplyCouponResult> {
  const { code, cartTotalCents, productIds, categoryIds, userId } = params
  const upperCode = code.toUpperCase()

  // Tìm coupon
  const coupon = await db.coupon.findUnique({ where: { code: upperCode } })
  if (!coupon) {
    return { valid: false, discountCents: 0n, couponId: '', error: 'Mã coupon không tồn tại' }
  }

  const now = new Date()

  // Kiểm tra active
  if (!coupon.isActive) {
    return { valid: false, discountCents: 0n, couponId: coupon.id, error: 'Coupon đã bị vô hiệu hoá' }
  }

  // Kiểm tra thời gian
  if (coupon.startsAt > now) {
    return { valid: false, discountCents: 0n, couponId: coupon.id, error: 'Coupon chưa bắt đầu' }
  }
  if (coupon.expiresAt < now) {
    return { valid: false, discountCents: 0n, couponId: coupon.id, error: 'Coupon đã hết hạn' }
  }

  // Kiểm tra số lần sử dụng
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, discountCents: 0n, couponId: coupon.id, error: 'Coupon đã hết lượt sử dụng' }
  }

  // Kiểm tra giá trị đơn hàng tối thiểu
  if (cartTotalCents < coupon.minOrderCents) {
    return {
      valid: false,
      discountCents: 0n,
      couponId: coupon.id,
      error: `Đơn hàng tối thiểu ${formatCurrency(Number(coupon.minOrderCents))}`,
    }
  }

  // Kiểm tra giới hạn per user
  if (userId && coupon.maxUsesPerUser > 0) {
    const usageCount = await db.couponUsage.count({
      where: { couponId: coupon.id, userId },
    })
    if (usageCount >= coupon.maxUsesPerUser) {
      return { valid: false, discountCents: 0n, couponId: coupon.id, error: 'Bạn đã sử dụng coupon này' }
    }
  }

  // Tính discount
  let discountCents: bigint
  if (coupon.type === 'percent') {
    // % giảm
    const discount = (cartTotalCents * BigInt(coupon.value)) / 100n
    // Áp dụng max discount nếu có
    if (coupon.maxDiscountCents !== null && discount > coupon.maxDiscountCents) {
      discountCents = coupon.maxDiscountCents
    } else {
      discountCents = discount
    }
  } else {
    // Giảm fixed amount
    discountCents = BigInt(coupon.value)
    // Không vượt quá cart total
    if (discountCents > cartTotalCents) {
      discountCents = cartTotalCents
    }
  }

  return { valid: true, discountCents, couponId: coupon.id }
}

// Ghi nhận sử dụng coupon
export async function recordCouponUsage(
  couponId: string,
  orderId: string,
  userId?: string,
  discountCents?: bigint
) {
  await Promise.all([
    db.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    }),
    db.couponUsage.create({
      data: {
        couponId,
        orderId,
        userId: userId ?? null,
        discountCents: discountCents ?? 0n,
      },
    }),
  ])
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(cents)
}

export const couponService = {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponById,
  listCoupons,
  validateCoupon,
  recordCouponUsage,
}
