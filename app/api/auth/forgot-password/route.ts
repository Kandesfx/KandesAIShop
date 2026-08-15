import { NextRequest } from 'next/server'
import { authService } from '@/modules/auth'
import { forgotPasswordSchema } from '@/modules/auth/validators'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'
import { assertSameOrigin } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/forgot-password
 *
 * Body: { email }
 *
 * Luôn trả về success để chống user enumeration.
 * Trong dev: console provider log reset URL. Trong prod: gửi qua email.
 *
 * Rate-limit: 5/15min/IP.
 */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req)
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('auth:forgot', ip), 5, 15 * 60 * 1000)

    const body = await req.json()
    const input = parseInput(forgotPasswordSchema, body)
    await authService.forgotPassword(input, { ipAddress: ip })

    return ok({
      message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.',
    })
  } catch (err) {
    return fail(err, req)
  }
}
