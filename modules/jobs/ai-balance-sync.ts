/**
 * AI NCC key balance sync job — Phase 7-RB (D57).
 *
 * Cron handler: mỗi 30 phút scan NCC keys active → gọi NCC `/v1/usage` →
 * cập nhật `remainingUsd` + `lastSyncedAt` + set status theo ngưỡng.
 *
 * Phase 6 limitation: CC Pro không có public balance API → job chỉ skew
 * status theo totalQuotaUsd hiện tại.
 * Phase 7-RB: LIVE call NCC `GET /v1/usage` (verified 2026-08-05).
 *
 * Status thresholds:
 *   - remainingUsd > 10% total → active
 *   - 0 < remainingUsd ≤ 10%  → low_balance (notify admin)
 *   - remainingUsd == 0        → exhausted (notify admin)
 *
 * Notification: nếu status CHUYỂN sang low_balance/exhausted → enqueue admin.
 */

import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { notify } from '@/modules/notification'
import { syncNccKeyBalance } from '@/modules/ai-gateway/ncc-keys'
import { decrypt } from '@/lib/encryption'
import type { JobHandler } from './types'

export const aiNccBalanceSync: JobHandler<
  'scanned' | 'synced' | 'lowBalance' | 'exhausted' | 'errors'
> = async () => {
  const counts = { scanned: 0, synced: 0, lowBalance: 0, exhausted: 0, errors: 0 }

  // Get all active NCC keys (skip disabled/exhausted — không sync)
  const keys = await db.aiNccKey.findMany({
    where: { status: { in: ['active', 'low_balance'] } },
  })
  counts.scanned = keys.length

  for (const key of keys) {
    try {
      // Decrypt NCC key plaintext để gọi /v1/usage (chỉ admin internal flow).
      let plaintext: string
      try {
        plaintext = decrypt(Buffer.from(key.apiKeyEncrypted))
      } catch (decErr) {
        counts.errors += 1
        logger.error(
          { err: (decErr as Error).message, nccKeyId: key.id },
          'ai-balance-sync: decrypt failed'
        )
        continue
      }

      // Live call NCC /v1/usage. syncNccKeyBalance:
      //   - getUsage() → return quota.remaining
      //   - compute status theo ratio
      //   - update DB
      //   - return { previousStatus, newStatus, remainingUsd, totalQuotaUsd }
      const result = await syncNccKeyBalance(key.id, plaintext)

      if (result.previousStatus !== result.newStatus) {
        if (result.newStatus === 'low_balance') counts.lowBalance += 1
        if (result.newStatus === 'exhausted') counts.exhausted += 1

        await notifyStatusChange({
          nccKeyId: key.id,
          nickname: key.nickname,
          previousStatus: result.previousStatus,
          newStatus: result.newStatus,
          remainingUsd: result.remainingUsd,
          totalQuotaUsd: result.totalQuotaUsd,
        }).catch((err) => {
          logger.error(
            { err: (err as Error).message, nccKeyId: key.id },
            'cron: status change notify failed'
          )
        })
      }
      counts.synced += 1
    } catch (err) {
      counts.errors += 1
      // Provider call failed → KHÔNG mark error ở DB, chỉ log.
      // Next tick sẽ retry. Chỉ set exhausted nếu đã biết chắc (qua usage endpoint).
      logger.error(
        { err: (err as Error).message, nccKeyId: key.id },
        'ai-balance-sync: sync failed (will retry next tick)'
      )
    }
  }

  logger.info(counts, 'ai-balance-sync: tick done')
  return counts
}

async function notifyStatusChange(input: {
  nccKeyId: string
  nickname: string | null
  previousStatus: string
  newStatus: string
  remainingUsd: number
  totalQuotaUsd: number
}): Promise<void> {
  const ratio =
    input.totalQuotaUsd > 0
      ? ((input.remainingUsd / input.totalQuotaUsd) * 100).toFixed(1)
      : '0'
  const subject =
    input.newStatus === 'exhausted'
      ? `[Kandes AI] NCC key exhausted: ${input.nickname ?? input.nccKeyId}`
      : `[Kandes AI] NCC key low balance: ${input.nickname ?? input.nccKeyId}`

  await notify({
    event: 'order.created',
    recipient: { email: 'admin@kandes.shop' },
    data: {
      orderNumber: `NCC-${input.newStatus.toUpperCase()}-${input.nccKeyId.slice(0, 8)}`,
      totalCents: '0',
      currency: 'USD',
      items: [],
      reason: subject,
    },
  }).catch(async () => {
    // Fallback nếu template không tồn tại → swallow.
  })
}

// Re-export Decimal for type consumers.
export type _PrismaDecimal = Prisma.Decimal