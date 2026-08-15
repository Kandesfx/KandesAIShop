import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me
 * Trả về thông tin user hiện tại (id, email, name, role).
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ok({ user: null })
    }
    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    })
  } catch (err) {
    return fail(err)
  }
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,20}$/, 'Số điện thoại không hợp lệ')
    .nullable()
    .optional(),
  avatarUrl: z.string().url('Avatar phải là URL hợp lệ').max(500).nullable().optional(),
})

/**
 * PATCH /api/me
 * Cập nhật name/phone/avatarUrl của user hiện tại.
 * - Không cho phép đổi email/role/status (security).
 * - Rate-limit 20 req / phút.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return fail({ code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('me:profile', ip, user.id), 20, 60 * 1000)

    const body = (await req.json().catch(() => null)) as unknown
    const parsed = updateProfileSchema.safeParse(body)
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

    // Phone phải unique (DB constraint). Check trước khi update.
    if (parsed.data.phone && parsed.data.phone !== user.phone) {
      const dup = await db.user.findFirst({
        where: { phone: parsed.data.phone, deletedAt: null, id: { not: user.id } },
        select: { id: true },
      })
      if (dup) {
        return fail(
          {
            code: 'PHONE_TAKEN',
            message: 'Số điện thoại đã được sử dụng bởi tài khoản khác',
            fields: [{ field: 'phone', message: 'Đã tồn tại' }],
          },
          req
        )
      }
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
        ...(parsed.data.avatarUrl !== undefined && { avatarUrl: parsed.data.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
      },
    })

    return ok({ user: updated })
  } catch (err) {
    return fail(err, req)
  }
}
