import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { sendTelegramMessage } from '@/modules/notification/providers/telegram'
import { env } from '@/lib/env'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const sendSchema = z.object({
  /** Optional override; default = TELEGRAM_ADMIN_CHAT_ID env. */
  chatId: z.string().min(1).optional(),
  message: z.string().min(1).max(4000),
})

/**
 * POST /api/admin/settings/test-telegram
 * Gửi 1 message test tới Telegram admin chat. Không lưu DB.
 * Cần admin/super_admin.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    if (!env.TELEGRAM_BOT_TOKEN) {
      return fail(
        { code: 'CONFIG_MISSING', message: 'TELEGRAM_BOT_TOKEN chưa config' },
        req
      )
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:telegram:test', ip, user.id), 10, 60 * 1000)

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

    const chatId = parsed.data.chatId ?? env.TELEGRAM_ADMIN_CHAT_ID
    if (!chatId) {
      return fail(
        { code: 'CONFIG_MISSING', message: 'chatId hoặc TELEGRAM_ADMIN_CHAT_ID chưa set' },
        req
      )
    }

    try {
      await sendTelegramMessage({
        chatId,
        subject: '[Kandes Test]',
        text: parsed.data.message,
      })
      return ok({ sent: true, chatId, message: 'Đã gửi' })
    } catch (err) {
      return fail(
        {
          code: 'TELEGRAM_ERROR',
          message: err instanceof Error ? err.message : 'Lỗi gửi',
        },
        req
      )
    }
  } catch (err) {
    return fail(err, req)
  }
}

/** GET — verify bot info (setup wizard). */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    if (!env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { ok: false, error: { code: 'CONFIG_MISSING', message: 'TELEGRAM_BOT_TOKEN chưa config' } },
        { status: 400 }
      )
    }

    try {
      const info = await (
        await import('@/modules/notification/providers/telegram')
      ).getTelegramBotInfo()
      return ok({ configured: true, bot: info, adminChatId: env.TELEGRAM_ADMIN_CHAT_ID ?? null })
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'TELEGRAM_ERROR',
            message: err instanceof Error ? err.message : 'Lỗi',
          },
        },
        { status: 502 }
      )
    }
  } catch (err) {
    return fail(err, req)
  }
}
