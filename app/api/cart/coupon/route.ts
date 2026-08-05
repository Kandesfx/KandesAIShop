import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { couponService, applyCouponSchema } from '@/modules/coupon'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cart/coupon
 *
 * Validate và apply coupon vào cart.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('cart:coupon:apply', ip), 20, 60 * 1000)

    const user = await getCurrentUser()
    const body = await req.json()
    const parsed = applyCouponSchema.safeParse(body)
    if (!parsed.success) {
      return fail({ code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ' }, req)
    }

    const result = await couponService.validateCoupon({
      code: parsed.data.code,
      cartTotalCents: parsed.data.cartTotalCents,
      productIds: parsed.data.productIds,
      categoryIds: parsed.data.categoryIds,
      userId: user?.id,
    })

    if (!result.valid) {
      return ok({ ok: false, error: { code: 'INVALID_COUPON', message: result.error } })
    }

    return ok({
      ok: true,
      data: {
        valid: true,
        discountCents: result.discountCents.toString(),
        couponId: result.couponId,
      },
    })
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * DELETE /api/cart/coupon
 *
 * Remove coupon khỏi cart.
 */
export async function DELETE() {
  // Cart service sẽ xử lý remove coupon
  return ok({ ok: true, data: { removed: true } })
}
