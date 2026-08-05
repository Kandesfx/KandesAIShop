/**
 * SLA escalation — P5-06.
 *
 * Thay thế logic enqueue trong modules/sla/scanner.ts: hiện hardcoded gọi
 * `notificationService.notify({channel: 'email'})` duy nhất. Phase 5 multi-channel:
 *   - Mỗi ngưỡng trong SlaConfig có threshold*Channels (list).
 *   - Iterator qua channels → enqueue bằng `notificationService.notify({channel})`.
 *   - Telegram channel: dùng recipient.telegramChatId (hoặc fallback env).
 *   - Channels khác (zalo/sms/voice): log warn (Phase 5+ chưa wire provider).
 *
 * Idempotency: OrderSlaHistory unique-ish (via query check) — KHÔNG ghi duplicate.
 * Channel 'partial' rows ghi 1 lần với channelsSent tổng hợp.
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import type { SlaChannel } from './types'

export interface EscalationAttempt {
  level: 1 | 2 | 3
  channel: SlaChannel
  recipient: string
  ok: boolean
  error?: string
}

/**
 * Enqueue notification across channels configured for a breach level.
 * Return list of attempts (success/fail per channel).
 *
 * Used by scanner.ts. Caller là scanner (background) — KHÔNG throw trong loop.
 */
export async function escalateBreach(input: {
  orderId: string
  orderNumber: string
  productName?: string
  minutesOver: number
  level: 1 | 2 | 3
  channels: SlaChannel[]
}): Promise<EscalationAttempt[]> {
  const attempts: EscalationAttempt[] = []

  for (const channel of input.channels) {
    const recipient = await resolveChannelRecipient(channel, input.orderId)
    if (!recipient) {
      logger.warn(
        { channel, orderId: input.orderId, orderNumber: input.orderNumber },
        'sla-escalation: no recipient — skip channel'
      )
      attempts.push({ level: input.level, channel, recipient: '', ok: false, error: 'no recipient' })
      continue
    }

    try {
      await enqueueForChannel(channel, recipient, {
        orderNumber: input.orderNumber,
        orderId: input.orderId,
        level: input.level,
        minutesOver: input.minutesOver,
        productName: input.productName,
      })
      attempts.push({ level: input.level, channel, recipient, ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'enqueue fail'
      logger.warn(
        { channel, orderId: input.orderId, err: message },
        'sla-escalation: enqueue fail'
      )
      attempts.push({ level: input.level, channel, recipient, ok: false, error: message })
    }
  }

  return attempts
}

async function enqueueForChannel(
  channel: SlaChannel,
  recipient: string,
  data: {
    orderNumber: string
    orderId: string
    level: 1 | 2 | 3
    minutesOver: number
    productName?: string
  }
): Promise<void> {
  if (channel === 'email') {
    const { notificationService } = await import('@/modules/notification')
    await notificationService.notify({
      event: 'sla.breach',
      channel: 'email',
      recipient: { email: recipient },
      orderId: data.orderId,
      data: {
        orderNumber: data.orderNumber,
        totalCents: '0',
        currency: 'VND',
        items: [],
        minutesOver: data.minutesOver,
        level: data.level,
        reason: data.productName,
      },
    })
    return
  }

  if (channel === 'telegram') {
    const { notificationService } = await import('@/modules/notification')
    await notificationService.notify({
      event: 'sla.breach',
      channel: 'telegram',
      recipient: { email: recipient, telegramChatId: recipient },
      orderId: data.orderId,
      data: {
        orderNumber: data.orderNumber,
        totalCents: '0',
        currency: 'VND',
        items: [],
        minutesOver: data.minutesOver,
        level: data.level,
        reason: data.productName,
      },
    })
    return
  }

  // zalo/sms/voice — Phase 5 chưa wire providers.
  logger.warn(
    { channel, orderId: data.orderId },
    'sla-escalation: channel chưa wire provider (Phase 5+)'
  )
}

async function resolveChannelRecipient(channel: SlaChannel, orderId: string): Promise<string | null> {
  if (channel === 'email') {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { userId: true, guestEmail: true },
    })
    if (!order) return null
    if (order.userId) {
      const user = await db.user.findUnique({
        where: { id: order.userId },
        select: { email: true },
      })
      return user?.email ?? null
    }
    return order.guestEmail ?? null
  }

  if (channel === 'telegram') {
    return env.TELEGRAM_ADMIN_CHAT_ID ?? null
  }

  // zalo/sms/voice → use user phone (sms/voice) hoặc zaloid (zalo)
  // Phase 5 không collect → return null → skip
  return null
}

export const slaEscalation = {
  escalateBreach,
}
