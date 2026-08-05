import { NextRequest } from 'next/server'
import { ok, fail, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'
import { dashboardService } from '@/modules/dashboard'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dashboard
 *
 * Lấy data cho admin dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    // Kiểm tra admin
    const user = await getCurrentUser()
    if (!user) {
      return fail({ code: 'UNAUTHORIZED', message: 'Cần đăng nhập' }, req)
    }

    if (!['admin', 'super_admin', 'staff'].includes(user.role)) {
      return fail({ code: 'FORBIDDEN', message: 'Không có quyền' }, req)
    }

    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('admin:dashboard', ip), 30, 60 * 1000)

    // Parse query params
    const { searchParams } = new URL(req.url)
    const period = Number(searchParams.get('period')) || 30

    const [kpi, revenueByDay, topProducts, pendingOrders, alerts] = await Promise.all([
      dashboardService.getKpiStats(period),
      dashboardService.getRevenueByDay(period),
      dashboardService.getTopProducts(5),
      dashboardService.getPendingOrders(10),
      dashboardService.getAlerts(),
    ])

    return ok({
      kpi,
      revenueByDay,
      topProducts,
      pendingOrders,
      alerts,
    })
  } catch (err) {
    return fail(err, req)
  }
}
