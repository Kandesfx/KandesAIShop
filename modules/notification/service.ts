/**
 * Notification service — Phase 3 P3-07.
 *
 * Public API:
 *   - `notify(input)` — enqueue + best-effort immediate attempt.
 *   - `processQueue(limit?)` — worker tick. Idempotent.
 *
 * Backoff schedule: DEFAULT_BACKOFF_MINUTES = [1, 5, 15].
 * After `attempts` failures, status flips to `failed` and row stays as
 * audit trail (admin can re-enqueue from a future Admin UI tool).
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { NotFoundError } from '@/lib/errors'
import { peekDueRows, markSent, recordFailure } from './queue'
import { resolveTemplate } from './templates'
import { getEmailProvider } from './providers/email'
import { getTelegramProvider } from './providers/telegram'
import { getZaloProvider } from './providers/zalo'
import { getSmsProvider } from './providers/sms'
import { getVoiceProvider } from './providers/voice'
import {
  DEFAULT_BACKOFF_MINUTES,
  DEFAULT_MAX_ATTEMPTS,
  type EnqueueInput,
  type EnqueueResult,
  type NotificationData,
  type ProcessResult,
  type Recipient,
  type NotificationEvent,
} from './types'
import type { Prisma, Notification } from '@prisma/client'

/**
 * Enqueue a notification and try to send immediately.
 * Failure to send does NOT throw — the row sits in the queue and a later
 * cron tick (Phase 4) will retry. We log loud, but never break the caller.
 */
