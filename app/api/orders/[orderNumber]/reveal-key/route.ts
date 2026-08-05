import { NextRequest } from 'next/server'
import { ok, fail, parseInput } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { orderNumberParamSchema, revealKeySchema, revealKeyForUser } from '@/modules/checkout'

export const dynamic = 'force-dynamic'

/**
 * POST /api/orders/[orderNumber]/reveal-key
 * Auth: bắt buộc. Body: { password: string }.
 * Ownership: order.userId === currentUser.id.
 *
 * Reveal key/credentials (P2-09) sau khi order delivered (D16).
 *
 * Bảo mật:
 *   - Password verify (anti-phishing / shared device).
 *   - Rate-limit 5/min/user (REST_API §10).
 *   - KHÔNG log key — chỉ log orderId + userId + itemCount.
 *   - Chỉ cho reveal khi status = 'delivered' hoặc 'completed'.
 *   - DECRYPT từ OrderItem.deliveredContentEncrypted (AES-256-GCM).
 *
 * Mở rộng Phase 3: thêm OTP option (REST_API §4 ghi "OTP").
 */
export async function POST(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const user = await requireUser()
    await rateLimitOrThrow(rateLimitKey('orders:reveal', user.id), 5, 60 * 1000)

    const parsed = orderNumberParamSchema.safeParse(params)
    if (!parsed.success) {
      throw new AppError('INVALID_ID', 'Mã đơn không hợp lệ', 400)
    }

    const input = parseInput(revealKeySchema, await req.json())

    // Lấy password hash từ DB (để verify). SecretType giả định user có password.
    const userRow = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    })
    if (!userRow?.passwordHash) {
      throw new AppError(
        'NO_PASSWORD',
        'Tài khoản này không có mật khẩu (đăng nhập qua OTP). Tính năng reveal key không khả dụng.',
        400
      )
    }

    const result = await revealKeyForUser(
      user.id,
      parsed.data.orderNumber,
      input,
      userRow.passwordHash
    )
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}
