import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { userAdminService } from '@/modules/user-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users/[id]
 *
 * Lấy chi tiết 1 user.
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
    const result = await userAdminService.getUserDetail(id)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
