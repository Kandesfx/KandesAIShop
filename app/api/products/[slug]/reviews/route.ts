import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { reviewService, createReviewSchema, listReviewsSchema } from '@/modules/review'
import { serialize } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

/**
 * GET /api/products/[slug]/reviews
 *
 * Lấy reviews của 1 sản phẩm (chỉ approved).
 * Không cần đăng nhập.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const ip = getClientIp(req)

    await rateLimitOrThrow(rateLimitKey('reviews:list', ip), 60, 60 * 1000)

    const { searchParams } = new URL(req.url)
    const input = listReviewsSchema.parse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 10,
      sort: searchParams.get('sort') ?? 'newest',
    })

    const { catalogService } = await import('@/modules/catalog')
    const { product } = await catalogService.getProductDetail(slug)

    const result = await reviewService.listProductReviews(
      product.id,
      input.page,
      input.limit,
      input.sort
    )

    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * POST /api/products/[slug]/reviews
 *
 * Tạo review mới.
 * Cần đăng nhập.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const ip = getClientIp(req)

    await rateLimitOrThrow(rateLimitKey('reviews:create', ip), 10, 60 * 1000)

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        serialize({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Cần đăng nhập' } }),
        { status: 401 }
      )
    }

    const body = await req.json()
    const parsed = createReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        serialize({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dữ liệu không hợp lệ',
            fields: parsed.error.flatten().fieldErrors,
          },
        }),
        { status: 400 }
      )
    }

    const { catalogService } = await import('@/modules/catalog')
    const { product } = await catalogService.getProductDetail(slug)

    const review = await reviewService.createReview(user.id, {
      ...parsed.data,
      productId: product.id,
    })

    return ok(review, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
