import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { notificationRecipientsService } from '@/modules/notification/recipients'
import type { RecipientChannel } from '@/modules/notification/recipients'
import type { SlaChannel } from './types'

/**
 * SLA escalation — P5-06 + P10 B3.
 *
 * Multi-recipient + loud mode:
 *   - Resolve recipients qua NotificationRecipient table (DB).
 *   - Level 1: 1 recipient (priority thấp nhất).
 *   - Level 2: 2 recipients.
 *   - Level 3: TẤT CẢ on-call (loud mode).
 *   - Loud mode (level 3): gọi voice call + SMS + push telegram mỗi 15 phút cho đến
 *     khi order chuyển trạng thái (delivered/cancelled). Cron `sla-escalation-repeat`
 *     chạy mỗi 5 phút để kiểm tra đơn cần lặp lại.
 *
 * Backward-compat:
 *   - Fallback về env (D35) khi DB rỗng.
 *   - Log đầy đủ vào OrderSlaEscalationLog để audit.
 *   - Idempotent: (orderId, level, channel, recipientId) unique per attempt (15m).
 *
 * Channel 'partial' rows ghi 1 lần với channelsSent tổng hợp (giữ pattern D37).
 */

export interface EscalationAttempt {
  level: 1 | 2 | 3
  channel: SlaChannel
  recipientId: string | null
  recipientTarget: string
  ok: boolean
  error?: string
  isLoud: boolean
  attemptNumber: number
}

const LOUD_REPEAT_INTERVAL_MS = 15 * 60 * 1000 // 15 phút
const LOUD_MAX_LEVEL = 3

/**
 * Enqueue notification across channels × recipients configured for a breach level.
 * Return list of attempts (success/fail per channel/recipient).
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
  isLoud?: boolean
  attemptNumber?: number
}): Promise<EscalationAttempt[]> {
  const isLoud = input.isLoud ?? input.level === LOUD_MAX_LEVEL
  const attemptNumber = input.attemptNumber ?? 1

  const recipients = await notificationRecipientsService.listOnCallRecipients(input.level)
  if (recipients.length === 0) {
    logger.warn(
      { orderId: input.orderId, orderNumber: input.orderNumber, level: input.level },
      'sla-escalation: no recipients — skip'
    )
    return []
  }

  const attempts: EscalationAttempt[] = []

  for (const recipient of recipients) {
    for (const channel of input.channels) {
      const target = pickChannelTarget(recipient.channels, channel)
      if (!target) {
        attempts.push({
          level: input.level,
          channel,
          recipientId: recipient.id === 'env-fallback' ? null : recipient.id,
          recipientTarget: '',
          ok: false,
          error: 'channel not configured for recipient',
          isLoud,
          attemptNumber,
        })
        continue
      }

      // Idempotency check (P10): skip nếu đã fire trong LOUD_REPEAT_INTERVAL_MS
      const recent = await db.orderSlaEscalationLog.findFirst({
        where: {
          orderId: input.orderId,
          thresholdLevel: input.level,
          channel,
          recipientId: recipient.id === 'env-fallback' ? null : recipient.id,
          status: { in: ['enqueued', 'sent'] },
          triggeredAt: { gte: new Date(Date.now() - LOUD_REPEAT_INTERVAL_MS) },
        },
        select: { id: true },
      })
      if (recent) {
        attempts.push({
          level: input.level,
          channel,
          recipientId: recipient.id === 'env-fallback' ? null : recipient.id,
          recipientTarget: target,
          ok: true,
          error: 'recent fire, skip',
          isLoud,
          attemptNumber,
        })
        continue
      }

      const result = await enqueueForChannel(channel, target, {
        orderNumber: input.orderNumber,
        orderId: input.orderId,
        level: input.level,
        minutesOver: input.minutesOver,
        productName: input.productName,
        isLoud,
      })

      attempts.push({
        level: input.level,
        channel,
        recipientId: recipient.id === 'env-fallback' ? null : recipient.id,
        recipientTarget: target,
        ok: result.ok,
        error: result.error,
        isLoud,
        attemptNumber,
      })

      // Log ra OrderSlaEscalationLog
      await db.orderSlaEscalationLog.create({
        data: {
          orderId: input.orderId,
          thresholdLevel: input.level,
          channel,
          recipientId: recipient.id === 'env-fallback' ? null : recipient.id,
          recipientTarget: target,
          notificationId: result.notificationId ?? null,
          isLoud,
          attemptNumber,
          status: result.ok ? (isLoud ? 'sent' : 'enqueued') : 'failed',
          errorMessage: result.error ?? null,
        },
      })
    }
  }

  return attempts
}

interface ChannelEnqueueResult {
  ok: boolean
  error?: string
  notificationId?: string
}

async function enqueueForChannel(
  channel: SlaChannel,
  target: string,
  data: {
    orderNumber: string
    orderId: string
    level: 1 | 2 | 3
    minutesOver: number
    productName?: string
    isLoud: boolean
  }
): Promise<ChannelEnqueueResult> {
  try {
    const { notificationService } = await import('@/modules/notification')

    if (channel === 'email') {
      await notificationService.notify({
        event: 'sla.breach',
        channel: 'email',
        recipient: { email: target },
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
      return { ok: true }
    }

    if (channel === 'telegram') {
      await notificationService.notify({
        event: 'sla.breach',
        channel: 'telegram',
        recipient: { email: target, telegramChatId: target },
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
      return { ok: true }
    }

    if (channel === 'zalo') {
      await notificationService.notify({
        event: 'sla.breach',
        channel: 'zalo',
        recipient: { email: target, zaloUserId: target },
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
      return { ok: true }
    }

    if (channel === 'sms') {
      await notificationService.notify({
        event: 'sla.breach',
        channel: 'sms',
        recipient: { email: target, phone: target },
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
      return { ok: true }
    }

    if (channel === 'voice') {
      await notificationService.notify({
        event: 'sla.breach',
        channel: 'voice',
        recipient: { email: target, phone: target },
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
      return { ok: true }
    }

    return { ok: false, error: `unsupported channel: ${channel}` }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'enqueue fail'
    logger.warn(
      { channel, orderId: data.orderId, isLoud: data.isLoud, err: message },
      'sla-escalation: enqueue fail'
    )
    return { ok: false, error: message }
  }
}

/**
 * Pick the right target string từ recipient.channels cho mỗi channel.
 * Ưu tiên channel-specific value; fallback là email nếu có (cho admin notify nhanh).
 */
