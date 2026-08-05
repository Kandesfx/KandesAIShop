import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { orderNumberParamSchema, getUserOrder } from '@/modules/checkout'

export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/[orderNumber]
 * Auth: bắt buộc. Ownership: order.userId === currentUser.id.
 *
 * Chi tiết đơn (P2-09). Trả OrderView (giống getOrderView trong P2-07).
 * Không tồn tại / không sở hữu → 404 NotFoundError (chung — chống enumerate).
 *
 * Rate-limit: 60/min/user (cho phép polling nhẹ + xem nhiều lần).
 */
export async function GET(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const user = await requireUser()
    await rateLimitOrThrow(rateLimitKey('orders:detail', user.id), 60, 60 * 1000)

    const parsed = orderNumberParamSchema.safeParse(params)
    if (!parsed.success) {
      return ok({ order: null }, { status: 404 })
    }

    const order = await getUserOrder(user.id, parsed.data.orderNumber)
    return ok({ order })
  } catch (err) {
    return fail(err, req)
  }
}
