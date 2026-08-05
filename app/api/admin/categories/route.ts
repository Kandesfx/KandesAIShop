import { NextRequest } from 'next/server'
import { catalogService } from '@/modules/catalog'
import { createCategorySchema } from '@/modules/catalog/validators'
import { requireRole } from '@/lib/auth'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireRole('staff', 'admin', 'super_admin')
    const data = await catalogService.listCategoriesForAdmin()
    return ok(data)
  } catch (err) {
    return fail(err, req)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('admin', 'super_admin')
    const body = await req.json()
    const input = parseInput(createCategorySchema, body)
    const created = await catalogService.createCategory(input, user.id, getClientIp(req))
    return ok(created, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
