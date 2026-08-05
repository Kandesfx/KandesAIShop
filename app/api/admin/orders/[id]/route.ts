import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { getOrderDetail } from '@/modules/order-admin/service'
import { orderIdParamSchema } from '@/modules/order-admin/validators'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/orders/:id
 *
 * Chi tiết order với items, timeline, payments.
 * Role: staff | admin | super_admin.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)
    if (!['staff', 'admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:orders:detail', ip), 60, 60 * 1000)

    const { id } = orderIdParamSchema.parse(await params)
    const detail = await getOrderDetail(id, { id: user.id, role: user.role })
    return ok(detail)
  } catch (err) {
    return fail(err, req)
  }
}
