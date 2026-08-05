import { NextRequest } from 'next/server'
import { catalogService } from '@/modules/catalog'
import { ok, fail } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * GET /api/categories — Public tree.
 */
export async function GET(req: NextRequest) {
  try {
    const data = await catalogService.listActiveCategories()
    return ok(data)
  } catch (err) {
    return fail(err, req)
  }
}
