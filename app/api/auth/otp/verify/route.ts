import { NextRequest } from 'next/server'
import { otpService } from '@/modules/auth'
import { verifyOtpSchema } from '@/modules/auth/otp-validators'
import { ok, fail, parseInput } from '@/lib/http'
import { assertSameOrigin } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/otp/verify
 *
 * Body: { contactType, contactValue, code, purpose }
 * Response: { valid: boolean, attemptsRemaining: number }
 *
 * Lưu ý: route này chỉ verify OTP. Tạo session (login/register) là trách
 * nhiệm của route riêng — xem auth/login-otp (sẽ có ở P2-04) hoặc
 * auth/register-otp. Trả valid để client quyết định flow tiếp.
 */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req)
    const body = await req.json()
    const input = parseInput(verifyOtpSchema, body)
    const result = await otpService.verify(input)
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
