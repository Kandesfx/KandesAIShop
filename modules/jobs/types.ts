/**
 * Jobs module — Phase 3 P3-02 / P3-09.
 *
 * Lightweight in-process job runner. Designed for Vercel Cron (each tick
 * triggers an HTTP call to /api/cron/[name]) and external schedulers.
 *
 * Why not BullMQ yet (D18):
 *   - Vercel Hobby/Pro không có worker process.
 *   - Phase 4 deploy đa-worker (Upstash Redis) mới cần queue.
 *   - Phase 3 giữ tất cả tick jobs idempotent và deterministic để khi
 *     wrap BullMQ chỉ phải đổi registry → enqueue, không đổi business logic.
 */

export type JobName =
  | 'sepay-reconcile'
  | 'expire-overdue-orders'
  | 'sla-scan'
  | 'ai-balance-sync'
  | 'ai-quota-alert'
  | 'db-backup' // D74: P7-04 pg_dump → S3 (was orphaned pre-D74)

export type JobContext = {
  /** ISO timestamp server-side start. */
  startedAt: Date
  /** Caller-provided trigger source (vercel-cron | manual | admin-tool). */
  triggeredBy?: string
}

export type JobResult = {
  name: JobName
  ok: boolean
  counts: Record<string, number>
  durationMs: number
  error?: string
}

export type JobHandler<TCountKeys extends string = string> = (
  ctx: JobContext
) => Promise<Record<TCountKeys, number>>
