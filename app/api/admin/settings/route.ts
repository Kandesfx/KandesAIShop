import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { settingsService } from '@/modules/settings'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings
 * Trả toàn bộ categories + values (đã mask sensitive).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:settings:list', ip), 60, 60 * 1000)

    const data = await settingsService.getAllCategories()
    return ok(data)
  } catch (err) {
    return fail(err, req)
  }
}
