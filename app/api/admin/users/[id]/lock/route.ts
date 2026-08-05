import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { userAdminService } from '@/modules/user-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/[id]/lock
 *
 * Khoá hoặc mở khoá user.
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

    if (!['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:users:lock', ip), 30, 60 * 1000)

    const { id } = await params
    const body = await req.json()
    const newStatus = body.status as 'active' | 'locked'

    if (!['active', 'locked'].includes(newStatus)) {
      return fail({ code: 'VALIDATION_ERROR', message: 'Status không hợp lệ' }, req)
    }

    await userAdminService.setUserStatus(id, user.id, newStatus)
    return ok({ message: newStatus === 'locked' ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản' })
  } catch (err) {
    return fail(err, req)
  }
}
