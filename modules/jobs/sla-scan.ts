/**
 * SLA scan job — P4-08.
 *
 * Cron handler: mỗi 5 phút scan paid/processing orders để trigger ngưỡng SLA.
 * Vercel Cron config xem `vercel.json` (D29 — in-process dispatcher).
 *
 * Idempotent: scanner.ts đã check OrderSlaHistory existence trước khi write.
 */

import { slaScanner } from '../sla/scanner'
import type { JobHandler } from './types'

export const slaScan: JobHandler<
  'scanned' | 'breached' | 'enqueued' | 'skippedDuplicate' | 'unsupportedChannels' | 'errors'
> = async () => {
  const result = await slaScanner.runSlaScan()
  return {
    scanned: result.scanned,
    breached: result.breached,
    enqueued: result.enqueued,
    skippedDuplicate: result.skippedDuplicate,
    unsupportedChannels: result.unsupportedChannels,
    errors: result.errors,
  }
}
