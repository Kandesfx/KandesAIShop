import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cartService } from '@/modules/cart'
import { addItemSchema } from '@/modules/cart/validators'
import { ok, fail, parseInput } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cart/items
 * Body: { productId, variantId?, quantity }
 *
 * Upsert vào cart hiện tại (user hoặc guest). Trả về CartView mới.
 * Rate-limit: 30 req/min/IP (chống spam add).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('cart:add', ip), 30, 60 * 1000)

    const user = await getCurrentUser()
    const body = await req.json()
    const input = parseInput(addItemSchema, body)

    const cart = await cartService.addItem(user?.id ?? null, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      quantity: input.quantity,
    })
    return ok({ cart })
  } catch (err) {
    return fail(err, req)
  }
}
