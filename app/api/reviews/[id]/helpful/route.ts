import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { rateLimitOrThrow, rateLimitKey } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/http'
import { reviewService } from '@/modules/review'

export const dynamic = 'force-dynamic'

/**
 * POST /api/reviews/[id]/helpful
 *
 * Tăng helpful count cho review.
 * Không cần đăng nhập (tăng theo IP để tránh spam).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ip = getClientIp(req)

    // Rate limit: 30/min/IP
    await rateLimitOrThrow(rateLimitKey('reviews:helpful', ip ?? 'unknown'), 30, 60 * 1000)

    await reviewService.markHelpful(id, ip ?? 'unknown')
    return ok({ message: 'Đã đánh dấu hữu ích' })
  } catch (err) {
    return fail(err, req)
  }
}
