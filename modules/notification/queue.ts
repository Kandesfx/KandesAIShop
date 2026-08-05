/**
 * Notification queue — DB-backed FIFO (D25).
 *
 * Why not BullMQ: Vercel free tier + our single-instance dev deploy have no
 * worker process. Phase 4 (multi-worker deploy) refactors this onto Upstash
 * Redis via BullMQ and keeps the schema identical.
 *
 * Status lifecycle:
 *   queued  ──send OK──► sent    (terminal)
 *   queued  ─fail──► queued      (next attempt at +backoff)
 *   queued  ─fail──► failed      (attempts >= maxAttempts; dead letter)
 *
 * Concurrency: with a single worker (Phase 3), peek + update is safe without
 * row-level locking. Phase 4 will add `SELECT ... FOR UPDATE SKIP LOCKED` when
 * we go multi-worker on Upstash Redis.
 *
 * Backoff schedule stored inside the JSON `payload` field under the
 * `_nextAttemptAt` key (ISO string) so we avoid a schema migration in Phase 3.
 * Phase 4 will promote this to a top-level column during the BullMQ migration.
 */

import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

const NEXT_ATTEMPT_KEY = '_nextAttemptAt'

export type QueueRow = {
  id: string
  status: string
  attempts: number
  maxAttempts: number
  payload: Prisma.JsonValue | null
  channel: string
  event: string
  recipient: string
  orderId: string | null
  error: string | null
}

/** Extract `_nextAttemptAt` from payload (ISO string), or null. */
export function nextAttemptAt(row: { payload: Prisma.JsonValue | null }): Date | null {
  if (!row.payload || typeof row.payload !== 'object' || Array.isArray(row.payload)) return null
  const obj = row.payload as Record<string, unknown>
  const raw = obj[NEXT_ATTEMPT_KEY]
  if (typeof raw !== 'string') return null
  const date = new Date(raw)
  return isNaN(date.getTime()) ? null : date
}

/** Stamp `_nextAttemptAt` inside payload. */
export function withNextAttempt<T extends Prisma.InputJsonValue>(payload: T, when: Date | null): T {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return payload
  }
  return {
    ...(payload as Record<string, unknown>),
    [NEXT_ATTEMPT_KEY]: when ? when.toISOString() : null,
  } as unknown as T
}

/** Find rows whose next attempt is due (or unspecified → immediate). */
export async function peekDueRows(limit: number): Promise<QueueRow[]> {
  const rows = await db.notification.findMany({
    where: {
      status: 'queued',
      attempts: { lt: 3 /* default maxAttempts; refined by per-row maxAttempts check below */ },
    },
    orderBy: { createdAt: 'asc' },
    take: limit * 3, // overshoot — we'll filter by due time in JS to avoid JSON extract gymnastics
    select: {
      id: true,
      status: true,
      attempts: true,
      maxAttempts: true,
      payload: true,
      channel: true,
      event: true,
      recipient: true,
      orderId: true,
      error: true,
    },
  })

  // Filter due rows: respect both maxAttempts (per-row) and the `_nextAttemptAt` window.
  const now = new Date()
  return rows
    .filter((r) => {
      if (r.attempts >= r.maxAttempts) return false
      const due = nextAttemptAt(r)
      return !due || due <= now
    })
    .slice(0, limit)
}

/** Mark send OK. */
export async function markSent(rowId: string): Promise<void> {
  await db.notification.update({
    where: { id: rowId },
    data: {
      status: 'sent',
      sentAt: new Date(),
      deliveredAt: new Date(),
      error: null,
    },
  })
}

/**
 * Mark failure: increment attempts and stamp `_nextAttemptAt` inside payload
 * (or move to `failed` dead-letter when reaching `maxAttempts`).
 */
export async function recordFailure(
  rowId: string,
  errorMessage: string,
  nextAttemptAt: Date | null
): Promise<number> {
  const row = await db.notification.findUnique({
    where: { id: rowId },
    select: { attempts: true, maxAttempts: true, payload: true },
  })
  if (!row) return 0

  const newAttempts = row.attempts + 1
  const isDead = newAttempts >= row.maxAttempts

  const nextPayload = withNextAttempt(
    (row.payload ?? {}) as Prisma.InputJsonValue,
    isDead ? null : nextAttemptAt
  )

  await db.notification.update({
    where: { id: rowId },
    data: {
      status: isDead ? 'failed' : 'queued',
      attempts: newAttempts,
      error: errorMessage,
      payload: nextPayload as Prisma.InputJsonValue,
    },
  })
  return newAttempts
}

/**
 * Reset a row to 'queued' state for admin retry — P5-08.
 * Sets status='queued', attempts=0, error=null, stamps `_nextAttemptAt`=now.
 */
export async function enqueueRetry(rowId: string): Promise<void> {
  const row = await db.notification.findUnique({
    where: { id: rowId },
    select: { payload: true },
  })
  if (!row) throw new Error(`Notification không tồn tại: ${rowId}`)

  const now = new Date()
  const nextPayload = withNextAttempt(
    (row.payload ?? {}) as Prisma.InputJsonValue,
    now
  )

  await db.notification.update({
    where: { id: rowId },
    data: {
      status: 'queued',
      attempts: 0,
      error: null,
      payload: nextPayload as Prisma.InputJsonValue,
    },
  })
}
