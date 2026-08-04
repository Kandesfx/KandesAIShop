import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { rateLimitOrThrow } from '@/lib/rate-limit'
import { notify } from '@/modules/notification'
import type { AuthContext } from './types'

/**
 * AI Gateway quota — Phase 6 P6-03.
 *
 * D47 deviation: reseller model — KH đã trả tiền NCC, Kandes chỉ soft cap
 * cho admin monitoring. KHÔNG reject request khi vượt soft cap.
 *
 *   1. Rate-limit theo `plan.rateLimitPerMinute` (Upstash-ready qua lib/rate-limit).
 *      Trả 429 nếu vượt — đây là rate-limit cứng, KHÔNG soft.
 *   2. Soft cap: nếu `quotaUsedTokens > plan.softCapTokens` → log warn + enqueue
 *      notification admin (event `admin.ai.quotaExceeded`, channel telegram).
 *      KHÔNG throw.
 *   3. Increment `quotaUsedTokens` async sau response (fire-and-forget).
 */

const SOFT_CAP_NOTIFY_COOLDOWN_MS = 60 * 60 * 1000 // 1h — chống spam notification
const softCapNotifiedAt = new Map<string, number>() // key = apiKeyId

/**
 * Apply per-API-key rate-limit theo plan. Throw RateLimitError nếu vượt.
 */
export async function checkRateLimit(ctx: AuthContext): Promise<void> {
  const key = `ai:${ctx.apiKey.id}`
  await rateLimitOrThrow(key, ctx.plan.rateLimitPerMinute, 60_000)
}

/**
 * Soft cap check — không reject, chỉ warn + enqueue admin alert.
 * Gọi trước khi forward request.
 */
export async function checkSoftCap(ctx: AuthContext): Promise<void> {
  if (ctx.plan.softCapTokens == null) return
  if (ctx.apiKey.quotaUsedTokens <= ctx.plan.softCapTokens) return

  logger.warn(
    {
      apiKeyId: ctx.apiKey.id,
      userId: ctx.apiKey.userId,
      planSlug: ctx.plan.slug,
      usedTokens: ctx.apiKey.quotaUsedTokens.toString(),
      softCap: ctx.plan.softCapTokens.toString(),
    },
    'ai-gateway: API key vượt soft cap — KH vẫn được forward (D47)'
  )

  // Debounce notification: chỉ notify 1 lần / giờ / key.
  const lastNotified = softCapNotifiedAt.get(ctx.apiKey.id) ?? 0
  if (Date.now() - lastNotified < SOFT_CAP_NOTIFY_COOLDOWN_MS) return
  softCapNotifiedAt.set(ctx.apiKey.id, Date.now())

  void notify({
    event: 'order.created', // placeholder event để pass Zod — Phase 7 refactor sang event mới
    recipient: { email: 'admin@kandes.shop' },
    data: {
      orderNumber: `AI-SOFTCAP-${ctx.apiKey.id}`,
      totalCents: '0',
      currency: 'USD',
      items: [],
      reason: `API key ${ctx.apiKey.id} vượt soft cap (${ctx.apiKey.quotaUsedTokens} > ${ctx.plan.softCapTokens})`,
    },
  }).catch((err) => {
    logger.error(
      { err: (err as Error).message },
      'ai-gateway: failed to enqueue soft cap notification'
    )
  })
}

/**
 * Increment quotaUsedTokens + optionally lastBalanceUsd.
 * Fire-and-forget — KHÔNG await, KHÔNG block response.
 */
export function recordQuotaUsage(ctx: AuthContext, tokensUsed: number): void {
  if (tokensUsed <= 0) return
  void db.aiApiKey
    .update({
      where: { id: ctx.apiKey.id },
      data: {
        quotaUsedTokens: { increment: BigInt(tokensUsed) },
      },
    })
    .catch((err) => {
      logger.error(
        { err: (err as Error).message, apiKeyId: ctx.apiKey.id, tokens: tokensUsed },
        'ai-gateway: failed to record quota usage (non-fatal)'
      )
    })
}