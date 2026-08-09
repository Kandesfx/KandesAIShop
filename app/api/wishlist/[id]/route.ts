import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ok, fail } from '@/lib/http'
import { wishlistService } from '@/modules/wishlist'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/wishlist/[id]
 * Xoá 1 item khỏi wishlist. Yêu cầu đăng nhập + kiểm tra quyền sở hữu.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser()
    await wishlistService.removeFromWishlist(user.id, params.id)
    return ok({ success: true })
  } catch (err) {
    return fail(err, req)
  }
}