import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { userAdminService } from '@/modules/user-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/[id]/impersonate
 *
 * Tạo token để đăng nhập thay user.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)
    }

    // Chỉ super_admin mới được impersonate
    if (user.role !== 'super_admin') {
      return fail({ code: 'FORBIDDEN', message: 'Chỉ super_admin mới được impersonate' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:users:impersonate', ip), 10, 60 * 1000)

    const { id } = await params
    const result = await userAdminService.impersonateUser(id, user.id, ip)

    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
