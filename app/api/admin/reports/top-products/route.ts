import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { reportsService, topProductsQuerySchema } from '@/modules/reports'
import { serialize } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reports/top-products
 * Query: ?preset=30d + limit=10
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:reports:top-products', ip, user.id), 30, 60 * 1000)

    const { searchParams } = new URL(req.url)
    const raw = {
      preset: searchParams.get('preset') ?? '30d',
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      limit: searchParams.get('limit') ?? '10',
    }
    const parsed = topProductsQuerySchema.safeParse(raw)
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

    const range = reportsService.resolveRange(parsed.data)
    const report = await reportsService.getTopProductsReport(range, parsed.data.limit)
    return ok(serialize(report))
  } catch (err) {
    return fail(err, req)
  }
}
