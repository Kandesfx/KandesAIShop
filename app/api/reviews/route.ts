import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { reviewService, createReviewSchema, updateReviewSchema } from '@/modules/review'
import { serialize } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reviews - Lấy reviews của user hiện tại
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        serialize({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Cần đăng nhập' } }),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 10

    const result = await reviewService.listUserReviews(user.id, page, limit)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * POST /api/reviews - Tạo review
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        serialize({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Cần đăng nhập' } }),
        { status: 401 }
      )
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('reviews:create', ip), 10, 60 * 1000)

    const body = await req.json()
    // Extract productId từ body trước khi validate schema
    const productId = body.productId as string | undefined
    if (!productId) {
      return NextResponse.json(
        serialize({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Thiếu productId' } }),
        { status: 400 }
      )
    }

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

    const review = await reviewService.createReview(user.id, {
      ...parsed.data,
      productId,
    })
    return ok(review, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * PUT /api/reviews - Cập nhật review
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        serialize({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Cần đăng nhập' } }),
        { status: 401 }
      )
    }

    const body = await req.json()
    const parsed = updateReviewSchema.safeParse(body)
    if (!parsed.success || !body.id) {
      return NextResponse.json(
        serialize({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Thiếu review id' } }),
        { status: 400 }
      )
    }

    const review = await reviewService.updateReview(body.id, user.id, parsed.data)
    return ok(review)
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * DELETE /api/reviews - Xoá review
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        serialize({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Cần đăng nhập' } }),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const reviewId = searchParams.get('id')
    if (!reviewId) {
      return NextResponse.json(
        serialize({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Thiếu review id' } }),
        { status: 400 }
      )
    }

    await reviewService.deleteReview(reviewId, user.id)
    return ok({ message: 'Đã xoá đánh giá' })
  } catch (err) {
    return fail(err, req)
  }
}
