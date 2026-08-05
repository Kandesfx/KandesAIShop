import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authGuard } from '@/lib/middleware/auth'
import { rateLimitOrThrow } from '@/lib/rate-limit'
import { NotFoundError } from '@/lib/errors'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/me/ai-keys/[id]/balance — Phase 7-RB (D58).
 *
 * KH tự check balance/quota cho CHÍNH key của họ. KHÔNG lộ:
 *   - NCC key plaintext.
 *   - `ai_ncc_keys.id` raw — chỉ trả `nickname`.
 *   - Danh sách keys khác trong pool.
 *
 * Rate-limit 60/min/user (D47 pattern).
 *
 * Auth: chỉ chủ sở hữu apiKey mới xem được (apiKey.userId === ctx.user.id).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { user } = await authGuard(req)
    const { id } = await params

    // Soft rate-limit per user.
    await rateLimitOrThrow(`ai:balance:${user.id}`, 60, 60_000).catch(() => {})

    const apiKey = await db.aiApiKey.findUnique({
      where: { id },
      include: {
        plan: true,
        nccKey: { select: { id: true, nickname: true, remainingUsd: true, totalQuotaUsd: true, status: true, lastSyncedAt: true } },
        pinnedNccKey: { select: { id: true, nickname: true, remainingUsd: true, totalQuotaUsd: true, status: true, lastSyncedAt: true } },
      },
    })
    if (!apiKey || apiKey.userId !== user.id) {
      throw new NotFoundError('API key không tồn tại')
    }

    // Determine effective NCC key (effective = pinned nếu policy=pinned + pinned active, else nccKey).
    const effective =
      apiKey.rotationPolicy === 'pinned' &&
      apiKey.pinnedNccKey &&
      (apiKey.pinnedNccKey.status === 'active' || apiKey.pinnedNccKey.status === 'low_balance')
        ? apiKey.pinnedNccKey
        : apiKey.nccKey

    const isOverSoftCap =
      apiKey.plan.softCapTokens != null && apiKey.quotaUsedTokens > apiKey.plan.softCapTokens

    return ok(
      serialize({
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
        status: apiKey.status,
        rotationPolicy: apiKey.rotationPolicy,
        // Quota + soft cap
        quotaUsedTokens: apiKey.quotaUsedTokens.toString(),
        quotaTokens: apiKey.plan.quotaTokens.toString(),
        softCapTokens: apiKey.plan.softCapTokens?.toString() ?? null,
        isOverSoftCap,
        // NCC key info (masked — chỉ nickname, KHÔNG key value)
        nccNickname: effective?.nickname ?? null,
        nccStatus: effective?.status ?? null,
        nccRemainingUsd: effective ? Number(effective.remainingUsd) : null,
        nccTotalQuotaUsd: effective ? Number(effective.totalQuotaUsd) : null,
        nccLastSyncedAt: effective?.lastSyncedAt ?? null,
        // Pinned info
        pinnedNccKeyId: apiKey.pinnedNccKeyId,
        pinnedNccNickname: apiKey.pinnedNccKey?.nickname ?? null,
        pinnedNccRemainingUsd: apiKey.pinnedNccKey
          ? Number(apiKey.pinnedNccKey.remainingUsd)
          : null,
        // Lifecycle
        expiresAt: apiKey.expiresAt,
        lastUsedAt: apiKey.lastUsedAt,
        lastBalanceCheckAt: apiKey.lastBalanceCheckAt,
      })
    )
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'me/ai-keys/[id]/balance error')
    return fail(err, req)
  }
}