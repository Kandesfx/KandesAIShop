import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { accountNotificationsService } from '@/modules/account/notifications'
import { updatePrefsSchema } from '@/modules/account/notifications/validators'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/notification-prefs
 * Lấy prefs hiện tại (default nếu user null). Cần auth.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return fail({ code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' }, req)
    }

    const prefs = await accountNotificationsService.getPrefs(user.id)
    return ok({ prefs })
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * PUT /api/me/notification-prefs
 * Update channels/events flags. Cần auth + rate-limit.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return fail({ code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('me:notif-prefs', ip, user.id), 30, 60 * 1000)

    const body = (await req.json().catch(() => null)) as unknown
    const parsed = updatePrefsSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          fields: parsed.error.flatten().fieldErrors,
        },
        req
      )
    }

    const next = await accountNotificationsService.updatePrefs(user.id, parsed.data)
    return ok({ prefs: next })
  } catch (err) {
    return fail(err, req)
  }
}
