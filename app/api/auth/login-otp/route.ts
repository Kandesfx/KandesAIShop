import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authService, otpService } from '@/modules/auth'
import { postLoginMerge } from '@/modules/cart'
import { setSessionCookies } from '@/modules/auth/session'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'
import { NotFoundError } from '@/lib/errors'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/login-otp
 *
 * Body: { email, code }
 *
 * Verify OTP (purpose=login) → set session.
 *
 * Flow:
 *   1. POST /api/auth/otp/request { contactType: 'email', contactValue, purpose: 'login' }
 *   2. POST /api/auth/login-otp { email, code: '123456' }
 *
 * User phải tồn tại trước. Register bằng OTP dùng /api/auth/register-otp.
 */
const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số'),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('auth:login-otp', ip), 10, 15 * 60 * 1000)

    const input = parseInput(schema, await req.json())

    const verify = await otpService.verify({
      contactType: 'email',
      contactValue: input.email,
      code: input.code,
      purpose: 'login',
    })
    if (!verify.valid) {
      throw new NotFoundError('Mã OTP không đúng')
    }

    const auth = await authService.loginViaOtp(input.email, {
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })

    setSessionCookies({
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    })

    await postLoginMerge(auth.user.id)

    return ok({ user: auth.user })
  } catch (err) {
    return fail(err, req)
  }
}
