import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { deliverOrder } from '@/modules/order-admin/service'
import { orderIdParamSchema, deliverInputSchema } from '@/modules/order-admin/validators'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/orders/:id/deliver
 *
 * Body: discriminated union `{ mode: 'pick_from_stock' | 'manual_key' | 'manual_message', ... }`.
 * Role: admin | super_admin.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)
    if (!['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Chỉ admin mới giao đơn' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:orders:deliver', ip), 20, 60 * 1000)

    const { id } = orderIdParamSchema.parse(await params)
    const body = deliverInputSchema.parse(await req.json())
    const result = await deliverOrder(id, body, { id: user.id, role: user.role })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
