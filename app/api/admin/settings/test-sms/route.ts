import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { sendSmsMessage, E164_REGEX } from '@/modules/notification/providers/sms'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const sendSchema = z.object({
  to: z.string().regex(E164_REGEX, 'Phone không hợp lệ E.164 (vd +84xxxxxxxxx)'),
  body: z.string().min(1).max(1000),
})

/**
 * POST /api/admin/settings/test-sms
 * Gửi 1 SMS test tới SĐT admin. Cần admin.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:sms:test', ip, user.id), 5, 60 * 1000)

    const body = (await req.json().catch(() => null)) as unknown
    const parsed = sendSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          fields: parsed.error.flatten().fieldErrors,
        },
        req
      )
    }

    try {
      await sendSmsMessage({ to: parsed.data.to, subject: '[Kandes]', text: parsed.data.body })
      return ok({ sent: true, to: parsed.data.to, message: 'Đã gửi' })
    } catch (err) {
      return fail(
        { code: 'SMS_ERROR', message: err instanceof Error ? err.message : 'Lỗi gửi' },
        req
      )
    }
  } catch (err) {
    return fail(err, req)
  }
}