function pickChannelTarget(channels: RecipientChannel, channel: SlaChannel): string | null {
  switch (channel) {
    case 'email':
      return channels.email?.to ?? null
    case 'telegram':
      return channels.telegram?.chatId ?? null
    case 'zalo':
      return channels.zalo?.userId ?? null
    case 'sms':
      return channels.sms?.phone ?? null
    case 'voice':
      return channels.voice?.phone ?? null
  }
}

/**
 * Resolve recipient email cho customer notification (dùng order.user.email).
 * Public cho customer-facing escalation nếu cần.
 */
export async function resolveCustomerEmail(orderId: string): Promise<string | null> {
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

/**
 * Loud repeat detection — check xem order cần escalate lại không.
 * Trả về true nếu đơn đang ở paid/processing và đã qua ngưỡng level 3.
 *
 * Cron `sla-escalation-repeat` dùng hàm này để skip nhanh các order không cần lặp.
 */
export async function shouldRepeatLoudEscalation(order: {
  status: string
  paidAt: Date | null
  createdAt: Date
}): Promise<{ repeat: boolean; level: 3 | null; minutesOver: number }> {
  if (order.status !== 'paid' && order.status !== 'processing') {
    return { repeat: false, level: null, minutesOver: 0 }
  }
  const origin = order.paidAt ?? order.createdAt
  const minutesOver = Math.round((Date.now() - origin.getTime()) / 60_000)
  // Chỉ repeat khi đã quá 120 phút (level 3 mặc định)
  if (minutesOver >= 120) {
    return { repeat: true, level: 3, minutesOver }
  }
  return { repeat: false, level: null, minutesOver }
}

export const slaEscalation = {
  escalateBreach,
  shouldRepeatLoudEscalation,
}
