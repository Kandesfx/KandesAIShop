import { NextRequest } from 'next/server'
import { ok, fail, parseInput } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { orderNumberParamSchema, revealKeySchema, revealKeyForUser } from '@/modules/checkout'

export const dynamic = 'force-dynamic'

/**
 * POST/GET /api/orders/[orderNumber]/reveal-key
 * Auth: bắt buộc (requireUser).
 * Ownership: order.userId === currentUser.id.
 *
 * Reveal key/credentials trực tiếp cho khách hàng đã đăng nhập mà không cần nhập lại mật khẩu.
 */
async function handleReveal(req: NextRequest, { params }: { params: { orderNumber: string } | Promise<{ orderNumber: string }> }) {
  try {
    const user = await requireUser()
    await rateLimitOrThrow(rateLimitKey('orders:reveal', user.id), 20, 60 * 1000)

    const resolvedParams = await params
    const parsed = orderNumberParamSchema.safeParse(resolvedParams)
    if (!parsed.success) {
      throw new AppError('INVALID_ID', 'Mã đơn không hợp lệ', 400)
    }

    let input = {}
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        input = parseInput(revealKeySchema, body)
      } catch {
        input = {}
      }
    }

    const result = await revealKeyForUser(
      user.id,
      parsed.data.orderNumber,
      input
    )
    return ok(result)
  } catch (err) {
    return fail(err, req)
  }
}

export async function POST(req: NextRequest, ctx: { params: { orderNumber: string } | Promise<{ orderNumber: string }> }) {
  return handleReveal(req, ctx)
}

export async function GET(req: NextRequest, ctx: { params: { orderNumber: string } | Promise<{ orderNumber: string }> }) {
  return handleReveal(req, ctx)
}
