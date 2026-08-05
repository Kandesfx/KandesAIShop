import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { reportsService, inventoryQuerySchema } from '@/modules/reports'
import { serialize } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reports/inventory
 * Query: ?lowStockThreshold=5
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:reports:inventory', ip, user.id), 30, 60 * 1000)

    const { searchParams } = new URL(req.url)
    const raw = {
      lowStockThreshold: searchParams.get('lowStockThreshold') ?? '5',
    }
    const parsed = inventoryQuerySchema.safeParse(raw)
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

    const report = await reportsService.getInventoryReport(parsed.data.lowStockThreshold)
    return ok(serialize(report))
  } catch (err) {
    return fail(err, req)
  }
}
