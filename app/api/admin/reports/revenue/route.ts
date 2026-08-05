import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import {
  reportsService,
  revenueQuerySchema,
} from '@/modules/reports'
import { serialize } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reports/revenue
 * Query: ?preset=30d | 7d | 90d | mtd | qtd | ytd | custom + from + to (custom)
 * Default: 30d.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:reports:revenue', ip, user.id), 30, 60 * 1000)

    const { searchParams } = new URL(req.url)
    const raw = {
      preset: searchParams.get('preset') ?? '30d',
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }
    const parsed = revenueQuerySchema.safeParse(raw)
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
    const report = await reportsService.getRevenueReport(range)

    // CSV export nếu client yêu cầu
    const format = searchParams.get('format')
    if (format === 'csv') {
      const csv = reportsService.toCsv(
        ['date', 'orderCount', 'grossCents', 'netCents'],
        report.buckets.map((b) => [b.date, b.orderCount, b.grossCents, b.netCents])
      )
      // Append totals rows
      const csvWithTotals = csv + reportsService.toCsv(
        [],
        []
      )
      const filename = `revenue_${range.preset}_${new Date(range.from).toISOString().slice(0, 10)}.csv`
      return new NextResponse(csvWithTotals, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return ok(serialize(report))
  } catch (err) {
    return fail(err, req)
  }
}
