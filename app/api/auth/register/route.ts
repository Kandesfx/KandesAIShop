import { NextRequest } from 'next/server'
import { authService } from '@/modules/auth'
import { registerSchema } from '@/modules/auth/validators'
import { setSessionCookies } from '@/modules/auth/session'
import { postLoginMerge } from '@/modules/cart'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'
import { assertSameOrigin } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/register
 *
 * Body: { email, password, name }
 * Set cookies: kds_access, kds_refresh.
 *
 * Rate-limit: 5/15min/IP (chống spam account).
 */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req)
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('auth:register', ip), 5, 15 * 60 * 1000)

    const body = await req.json()
    const input = parseInput(registerSchema, body)
    const result = await authService.register(input, {
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })

    setSessionCookies({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    })

    await postLoginMerge(result.user.id)

    return ok(
      {
        user: result.user,
        refreshExpiresAt: result.refreshExpiresAt,
      },
      { status: 201 }
    )
  } catch (err) {
    return fail(err, req)
  }
}
