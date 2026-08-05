import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reviews/[id]
 *
 * Lấy chi tiết 1 review (admin).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)
    }
    if (!['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const { id } = await params
    const { getReviewDetail } = await import('@/modules/review/admin')
    const review = await getReviewDetail(id)
    return ok(review)
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * PUT /api/admin/reviews/[id]
 *
 * Duyệt hoặc từ chối review.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)
    }
    if (!['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:reviews:moderate', ip), 30, 60 * 1000)

    const { id } = await params
    const body = await req.json()
    const { moderateReviewSchema } = await import('@/modules/review/validators')
    const parsed = moderateReviewSchema.safeParse(body)
    if (!parsed.success) {
      return fail({ code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ' }, req)
    }

    const { moderateReview } = await import('@/modules/review/admin')
    const result = await moderateReview(id, parsed.data.status, parsed.data.reply, user.id)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
