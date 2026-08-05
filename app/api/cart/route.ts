import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cartService } from '@/modules/cart'
import { ok, fail } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cart
 * Trả cart hiện tại. Tạo mới nếu chưa có (lazy init cho cả user & guest).
 * Guest cart tự sinh token + set cookie `kds_cart` ở lần đầu.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const cart = await cartService.getCurrentCart(user?.id ?? null)
    return ok({ cart })
  } catch (err) {
    return fail(err, req)
  }
}
