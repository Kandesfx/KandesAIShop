import { NextRequest } from 'next/server'
import { ok, fail, parseInput } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { requireUser } from '@/lib/auth'
import { addStockSchema, addStock } from '@/modules/inventory'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/inventory/batches
 * Body: { productId, variantId?, values: [...], note? }
 *
 * Tạo batch + N inventory items. Phase 3 hỗ trợ 'manual' paste.
 *
 * Rate-limit: 10/min/user (bulk operations cần chặt).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    await rateLimitOrThrow(rateLimitKey('admin:inventory:add', user.id), 10, 60 * 1000)

    const body = await req.json()
    const input = parseInput(addStockSchema, body)

    const result = await addStock(input, user, 'manual')
    return ok(result, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
