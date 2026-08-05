import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { userAdminService } from '@/modules/user-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users
 *
 * Lấy danh sách users với search, filter.
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
    await rateLimitOrThrow(rateLimitKey('admin:users:list', ip), 60, 60 * 1000)

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page')) || 1
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
    const search = searchParams.get('search') || undefined
    const role = searchParams.get('role') || undefined
    const status = searchParams.get('status') || undefined

    const result = await userAdminService.listUsers(page, limit, search, role, status)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
