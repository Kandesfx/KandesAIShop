import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, fail, parseInput } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me — Trả về profile user hiện tại (full fields hơn /api/auth/me).
 * PATCH /api/me — Cập nhật name, phone, avatarUrl.
 */

const updateSchema = z
  .object({
    name: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự').max(120).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d\s()-]{6,20}$/, 'Số điện thoại không hợp lệ')
      .nullable()
      .optional(),
    avatarUrl: z.string().url('Avatar URL không hợp lệ').nullable().optional(),
  })
  .strict()

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    return fail(err, req)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const input = parseInput(updateSchema, body)

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
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
