import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { getCurrentUser } from '@/lib/auth'
import { notificationAdmin } from '@/modules/notification/admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/notifications/[id]/retry
 * Reset failed/dead row → queued + retry nền processQueue.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const result = await notificationAdmin.retry(params.id, { id: user.id })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
