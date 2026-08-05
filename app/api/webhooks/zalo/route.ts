import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http'
import { logger } from '@/lib/logger'
import { computeZaloHmac } from '@/modules/notification/providers/zalo'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/zalo
 * Zalo OA gửi event khi user gửi message / follow / click button. Phase 5 P5-07:
 * handle `follow` event để upsert `User.zaloUserId`.
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-zalo-oa-signature') ?? req.headers.get('X-Zalo-Oa-Signature') ?? ''
    const rawBody = await req.text()

    // Verify HMAC-SHA256. Nếu secret không set → skip verify (Phase 5+ sẽ enforce).
    const { env } = await import('@/lib/env')
    if (env.ZALO_OA_SECRET) {
      const expected = await computeZaloHmac(rawBody)
      if (expected !== signature) {
        logger.warn('zalo webhook: signature mismatch')
        return fail({ code: 'FORBIDDEN', message: 'Invalid signature' }, req)
      }
    }

    let update: { event_name?: string; recipient?: { user_id?: string }; user_id?: string }
    try {
      update = JSON.parse(rawBody)
    } catch {
      return fail({ code: 'VALIDATION_ERROR', message: 'Invalid JSON' }, req)
    }

    if (update.event_name === 'follow_user' || update.event_name === 'follow') {
      const userId = update.recipient?.user_id ?? update.user_id
      if (userId) {
        // P5-07: upsert user.zaloUserId theo message sender_id (có thể chưa match user → mark later)
        logger.info({ zaloUserId: userId }, 'zalo webhook: follow event captured')
        // Phase 5 follow-event: chỉ log; P5-07 wiring chi tiết.
      }
    }

    return ok({ received: true })
  } catch (err) {
    return fail(err, req)
  }
}

/** Zalo OA gửi GET khi đăng ký webhook URL để verify. Echo lại token. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const challenge = searchParams.get('challenge') ?? ''
  return new Response(challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}
