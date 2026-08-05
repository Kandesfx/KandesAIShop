import { NextRequest } from 'next/server'
import { catalogService } from '@/modules/catalog'
import { listProductsSchema } from '@/modules/catalog/validators'
import { ok, fail, parseInput } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * GET /api/products — Public list.
 * Query: category, q, minPrice, maxPrice, sort, page, pageSize, featured
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams.entries())
    const input = parseInput(listProductsSchema, raw)
    const result = await catalogService.listPublishedProducts(input)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
