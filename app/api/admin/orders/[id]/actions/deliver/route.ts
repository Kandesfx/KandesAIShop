import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authorizeAdmin } from '@/lib/authorize'
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
    const user = await authorizeAdmin(req, 'admin:orders:deliver', 20, 60 * 1000)
    if (user instanceof Response) return user

    const { id } = orderIdParamSchema.parse(await params)
    const body = deliverInputSchema.parse(await req.json())
    const result = await deliverOrder(id, body, { id: user.id, role: user.role })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
