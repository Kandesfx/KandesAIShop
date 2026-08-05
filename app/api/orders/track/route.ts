import { NextRequest } from 'next/server'
import { ok, fail, parseInput, getClientIp } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { trackOrderByGuest } from '@/modules/checkout'
import { trackOrderSchema } from '@/modules/checkout'

export const dynamic = 'force-dynamic'

/**
 * POST /api/orders/track
 * Body: { orderNumber: "KDS-...-....", contact: "email hoặc SĐT" }
 *
 * Tra cứu đơn cho guest (P2-08). Trả `OrderView` đầy đủ; client có thể render
 * ngay hoặc redirect sang /order/[orderNumber] để có QR + countdown.
 *
 * Bảo mật (D15):
 *   - Rate-limit 30/min/IP (REST_API §10).
 *   - Constant-time delay ~200ms ở service (chống enumerate orderNumber).
 *   - Cùng trả 404 cho cả "sai orderNumber" và "sai contact" (không lộ leak).
 *   - KHÔNG log contact/IP — tránh tạo vector lộ data người dùng.
 *   - KHÔNG cần auth (guest phải track được đơn).
 *
 * Phase 3: thêm audit log (orderNumber + timestamp, KHÔNG log contact).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('orders:track', ip), 30, 60 * 1000)

    const input = parseInput(trackOrderSchema, await req.json())

    const order = await trackOrderByGuest(input)
    return ok({ order })
  } catch (err) {
    return fail(err, req)
  }
}
