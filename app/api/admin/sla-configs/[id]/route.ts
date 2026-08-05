import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { slaService, updateSlaConfigSchema, slaConfigIdParamSchema } from '@/modules/sla'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/sla-configs/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const parsedParams = slaConfigIdParamSchema.safeParse(params)
    if (!parsedParams.success) {
      return fail({ code: 'VALIDATION_ERROR', message: 'ID không hợp lệ' }, req)
    }

    const view = await slaService.getSlaConfig(parsedParams.data.id)
    return ok(view)
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * PUT /api/admin/sla-configs/[id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const parsedParams = slaConfigIdParamSchema.safeParse(params)
    if (!parsedParams.success) {
      return fail({ code: 'VALIDATION_ERROR', message: 'ID không hợp lệ' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(
      rateLimitKey('admin:sla:update', ip, user.id),
      30,
      60 * 1000
    )

    const body = await req.json()
    const parsed = updateSlaConfigSchema.safeParse(body)
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

    const view = await slaService.updateSlaConfig(
      parsedParams.data.id,
      parsed.data,
      { id: user.id }
    )
    return ok(view)
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * DELETE /api/admin/sla-configs/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const parsedParams = slaConfigIdParamSchema.safeParse(params)
    if (!parsedParams.success) {
      return fail({ code: 'VALIDATION_ERROR', message: 'ID không hợp lệ' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(
      rateLimitKey('admin:sla:delete', ip, user.id),
      10,
      60 * 1000
    )

    await slaService.deleteSlaConfig(parsedParams.data.id, { id: user.id })
    return ok({ deleted: true, id: parsedParams.data.id })
  } catch (err) {
    return fail(err, req)
  }
}
