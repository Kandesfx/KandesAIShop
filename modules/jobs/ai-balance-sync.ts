/**
 * AI NCC key balance sync job — Phase 6.
 *
 * Cron handler: mỗi 30 phút scan NCC keys active, attempt sync balance từ NCC API.
 * Phase 6 limitation: CC Pro không có public balance API → job chỉ skew
 * status theo totalQuotaUsd hiện tại (admin manually update `remainingUsd` qua UI).
 *
 * Phase 6+ fallback: set 'low_balance' khi remainingUsd < 10% total.
 *
 * Notification: nếu status chuyển sang 'low_balance' → enqueue telegram admin.
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { notify } from '@/modules/notification'
import type { JobHandler } from './types'

export const aiNccBalanceSync: JobHandler<
  'scanned' | 'synced' | 'lowBalance' | 'exhausted' | 'errors'
> = async () => {
  const counts = { scanned: 0, synced: 0, lowBalance: 0, exhausted: 0, errors: 0 }

  // Get all active NCC keys
  const keys = await db.aiNccKey.findMany({
    where: { status: { in: ['active', 'low_balance'] } },
  })
  counts.scanned = keys.length

  for (const key of keys) {
    try {
      const total = Number(key.totalQuotaUsd)
      const remaining = Number(key.remainingUsd)
      const ratio = total > 0 ? remaining / total : 0

      let newStatus: 'active' | 'low_balance' | 'exhausted' = 'active'
      if (remaining <= 0) {
        newStatus = 'exhausted'
        counts.exhausted += 1
      } else if (ratio <= 0.1) {
        newStatus = 'low_balance'
        counts.lowBalance += 1
      }

      if (newStatus !== key.status) {
        await db.aiNccKey.update({
          where: { id: key.id },
          data: { status: newStatus, lastSyncedAt: new Date() },
        })

        if (newStatus === 'low_balance') {
          // Notify admin
          void notify({
            event: 'order.created',
            recipient: { email: 'admin@kandes.shop' },
            data: {
              orderNumber: `NCC-LOW-${key.id}`,
              totalCents: '0',
              currency: 'USD',
              items: [],
              reason: `NCC key "${key.nickname ?? key.id}" remaining $${remaining.toFixed(2)} / $${total.toFixed(2)} (<10%)`,
            },
          }).catch((err) => {
            logger.error(
              { err: (err as Error).message, nccKeyId: key.id },
              'cron: lowBalance notify failed'
            )
          })
        }
      } else {
        // Just touch lastSyncedAt
        await db.aiNccKey.update({
          where: { id: key.id },
          data: { lastSyncedAt: new Date() },
        })
      }
      counts.synced += 1
    } catch (err) {
      counts.errors += 1
      logger.error(
        { err: (err as Error).message, nccKeyId: key.id },
        'ai-balance-sync: key process failed'
      )
    }
  }

  return counts
}