import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cartService } from '@/modules/cart'
import { ok, fail } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cart/clear
 * Xoá toàn bộ items trong cart hiện tại (user hoặc guest).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    await cartService.clearCart(user?.id ?? null)
    const cart = await cartService.getCurrentCart(user?.id ?? null)
    return ok({ cart })
  } catch (err) {
    return fail(err, req)
  }
}
