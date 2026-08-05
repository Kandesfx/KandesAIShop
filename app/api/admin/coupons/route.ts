import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { couponService, createCouponSchema } from '@/modules/coupon'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/coupons
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page')) || 1
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
    const filter = searchParams.get('filter') as 'active' | 'expired' | 'all' | undefined

    const result = await couponService.listCoupons(page, limit, filter)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * POST /api/admin/coupons
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:coupons:create', ip), 10, 60 * 1000)

    const body = await req.json()
    const parsed = createCouponSchema.safeParse(body)
    if (!parsed.success) {
      return fail({ code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten().fieldErrors }, req)
    }

    const coupon = await couponService.createCoupon(parsed.data, user.id)
    return ok(coupon, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
