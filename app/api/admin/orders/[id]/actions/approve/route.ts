import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authorizeAdmin } from '@/lib/authorize'
import { approveOrder } from '@/modules/order-admin/service'
import { orderIdParamSchema } from '@/modules/order-admin/validators'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/orders/:id/approve
 *
 * Paid → processing. Role: admin | super_admin.
 *
 * Authorize order: rate-limit IP → auth → role.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authorizeAdmin(req, 'admin:orders:approve', 30, 60 * 1000)
    if (user instanceof Response) return user

    const { id } = orderIdParamSchema.parse(await params)
    const result = await approveOrder(id, { id: user.id, role: user.role })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
