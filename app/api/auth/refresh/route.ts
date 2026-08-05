import { NextRequest } from 'next/server'
import { authService } from '@/modules/auth'
import { setSessionCookies, clearSessionCookies, readRefreshCookie } from '@/modules/auth/session'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { UnauthorizedError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/refresh
 *
 * Đọc refresh cookie (path scoped) → rotate session → set cookies mới.
 * Nếu sai/hết hạn → clear cookies + 401.
 *
 * Client gọi khi access token sắp hết (14 phút) hoặc bị 401 từ API call khác.
 *
 * Rate-limit: 30/15min/IP (higher limit vì legitimate client refresh mỗi 15p).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('auth:refresh', ip), 30, 15 * 60 * 1000)

    const refreshToken = await readRefreshCookie()
    if (!refreshToken) {
      clearSessionCookies()
      throw new UnauthorizedError('Không có refresh token')
    }

    const result = await authService.refreshSession(refreshToken, {
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })

    if (!result) {
      clearSessionCookies()
      throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã hết hạn')
    }

    setSessionCookies({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    })

    return ok({ user: result.user, refreshExpiresAt: result.refreshExpiresAt })
  } catch (err) {
    return fail(err, req)
  }
}
