import { NextRequest } from 'next/server'
import { catalogService } from '@/modules/catalog'
import { productSlugSchema } from '@/modules/catalog/validators'
import { ok, fail, parseInput } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * GET /api/products/:slug — Public detail.
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = parseInput(productSlugSchema, params)
    const result = await catalogService.getProductDetail(slug)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
