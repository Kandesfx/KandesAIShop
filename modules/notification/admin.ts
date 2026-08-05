import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { processQueue } from './service'
import { enqueueRetry } from './queue'
import {
  DEFAULT_PAGE_SIZE,
  buildWhereFilter,
  type NotificationListFilter,
  type NotificationRowView,
} from './admin-types'
import type { Notification, NotificationStatus } from '@prisma/client'

/**
 * Admin notification operations — P5-08.
 *
 * - `listAdmin`: trả rows kèm pagination.
 * - `retry`: reset failed rows → queued, kick processQueue.
 */

export interface ListResult {
  rows: NotificationRowView[]
  total: number
  page: number
  pageSize: number
}

export async function listAdmin(filter: NotificationListFilter): Promise<ListResult> {
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? DEFAULT_PAGE_SIZE))
  const where = buildWhereFilter(filter)

  const [rowsRaw, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.notification.count({ where }),
  ])

  const rows = rowsRaw.map(toView)
  return { rows, total, page, pageSize }
}

export async function retry(notificationId: string, actor: { id: string }): Promise<NotificationRowView> {
  const row = await db.notification.findUnique({
    where: { id: notificationId },
  })
  if (!row) {
    throw new Error('Notification không tồn tại')
  }
  if (!isRetryable(row.status)) {
    throw new Error(`Status ${row.status} không retry được (chỉ failed)`)
  }

  await enqueueRetry(notificationId)

  const updated = await db.notification.findUnique({ where: { id: notificationId } })
  if (!updated) throw new Error('Notification vanished after retry')

  await db.auditLog.create({
    data: {
      actorId: actor.id,
      actorType: 'admin',
      action: 'notification.retry',
      resourceType: 'notification',
      resourceId: notificationId,
      payload: {
        previousStatus: row.status,
        previousAttempts: row.attempts,
      },
    },
  })

  logger.info(
    { notificationId, actorId: actor.id, previousStatus: row.status },
    'admin: notification retried'
  )

  void processQueue(5).catch((err: unknown) => {
    logger.error({ err, notificationId }, 'retry processQueue failed')
  })

  return toView(updated)
}

function isRetryable(status: NotificationStatus): boolean {
  return status === 'failed'
}

function toView(row: Notification): NotificationRowView {
  return {
    id: row.id,
    event: row.event,
    channel: row.channel,
    recipient: row.recipient,
    orderId: row.orderId,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    error: row.error,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
  }
}

export const notificationAdmin = {
  listAdmin,
  retry,
}
