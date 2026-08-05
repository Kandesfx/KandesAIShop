import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { ordersQuerySchema, listUserOrders } from '@/modules/checkout'

export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/me?status=&page=1&limit=20
 * Auth: bắt buộc.
 *
 * List đơn của user đăng nhập (P2-09). Filter theo status (enum | 'all').
 * Pagination: page (1-based), limit (1..50, default 20).
 *
 * Rate-limit: 60/min/user (lỏng vì frontend gọi khi load list).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    await rateLimitOrThrow(rateLimitKey('orders:me', user.id), 60, 60 * 1000)

    const params = Object.fromEntries(new URL(req.url).searchParams)
    const query = ordersQuerySchema.parse(params)

    const result = await listUserOrders(user.id, query)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
