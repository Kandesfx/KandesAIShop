import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { catalogService } from '@/modules/catalog'

export const dynamic = 'force-dynamic'

/**
 * GET /api/products/[slug]/cross-sell
 *
 * "Khách cũng mua" — Phase 9 D2. Trả 4-6 sản phẩm cùng category,
 * giá trong khoảng ±30% (fallback bổ sung nếu không đủ).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const products = await catalogService.getCrossSellProducts(slug, 6)
    return ok({ products })
  } catch (err) {
    return fail(err, req)
  }
}
