import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { listOrders } from '@/modules/order-admin/service'
import { listOrdersSchema } from '@/modules/order-admin/validators'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/orders
 *
 * List orders với filter (status / paymentStatus / deliveryStrategy / search).
 * Role: staff | admin | super_admin.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)
    if (!['staff', 'admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:orders:list', ip), 60, 60 * 1000)

    const { searchParams } = new URL(req.url)
    const parsed = listOrdersSchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      paymentStatus: searchParams.get('paymentStatus') ?? undefined,
      deliveryStrategy: searchParams.get('deliveryStrategy') ?? undefined,
      search: searchParams.get('q') ?? undefined,
    })

    const result = await listOrders(parsed, { id: user.id, role: user.role })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
