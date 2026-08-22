import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { sendEmail, _resetEmailProvider } from '@/lib/email'
import { testEmailSchema } from '@/modules/settings'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/settings/test-email
 * Gửi email test tới recipient chỉ định. Dùng provider đang active
 * (lib/env EMAIL_PROVIDER). Hiện chỉ console provider hoạt động thật
 * (D28); resend/ses là stub → trả 501.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:settings:test-email', ip, user.id), 5, 15 * 60 * 1000)

    const body = await req.json()
    const parsed = testEmailSchema.safeParse(body)
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

    const { to, subject, content } = parsed.data

    // Đảm bảo provider fresh theo env hiện tại (test có thể override EMAIL_PROVIDER).
    _resetEmailProvider()

    const providerName = env.EMAIL_PROVIDER
    logger.info({ provider: providerName, requestedBy: user.id }, 'Sending test email')

    const subjectText = subject ?? '[Kandes] Test email'
    const text = content ?? 'Email test từ admin panel. Nếu bạn nhận được, hệ thống đang hoạt động.'

    const startTime = Date.now()
    await sendEmail({
      to,
      subject: subjectText,
      html: `<div style="font-family: sans-serif; padding: 20px; color: #111;">
        <h2 style="color: #06b6d4;">Kandes Shop — Test Email</h2>
        <p>${text}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">Thời gian gửi: ${new Date().toISOString()} | Provider: ${providerName}</p>
      </div>`,
      text,
    })
    const latencyMs = Date.now() - startTime

    logger.info({ to, requestedBy: user.id, provider: providerName, latencyMs }, 'Test email sent')

    return ok({ sent: true, provider: providerName, recipient: to, latencyMs })
  } catch (err) {
    logger.error({ err }, 'Failed to send test email')
    return fail(err, req)
  }
}
