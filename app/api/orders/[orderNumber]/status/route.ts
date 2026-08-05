import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ok, fail } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/http'
import { checkoutService } from '@/modules/checkout'
import { orderNumberParamSchema } from '@/modules/checkout'

export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/[orderNumber]/status
 *
 * Trả status ngắn gọn cho client polling (mỗi 5s tại trang /order/...).
 * Phase 3 sẽ thay bằng SSE/webhook push — endpoint này vẫn dùng cho mobile.
 *
 * Đồng thời trigger expireOverdueOrder() nếu expired — Phase 2 không có cron.
 *
 * Rate-limit: 60/min/IP (lỏng hơn REST_API §10 vì polling).
 */
export async function GET(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('order:status', ip), 60, 60 * 1000)

    const parsed = orderNumberParamSchema.safeParse(params)
    if (!parsed.success) {
      return ok({ status: null, paymentStatus: null }, { status: 200 })
    }

    const user = await getCurrentUser()
    const userId = user?.id ?? null

    // Best-effort auto-cancel nếu đã quá hạn
    await checkoutService.expireOverdueOrder(parsed.data.orderNumber).catch(() => {
      // Không throw — polling vẫn phải trả status
    })

    const status = await checkoutService.getOrderStatus(parsed.data.orderNumber, userId)
    return ok({ ...status })
  } catch (err) {
    return fail(err, req)
  }
}
