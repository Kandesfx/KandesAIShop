import { NextRequest } from 'next/server'
import { catalogService } from '@/modules/catalog'
import {
  updateCategorySchema,
  categoryIdSchema,
} from '@/modules/catalog/validators'
import { requireRole } from '@/lib/auth'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('admin', 'super_admin')
    const { id } = parseInput(categoryIdSchema, params)
    const body = await req.json()
    const input = parseInput(updateCategorySchema, body)
    const updated = await catalogService.updateCategory(id, input, user.id, getClientIp(req))
    return ok(updated)
  } catch (err) {
    return fail(err, req)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('admin', 'super_admin')
    const { id } = parseInput(categoryIdSchema, params)
    await catalogService.deleteCategory(id, user.id, getClientIp(req))
    return ok({ ok: true })
  } catch (err) {
    return fail(err, req)
  }
}
