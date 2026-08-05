import { NextRequest } from 'next/server'
import { otpService } from '@/modules/auth'
import { requestOtpSchema } from '@/modules/auth/otp-validators'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/otp/request
 *
 * Body: { contactType, contactValue, purpose }
 *
 * Rate-limit: 5/min/IP + 10/day/contact (trong otpService).
 * Resend cooldown 60s.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = parseInput(requestOtpSchema, body)
    const result = await otpService.request({
      ...input,
      ipAddress: getClientIp(req),
    })
    return ok({
      sent: result.sent,
      expiresAt: result.expiresAt,
      nextResendAt: result.nextResendAt,
    })
  } catch (err) {
    return fail(err, req)
  }
}
