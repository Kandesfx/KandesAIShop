import { NextRequest } from 'next/server'
import { authService } from '@/modules/auth'
import { postLoginMerge } from '@/modules/cart'
import { loginSchema } from '@/modules/auth/validators'
import { setSessionCookies } from '@/modules/auth/session'
import { ok, fail, parseInput, getClientIp, assertSameOrigin } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/login
 *
 * Body: { email, password }
 * Set cookies: kds_access (15p), kds_refresh (7d, path scoped).
 *
 * Rate-limit: 10/15min/IP theo spec P2-01.
 *
 * Sau khi login thành công → merge guest cart (nếu có) vào user cart.
 */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req)
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('auth:login', ip), 10, 15 * 60 * 1000)

    const body = await req.json()
    const input = parseInput(loginSchema, body)
    const result = await authService.login(input, {
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })

    setSessionCookies({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    })

    await postLoginMerge(result.user.id)

    return ok({ user: result.user })
  } catch (err) {
    return fail(err, req)
  }
}
