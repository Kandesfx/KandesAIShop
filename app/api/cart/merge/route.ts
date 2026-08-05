import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cartService } from '@/modules/cart'
import { readGuestToken } from '@/modules/cart/guest'
import { ok, fail } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cart/merge
 *
 * Merge guest cart → user cart. Được gọi tự động từ login/refresh route khi
 * user vừa đăng nhập. Có thể gọi thủ công nếu user login lần đầu ngay sau khi
 * add guest cart (entry edge case).
 *
 * Response: { cart } nếu merge thành công; { cart: null } nếu không có guest.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ok({ cart: null, message: 'Chưa đăng nhập' })
    }
    const guestToken = readGuestToken()
    const cart = await cartService.mergeGuestCartToUser(user.id, guestToken)
    return ok({ cart })
  } catch (err) {
    return fail(err, req)
  }
}
