import { NextRequest, NextResponse } from 'next/server'
import { ok, fail } from '@/lib/http'
import { authGuard } from '@/lib/middleware/auth'
import { rateLimitOrThrow } from '@/lib/rate-limit'
import { NotFoundError } from '@/lib/errors'
import { db } from '@/lib/db'
import { serialize } from '@/lib/serialize'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/encryption'
import { listModelsFromCcPro, CcProProvider } from '@/modules/ai-gateway/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/me/ai-keys/[id]/balance — Phase 7-RB (D58) + Dynamic Models.
 *
 * KH tự check balance/quota cho CHÍNH key của họ. KHÔNG lộ:
 *   - NCC key plaintext.
 *   - `ai_ncc_keys.id` raw — chỉ trả `nickname`.
 *   - Danh sách keys khác trong pool.
 *
 * BAO GỒM:
 *   - Danh sách models có sẵn từ NCC Pro (fetch real-time)
 *   - Model stats từ NCC Pro usage
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
        nccKey: { select: { id: true, nickname: true, remainingUsd: true, totalQuotaUsd: true, status: true, lastSyncedAt: true, apiKeyEncrypted: true, provider: true } },
        pinnedNccKey: { select: { id: true, nickname: true, remainingUsd: true, totalQuotaUsd: true, status: true, lastSyncedAt: true, apiKeyEncrypted: true, provider: true } },
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

    // Fetch models và usage từ NCC Pro (nếu có quyền)
    let availableModels: { id: string; display_name: string }[] = []
    let modelStats: { model: string; requests: number; input_tokens: number; output_tokens: number; cost_usd: number }[] = []
    let nccUsage: { remaining: number; expires_at?: string; days_until_expiry?: number; mode?: string } | null = null

    if (effective?.provider === 'ccpro' && effective.apiKeyEncrypted) {
      try {
        const plaintextKey = decrypt(Buffer.from(effective.apiKeyEncrypted))
        const ccpro = new CcProProvider()
        
        // Fetch models + usage in parallel
        const [models, usage] = await Promise.allSettled([
          ccpro.listModels(plaintextKey),
          ccpro.getUsage(plaintextKey),
        ])

        if (models.status === 'fulfilled') {
          availableModels = models.value.map(m => ({ id: m.id, display_name: m.display_name }))
        }

        if (usage.status === 'fulfilled') {
          const u = usage.value
          nccUsage = {
            remaining: u.remaining,
            expires_at: u.expires_at,
            days_until_expiry: u.days_until_expiry,
            mode: u.mode,
          }
          modelStats = (u.model_stats ?? []).map(s => ({
            model: s.model,
            requests: s.requests ?? 0,
            input_tokens: s.input_tokens ?? 0,
            output_tokens: s.output_tokens ?? 0,
            cost_usd: s.cost_usd ?? 0,
          }))
        }
      } catch (err) {
        logger.warn({ err: (err as Error).message, apiKeyId: id }, 'balance: failed to fetch NCC data')
      }
    }

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
        // NCC real-time usage (from NCC Pro)
        nccRemaining: nccUsage?.remaining ?? null,
        nccExpiresAt: nccUsage?.expires_at ?? null,
        nccDaysUntilExpiry: nccUsage?.days_until_expiry ?? null,
        nccMode: nccUsage?.mode ?? null,
        // Available models (from NCC Pro)
        availableModels,
        // Model usage stats (from NCC Pro)
        modelStats,
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