import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authorizeAdmin } from '@/lib/authorize'
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
    const user = await authorizeAdmin(req, 'admin:orders:note', 30, 60 * 1000)
    if (user instanceof Response) return user

    const { id } = orderIdParamSchema.parse(await params)
    const body = schemas.note.parse(await req.json())
    const result = await addInternalNote(id, body, { id: user.id, role: user.role })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
