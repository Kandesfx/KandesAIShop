import { NextRequest } from 'next/server'
import { catalogService } from '@/modules/catalog'
import {
  updateProductSchema,
  productIdSchema,
} from '@/modules/catalog/validators'
import { requireRole } from '@/lib/auth'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole('staff', 'admin', 'super_admin')
    const { id } = parseInput(productIdSchema, params)
    const product = await catalogService.getProductForAdmin(id)
    return ok(product)
  } catch (err) {
    return fail(err, req)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('staff', 'admin', 'super_admin')
    const { id } = parseInput(productIdSchema, params)
    const body = await req.json()
    const input = parseInput(updateProductSchema, body)
    const updated = await catalogService.updateProduct(id, input, user.id, getClientIp(req))
    return ok(updated)
  } catch (err) {
    return fail(err, req)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('admin', 'super_admin')
    const { id } = parseInput(productIdSchema, params)
    await catalogService.deleteProduct(id, user.id, getClientIp(req))
    return ok({ ok: true })
  } catch (err) {
    return fail(err, req)
  }
}
