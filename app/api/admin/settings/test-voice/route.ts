import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { sendVoiceCall } from '@/modules/notification/providers/voice'
import { env } from '@/lib/env'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const sendSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone E.164 (vd +84xxxxxxxxx)'),
  body: z.string().min(1).max(500),
})

/**
 * POST /api/admin/settings/test-voice
 * Gọi 1 voice call test tới SĐT admin. Cần admin.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    if (!env.PUBLIC_BASE_URL) {
      return fail(
        { code: 'CONFIG_MISSING', message: 'PUBLIC_BASE_URL chưa config (cần cho TwiML callback)' },
        req
      )
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:voice:test', ip, user.id), 3, 60 * 1000)

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
      await sendVoiceCall({ to: parsed.data.to, subject: '[Kandes]', text: parsed.data.body })
      return ok({ sent: true, to: parsed.data.to, message: 'Đã gọi' })
    } catch (err) {
      return fail(
        { code: 'VOICE_ERROR', message: err instanceof Error ? err.message : 'Lỗi gọi' },
        req
      )
    }
  } catch (err) {
    return fail(err, req)
  }
}
