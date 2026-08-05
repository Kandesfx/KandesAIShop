import { NextRequest } from 'next/server'
import { z } from 'zod'
import { oauthService } from '@/modules/auth'
import { postLoginMerge } from '@/modules/cart'
import { setSessionCookies } from '@/modules/auth/session'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/oauth/google
 *
 * Body: { idToken }
 *
 * Client flow (Google One Tap hoặc Sign-In button):
 *   1. Client init Google SDK với GOOGLE_CLIENT_ID
 *   2. User chọn account → Google trả id_token (JWT)
 *   3. POST { idToken } → server verify + tạo/link user + set cookies
 *
 * Auto-link per BR-4: nếu email đã có user active thì link OAuth vào user đó.
 */
const schema = z.object({
  idToken: z.string().min(10),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('auth:oauth-google', ip), 10, 15 * 60 * 1000)

    const body = await req.json()
    const input = parseInput(schema, body)
    const result = await oauthService.loginWithGoogle(input.idToken, {
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
        isNewUser: result.isNewUser,
      },
      { status: result.isNewUser ? 201 : 200 }
    )
  } catch (err) {
    return fail(err, req)
  }
}
