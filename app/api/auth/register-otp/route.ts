import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authService, otpService } from '@/modules/auth'
import { setSessionCookies } from '@/modules/auth/session'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'
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

    // Check conflict trước khi tạo
    const existing = await db.user.findUnique({ where: { email: input.email } })
    if (existing) {
      throw new ConflictError('Email đã được đăng ký')
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
