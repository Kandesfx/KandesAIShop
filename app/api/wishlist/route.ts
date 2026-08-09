import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ok, fail, parseInput } from '@/lib/http'
import { wishlistService, addWishlistSchema } from '@/modules/wishlist'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wishlist
 * Danh sách wishlist của user hiện tại. Yêu cầu đăng nhập.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const items = await wishlistService.listWishlist(user.id)
    return ok({ items })
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * POST /api/wishlist
 * Body: { productId, variantId? }
 *
 * Thêm sản phẩm vào wishlist. Idempotent — gọi lại với cùng sản phẩm
 * không tạo bản ghi trùng (composite unique + check trong service).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const input = parseInput(addWishlistSchema, await req.json())
    const result = await wishlistService.addToWishlist(user.id, input)
    return ok({ id: result.id }, { status: 201 })
  } catch (err) {
    return fail(err, req)
  }
}
