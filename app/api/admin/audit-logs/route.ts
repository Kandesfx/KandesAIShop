import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { auditService, auditQuerySchema } from '@/modules/audit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/audit-logs
 * Filters: actorId, action, resourceType, resourceId, from, to
 * Pagination: page, limit
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:audit:list', ip, user.id), 60, 60 * 1000)

    const { searchParams } = new URL(req.url)
    const raw = {
      page: searchParams.get('page') ?? '1',
      limit: searchParams.get('limit') ?? '20',
      actorId: searchParams.get('actorId') ?? undefined,
      action: searchParams.get('action') ?? undefined,
      resourceType: searchParams.get('resourceType') ?? undefined,
      resourceId: searchParams.get('resourceId') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }
    const parsed = auditQuerySchema.safeParse(raw)
    if (!parsed.success) {
      return fail(
        {
          code: 'VALIDATION_ERROR',
          message: 'Query không hợp lệ',
          fields: parsed.error.flatten().fieldErrors,
        },
        req
      )
    }

    const result = await auditService.listLogs({
      page: parsed.data.page,
      limit: parsed.data.limit,
      actorId: parsed.data.actorId,
      action: parsed.data.action,
      resourceType: parsed.data.resourceType,
      resourceId: parsed.data.resourceId,
      from: parsed.data.from,
      to: parsed.data.to,
    })
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
