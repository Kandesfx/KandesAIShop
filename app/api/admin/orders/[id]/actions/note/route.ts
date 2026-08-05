import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { addInternalNote } from '@/modules/order-admin/service'
import { orderIdParamSchema, schemas } from '@/modules/order-admin/validators'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/orders/:id/note
 *
 * Body: { note: string }. Append vào Order.internalNotes.
 * Role: admin | super_admin.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)
    if (!['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Chỉ admin mới thêm note' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:orders:note', ip), 30, 60 * 1000)

    const { id } = orderIdParamSchema.parse(await params)
    const body = schemas.note.parse(await req.json())
    const result = await addInternalNote(id, body, { id: user.id, role: user.role })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
