import { NextRequest } from 'next/server'
import { ok, fail, parseInput } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { requireUser } from '@/lib/auth'
import { AppError } from '@/lib/errors'
import { listInventorySchema, listForAdmin } from '@/modules/inventory'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/inventory?status=&productId=&fingerprint=&page=1&limit=50
 *
 * List inventory items (admin only).
 * Filter: status, productId, variantId, fingerprint (contains).
 *
 * Rate-limit: 60/min/user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    await rateLimitOrThrow(rateLimitKey('admin:inventory:list', user.id), 60, 60 * 1000)

    const params = Object.fromEntries(new URL(req.url).searchParams)
    const input = listInventorySchema.parse(params)

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new AppError('FORBIDDEN', 'Chỉ admin mới xem kho', 403)
    }

    const result = await listForAdmin(input, user)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
