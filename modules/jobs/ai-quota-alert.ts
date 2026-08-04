/**
 * AI quota alert job — Phase 6.
 *
 * Cron handler: mỗi 6 giờ scan AiApiKey vượt softCap → notify admin telegram.
 * D47 deviation: KH vẫn được forward (không reject), admin chỉ monitor.
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { notify } from '@/modules/notification'
import type { JobHandler } from './types'

export const aiQuotaAlert: JobHandler<'scanned' | 'overSoftCap' | 'notified' | 'errors'> = async () => {
  const counts = { scanned: 0, overSoftCap: 0, notified: 0, errors: 0 }

  // Get all active keys with plan having softCapTokens
  const keys = await db.aiApiKey.findMany({
    where: {
      status: 'active',
      plan: { softCapTokens: { not: null } },
    },
    include: { plan: { select: { softCapTokens: true, slug: true } } },
  })
  counts.scanned = keys.length

  for (const key of keys) {
    if (key.plan.softCapTokens == null) continue
    if (key.quotaUsedTokens <= key.plan.softCapTokens) continue

    counts.overSoftCap += 1

    try {
      await notify({
        event: 'order.created',
        recipient: { email: 'admin@kandes.shop' },
        data: {
          orderNumber: `AI-QUOTA-${key.id}`,
          totalCents: '0',
          currency: 'USD',
          items: [],
          reason: `API key "${key.name}" (plan ${key.plan.slug}) vượt soft cap: ${key.quotaUsedTokens} / ${key.plan.softCapTokens}`,
        },
      })
      counts.notified += 1
    } catch (err) {
      counts.errors += 1
      logger.error(
        { err: (err as Error).message, apiKeyId: key.id },
        'ai-quota-alert: notify failed'
      )
    }
  }

  return counts
}