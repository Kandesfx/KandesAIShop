import { NextRequest } from 'next/server'
import { catalogService } from '@/modules/catalog'
import { categorySlugSchema } from '@/modules/catalog/validators'
import { ok, fail, parseInput } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = parseInput(categorySlugSchema, params)
    const data = await catalogService.getCategoryBySlug(slug)
    return ok(data)
  } catch (err) {
    return fail(err, req)
  }
}
