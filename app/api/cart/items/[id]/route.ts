import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cartService } from '@/modules/cart'
import { updateQtySchema } from '@/modules/cart/validators'
import { ok, fail, parseInput } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/cart/items/[id]
 * Body: { quantity }
 *
 * quantity=0 → xoá item (alias cho DELETE).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const input = parseInput(updateQtySchema, body)
    const cart = await cartService.updateQty(user?.id ?? null, params.id, input)
    return ok({ cart })
  } catch (err) {
    return fail(err, req)
  }
}

/**
 * DELETE /api/cart/items/[id]
 * Xoá item khỏi cart.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    const cart = await cartService.removeItem(user?.id ?? null, params.id)
    return ok({ cart })
  } catch (err) {
    return fail(err, req)
  }
}
