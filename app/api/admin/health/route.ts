import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { healthService } from '@/modules/health'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/health
 * Trả về trạng thái subsystems. Cần admin.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:health', ip, user.id), 30, 60 * 1000)

    const summary = await healthService.runAll()
    return ok(summary)
  } catch (err) {
    return fail(err, req)
  }
}
