import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { getCurrentUser } from '@/lib/auth'
import { userAdminService } from '@/modules/user-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/[id]/role
 *
 * Đổi vai trò của 1 user.
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

    const { id } = await params
    const body = await req.json()
    const { role } = body

    if (!role) {
      return fail({ code: 'BAD_REQUEST', message: 'Thiếu vai trò mới' }, req)
    }

    await userAdminService.setUserRole(id, user.id, user.role, role)
    return ok({ message: `Đã cập nhật vai trò thành công: ${role}` })
  } catch (err) {
    return fail(err, req)
  }
}
