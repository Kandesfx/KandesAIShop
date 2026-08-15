import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authorizeAdmin } from '@/lib/authorize'
import { cancelOrder } from '@/modules/order-admin/service'
import { orderIdParamSchema, schemas } from '@/modules/order-admin/validators'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/orders/:id/cancel
 *
 * Body: { reason: string }.
 * Role: admin | super_admin.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authorizeAdmin(req, 'admin:orders:cancel', 20, 60 * 1000)
    if (user instanceof Response) return user

    const { id } = orderIdParamSchema.parse(await params)
    const body = schemas.cancel.parse(await req.json())
    const result = await cancelOrder(id, body, { id: user.id, role: user.role })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
