/**
 * Job registry — maps `JobName` → handler.
 *
 * Adding a new job:
 *   1. Add name to `JobName` union in types.ts.
 *   2. Register handler here (with its exact counter keys).
 *   3. Create `app/api/cron/[name]/route.ts` (the directory structure itself acts as
 *      allowlist — anything not registered returns 404).
 */

import type { JobHandler, JobName } from './types'
import { sepayReconcile } from './reconcile'
import { expireOverdueOrders } from './cleanup-pending'
import { slaScan } from './sla-scan'
import { aiNccBalanceSync } from './ai-balance-sync'
import { aiQuotaAlert } from './ai-quota-alert'

const REGISTRY: Record<JobName, JobHandler> = {
  'sepay-reconcile': sepayReconcile,
  'expire-overdue-orders': expireOverdueOrders,
  'sla-scan': slaScan,
  'ai-balance-sync': aiNccBalanceSync,
  'ai-quota-alert': aiQuotaAlert,
}

/**
 * Execute a registered job by name.
 * Throw nếu name không tồn tại — caller (route) trả 404.
 */
export async function runJob(
  name: JobName,
  ctx: Parameters<JobHandler>[0]
): Promise<Record<string, number>> {
  const handler = REGISTRY[name]
  if (!handler) {
    throw new Error(`Unknown job: ${name}`)
  }
  return handler(ctx)
}

/** Read-only list of registered jobs. Useful cho /admin/health route (Phase 4). */
export function listJobs(): JobName[] {
  return Object.keys(REGISTRY) as JobName[]
}
