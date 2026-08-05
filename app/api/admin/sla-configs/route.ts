import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { slaService, createSlaConfigSchema } from '@/modules/sla'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/sla-configs
 * List tất cả SlaConfig, optional filter theo scopeType/isActive.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:sla:list', ip), 60, 60 * 1000)

    const { searchParams } = new URL(req.url)
    const scopeType = searchParams.get('scopeType') as
      | 'global'
      | 'category'
      | 'product'
      | null
    const isActiveParam = searchParams.get('isActive')
    const isActive =
      isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined

    const result = await slaService.listSlaConfigs({
      scopeType: scopeType ?? undefined,
      isActive,
    })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * POST /api/admin/sla-configs
 * Tạo mới.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:sla:create', ip, user.id), 10, 60 * 1000)

    const body = await req.json()
    const parsed = createSlaConfigSchema.safeParse(body)
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

    const created = await slaService.createSlaConfig(
      {
        ...parsed.data,
        scopeId: parsed.data.scopeId ?? null,
        productId: parsed.data.productId ?? null,
      },
      { id: user.id }
    )
    return ok(created, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