export async function notify(input: EnqueueInput): Promise<EnqueueResult> {
  const channel = input.channel ?? 'email'
  let recipient = input.recipient.email
  if (channel === 'telegram') recipient = input.recipient.telegramChatId ?? input.recipient.email
  if (channel === 'zalo') recipient = input.recipient.zaloUserId ?? input.recipient.email
  if (channel === 'sms' || channel === 'voice') recipient = input.recipient.phone ?? input.recipient.email

  const row = await db.notification.create({
    data: {
      event: input.event,
      channel,
      recipient,
      recipientUserId: input.recipient.userId ?? null,
      orderId: input.orderId ?? null,
      templateCode: input.event,
      status: 'queued',
      attempts: 0,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      payload: input.data as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  })

  logger.info(
    {
      notificationId: row.id,
      event: input.event,
      channel,
      orderId: input.orderId,
      recipient: maskRecipient(channel, recipient),
    },
    'Notification enqueued'
  )

  // Fire-and-forget attempt to deliver ASAP. We don't await — caller returns
  // immediately. The tick above already committed the row, so a future retry
  // will pick it up. Errors inside `tryDeliver` are swallowed by the queue row.
  void processQueue(5).catch((err) => {
    logger.error({ err, notificationId: row.id }, 'Background processQueue failed')
  })

  return { notificationId: row.id }
}

/**
 * Pull due rows, send via the channel-specific provider, update status.
 * Returns counters for the caller (admin tool / cron handler / test).
 */
export async function processQueue(limit = 20): Promise<ProcessResult> {
  const rows = await peekDueRows(limit)
  if (rows.length === 0) {
    return { processed: 0, sent: 0, failed: 0, deadLettered: 0 }
  }

  let sent = 0
  let failed = 0
  let deadLettered = 0

  for (const row of rows) {
    const outcome = await tryDeliver(row)
    if (outcome === 'sent') sent += 1
    else if (outcome === 'failed') failed += 1
    else if (outcome === 'dead') deadLettered += 1
  }

  return { processed: rows.length, sent, failed, deadLettered }
}

type Outcome = 'sent' | 'failed' | 'dead'

async function tryDeliver(row: Awaited<ReturnType<typeof peekDueRows>>[number]): Promise<Outcome> {
  const data = row.payload as unknown as NotificationData
  const event = row.event as NotificationEvent

  const tpl = resolveTemplate(event, data)
  if (!tpl) {
    logger.warn({ notificationId: row.id, event }, 'Unknown notification event — dead-letter')
    await recordFailure(row.id, `Unknown event: ${event}`, null)
    return 'dead'
  }

  if (row.channel === 'email') {
    try {
      await getEmailProvider().send({
        to: row.recipient,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      })
      await markSent(row.id)
      logger.info({ notificationId: row.id, event, orderId: row.orderId }, 'Notification sent (email)')
      return 'sent'
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown send error'
      const nextAttempts = await recordFailure(row.id, message, nextAttemptDate(row.attempts + 1))
      const isDead = nextAttempts >= row.maxAttempts
      logger.warn(
        { notificationId: row.id, attempts: nextAttempts, isDead, message },
        'Notification email send failed'
      )
      return isDead ? 'dead' : 'failed'
    }
  }

  if (row.channel === 'telegram') {
    return deliver(getTelegramProvider(), 'telegram', row, tpl)
  }

  if (row.channel === 'zalo') {
    return deliver(getZaloProvider(), 'zalo', row, tpl)
  }

  if (row.channel === 'sms') {
    return deliver(getSmsProvider(), 'sms', row, tpl)
  }

  if (row.channel === 'voice') {
    return deliver(getVoiceProvider(), 'voice', row, tpl)
  }

  logger.warn(
    { notificationId: row.id, channel: row.channel },
    'Unsupported channel — dead-letter'
  )
  await recordFailure(row.id, `Unsupported channel: ${row.channel}`, null)
  return 'dead'
}

/**
 * Helper: gọi provider, handle retry/dead-letter logic, log channel-specific.
 * Provider interface giống nhau → 1 hàm for all.
 */
async function deliver(
  provider: { channel: string; send: (a: { to: string; subject: string; html: string; text: string }) => Promise<void> },
  channelLabel: string,
  row: Awaited<ReturnType<typeof peekDueRows>>[number],
  tpl: { subject: string; html: string; text: string }
): Promise<Outcome> {
  try {
    await provider.send({
      to: row.recipient,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    })
    await markSent(row.id)
    logger.info(
      { notificationId: row.id, event: row.event, orderId: row.orderId, channel: channelLabel },
      `Notification sent (${channelLabel})`
    )
    return 'sent'
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown send error'
    const nextAttempts = await recordFailure(row.id, message, nextAttemptDate(row.attempts + 1))
    const isDead = nextAttempts >= row.maxAttempts
    logger.warn(
      { notificationId: row.id, channel: channelLabel, attempts: nextAttempts, isDead, message },
      `Notification ${channelLabel} send failed`
    )
    return isDead ? 'dead' : 'failed'
  }
}

/**
 * Compute `nextAttemptAt` from the backoff schedule, indexed by the new attempt
 * number (1-based after increment). Past the schedule → return null which means
 * "no further retries from this code path" (the row is already in dead-letter).
 */
function nextAttemptDate(newAttempts: number): Date {
  const idx = Math.max(0, Math.min(newAttempts - 1, DEFAULT_BACKOFF_MINUTES.length - 1))
  const minutes = DEFAULT_BACKOFF_MINUTES[idx] ?? DEFAULT_BACKOFF_MINUTES[0]
  return new Date(Date.now() + (minutes ?? 1) * 60 * 1000)
}

/** Mask recipient for log. */
function maskRecipient(channel: string, recipient: string): string {
  if (!recipient) return ''
  if (channel === 'email') return maskEmail(recipient)
  // Telegram chat_id / Zalo user_id / phone — mask giữa
  if (recipient.length <= 4) return '****'
  return `${recipient.slice(0, 2)}****${recipient.slice(-2)}`
}

/** Mask email for log: keep first 2 chars + ***. */
function maskEmail(email: string): string {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const localMask = local.length <= 2 ? '**' : `${local.slice(0, 2)}***`
  return `${localMask}@${domain}`
}

// === Order-specific helpers (called by checkout / delivery / order-admin) ===

/**
 * Resolve recipient + items for an order and fire `notify(...)`.
 * Silently no-ops if no usable recipient (e.g. guest with only phone).
 */
export async function notifyOrderEvent(
  event: NotificationEvent,
  orderId: string,
  reason?: string
): Promise<EnqueueResult | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, email: true } },
      items: {
        select: {
          productNameSnapshot: true,
          quantity: true,
          unitPriceCents: true,
          deliveredContentEncrypted: true,
          deliveredMessage: true,
        },
      },
    },
  })
  if (!order) throw new NotFoundError('Order not found')

  const recipient: Recipient | null = order.user?.email
    ? { email: order.user.email, userId: order.user.id }
    : order.guestEmail
      ? { email: order.guestEmail }
      : null

  if (!recipient) {
    logger.warn({ orderId, event }, 'Order has no email recipient — skip notification')
    return null
  }

  const items = order.items.map((it) => ({
    name: it.productNameSnapshot,
    quantity: it.quantity,
    unitPriceCents: it.unitPriceCents.toString(),
  }))

  // True only if AT LEAST ONE item carries delivered content (key / message / file).
  // Email body is generic either way — the actual key remains on the secure
  // account page (D16).
  const hasDeliveredContent = order.items.some(
    (it) => it.deliveredContentEncrypted !== null || it.deliveredMessage !== null
  )

  const data: NotificationData = {
    orderNumber: order.orderNumber,
    totalCents: order.totalCents.toString(),
    currency: order.currency,
    items,
    deliveredContentKeys: hasDeliveredContent,
    reason,
  }
  return notify({ event, recipient, orderId: order.id, data })
}

// === Test / introspection helpers ===

/** Look up one notification row by id (used by integration tests). */
export async function getNotification(id: string): Promise<Notification | null> {
  return db.notification.findUnique({ where: { id } })
}

export const notificationService = {
  notify,
  processQueue,
  notifyOrderEvent,
  getNotification,
}
