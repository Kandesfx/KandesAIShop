import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { sendZaloMessage, getZaloOAInfo } from '@/modules/notification/providers/zalo'
import { env } from '@/lib/env'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const sendSchema = z.object({
  /** Optional override; default = ZALO_OA_ADMIN_USER_ID env. */
  userId: z.string().min(1).optional(),
  message: z.string().min(1).max(2000),
})

/**
 * POST /api/admin/settings/test-zalo
 * Gửi 1 message test tới Zalo OA admin. Không lưu DB. Cần admin.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    if (!env.ZALO_OA_ACCESS_TOKEN) {
      return fail(
        { code: 'CONFIG_MISSING', message: 'ZALO_OA_ACCESS_TOKEN chưa config' },
        req
      )
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:zalo:test', ip, user.id), 10, 60 * 1000)

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

    const userId = parsed.data.userId ?? env.ZALO_OA_ADMIN_USER_ID
    if (!userId) {
      return fail(
        { code: 'CONFIG_MISSING', message: 'userId hoặc ZALO_OA_ADMIN_USER_ID chưa set' },
        req
      )
    }

    try {
      await sendZaloMessage({
        userId,
        subject: '[Kandes Test]',
        text: parsed.data.message,
      })
      return ok({ sent: true, userId, message: 'Đã gửi' })
    } catch (err) {
      return fail(
        { code: 'ZALO_ERROR', message: err instanceof Error ? err.message : 'Lỗi gửi' },
        req
      )
    }
  } catch (err) {
    return fail(err, req)
  }
}

/** GET — verify OA info (setup wizard). */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    if (!env.ZALO_OA_ACCESS_TOKEN) {
      return NextResponse.json(
        { ok: false, error: { code: 'CONFIG_MISSING', message: 'ZALO_OA_ACCESS_TOKEN chưa config' } },
        { status: 400 }
      )
    }

    try {
      const info = await getZaloOAInfo()
      return ok({
        configured: true,
        oa: info,
        adminUserId: env.ZALO_OA_ADMIN_USER_ID ?? null,
      })
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'ZALO_ERROR', message: err instanceof Error ? err.message : 'Lỗi' },
        },
        { status: 502 }
      )
    }
  } catch (err) {
    return fail(err, req)
  }
}
