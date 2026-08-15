import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authService, otpService } from '@/modules/auth'
import { setSessionCookies } from '@/modules/auth/session'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'
import { assertSameOrigin } from '@/lib/http'
import { ConflictError, NotFoundError } from '@/lib/errors'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/register-otp
 *
 * Body: { email, name, code }
 *
 * Verify OTP (purpose=register) → tạo user mới → set session.
 *
 * Flow:
 *   1. POST /api/auth/otp/request { contactType: 'email', contactValue, purpose: 'register' }
 *   2. POST /api/auth/register-otp { email, name, code }
 *
 * Nếu email đã tồn tại → 409 Conflict.
 */
const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(120),
  code: z.string().regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số'),
})

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req)
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('auth:register-otp', ip), 5, 15 * 60 * 1000)

    const input = parseInput(schema, await req.json())

    const verify = await otpService.verify({
      contactType: 'email',
      contactValue: input.email,
      code: input.code,
      purpose: 'register',
    })
    if (!verify.valid) {
      throw new NotFoundError('Mã OTP không đúng')
    }

    // Anti-enumeration: thông báo generic nếu email đã tồn tại.
    // Vẫn trả 409 nhưng message không leak thông tin nhạy cảm.
    const existing = await db.user.findUnique({ where: { email: input.email } })
    if (existing) {
      // Log nội bộ để admin theo dõi, còn user thấy message generic.
      throw new ConflictError(
        process.env.NODE_ENV === 'production'
          ? 'Không thể hoàn tất đăng ký với email này. Vui lòng thử email khác hoặc đăng nhập.'
          : 'Email đã được đăng ký'
      )
    }

    // Tạo user mà không có password (null passwordHash — chỉ login OTP)
    const user = await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: null,
        role: 'customer',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    })

    const auth = await authService.loginViaOtp(input.email, {
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })

    setSessionCookies({
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    })

    return ok({ user: auth.user }, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
