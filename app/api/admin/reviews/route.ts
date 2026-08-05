import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reviews
 *
 * Lấy danh sách reviews (admin).
 * Có thể filter theo status.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)
    }

    if (!['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:reviews:list', ip), 60, 60 * 1000)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'pending'
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20

    const { listReviewsForAdmin } = await import('@/modules/review/admin')
    const result = await listReviewsForAdmin(status, page, limit)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
