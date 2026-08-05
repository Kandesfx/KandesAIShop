import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import {
  settingsService,
  buildCategorySchema,
} from '@/modules/settings'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/[category]
 * Trả 1 category + values.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const data = await settingsService.getCategory(params.category)
    return ok(data)
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * PUT /api/admin/settings/[category]
 * Cập nhật values cho category. Validate ở route boundary.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(
      rateLimitKey('admin:settings:update', ip, user.id),
      30,
      60 * 1000
    )

    const body = await req.json()
    const schema = buildCategorySchema(
      params.category as Parameters<typeof buildCategorySchema>[0]
    )
    const parsed = schema.safeParse(body)
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

    const result = await settingsService.updateCategory(
      params.category,
      parsed.data.values as Record<string, never>,
      { id: user.id }
    )
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
