import { NextRequest } from 'next/server'
import { catalogService } from '@/modules/catalog'
import { createProductSchema, listProductsSchema } from '@/modules/catalog/validators'
import { requireRole } from '@/lib/auth'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/products — List (include draft).
 * POST /api/admin/products — Create.
 * Auth: staff/admin/super_admin (Route-level guard — admin layout cũng check)
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole('staff', 'admin', 'super_admin')
    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams.entries())
    const input = parseInput(listProductsSchema, raw)
    const result = await catalogService.listProductsForAdmin({ ...input, includeUnpublished: true })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('staff', 'admin', 'super_admin')
    const body = await req.json()
    const input = parseInput(createProductSchema, body)
    const created = await catalogService.createProduct(input, user.id, getClientIp(req))
    return ok(created, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
