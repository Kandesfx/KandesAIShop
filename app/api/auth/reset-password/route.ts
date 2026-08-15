import { NextRequest } from 'next/server'
import { authService } from '@/modules/auth'
import { resetPasswordSchema } from '@/modules/auth/validators'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'
import { assertSameOrigin } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/reset-password
 *
 * Body: { token, password }
 *
 * Token lấy từ link email forgot-password. Sau khi reset:
 *   - Tất cả session hiện tại bị revoke (force logout all devices)
 *   - Tất cả reset token cũ bị invalidate
 *   - User phải login lại bằng password mới
 *
 * Rate-limit: 10/15min/IP.
 */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req)
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('auth:reset', ip), 10, 15 * 60 * 1000)

    const body = await req.json()
    const input = parseInput(resetPasswordSchema, body)
    await authService.resetPassword(input)

    return ok({ ok: true })
  } catch (err) {
    return fail(err, req)
  }
}
