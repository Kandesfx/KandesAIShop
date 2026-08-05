/**
 * Notification module — P3-07.
 *
 * Centralize outbound transactional notifications (email Phase 3; Telegram/SMS/Zalo
 * Phase 4+). The DB-backed queue uses the existing `Notification` Prisma model so
 * we survive restarts and have an audit trail of every send attempt.
 *
 * Public surface intentionally narrow:
 *   - `notify(event, recipient, data, opts?)` — enqueue.
 *   - `processQueue(limit?)` — worker (cron in Phase 4; called on demand here).
 *
 * Channel routing + retries live in `service.ts`.
 */

import type { NotificationChannel } from '@prisma/client'

/** Events the rest of the codebase can emit. P5-06: thêm `sla.breach`. */
export type NotificationEvent =
  'order.created' | 'order.paid' | 'order.delivered' | 'order.cancelled' | 'order.refunded' | 'sla.breach'

/** Recipient is identified by email (Phase 3). Phone/chat-id deferred. */
export type Recipient = {
  email: string
  /** For Telegram channel. Use `TELEGRAM_ADMIN_CHAT_ID` env fallback when missing. */
  telegramChatId?: string
  /** For Zalo OA channel. Use `ZALO_OA_ADMIN_USER_ID` env fallback when missing. */
  zaloUserId?: string
  /** For Twilio SMS channel. Use E.164 format (+84xxxxxxxxx). */
  phone?: string
  userId?: string
}

export type NotificationData = {
  orderNumber: string
  totalCents: string
  currency: string
  items: Array<{ name: string; quantity: number; unitPriceCents: string }>
  deliveredContentKeys?: boolean // when true, email body may include key link (not the key itself)
  reason?: string // for cancelled/refunded
  /** SLA-specific (D35/P5-06). */
  minutesOver?: number
  level?: 1 | 2 | 3
}

/** Internal shape used by templates (key names are stable, see templates.ts). */
export type ResolvedTemplate = {
  subject: string
  html: string
  text: string
}

/** Backoff schedule in minutes per attempt (1-based). */
export const DEFAULT_BACKOFF_MINUTES: readonly number[] = [1, 5, 15] as const

export const DEFAULT_MAX_ATTEMPTS = 3

export type EnqueueInput = {
  event: NotificationEvent
  recipient: Recipient
  orderId?: string
  /** Channel cụ thể. Default = 'email' khi không truyền. */
  channel?: 'email' | 'telegram' | 'zalo' | 'sms' | 'voice'
  data: NotificationData
}

export type EnqueueResult = {
  notificationId: string
}

export type ProcessResult = {
  processed: number
  sent: number
  failed: number
  deadLettered: number
}

export type NotificationProvider = {
  channel: NotificationChannel
  send: (args: { to: string; subject: string; html: string; text: string }) => Promise<void>
}
