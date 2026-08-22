/**
 * SLA scanner — P4-08.
 *
 * Quét các order `paid` hoặc `processing` chưa delivered → kiểm tra vượt ngưỡng
 * → enqueue notification theo channels của ngưỡng + ghi OrderSlaHistory.
 *
 * Idempotency:
 *   - OrderSlaHistory chưa có unique `(orderId, thresholdLevel)` (giữ schema y nguyên).
 *   - Mỗi tick check existence trước khi write → duplicate = noop (D23 pattern).
 *
 * Quyết định (sẽ ghi vào CONTEXT.md §7):
 *   - Phase 3 chỉ support channel `email`. Channels khác (telegram/zalo/sms/voice)
 *     sẽ log warn + ghi history row nhưng skip enqueue. Phase 5+ mới wire providers.
 *   - Tính thời gian từ `paidAt` (paid) hoặc `createdAt` (processing) → so với
 *     threshold minutes của SlaConfig resolve theo chain
 *     (product → category → global).
 *   - Auto-cancel chưa chạy ở P4-08 — chỉ set `slaDeadline` khi có config. Phase 5+
 *     sẽ thêm cron cancel khi `now > slaDeadline`.
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { SlaChannel, SlaConfigView } from './types'

export type SlaScanOutput = {
  scanned: number
  breached: number
  enqueued: number
  skippedDuplicate: number
  unsupportedChannels: number
  errors: number
}

const DEFAULT_BATCH_LIMIT = 200

export async function resolveSlaConfig(input: {
  productId: string | null
  categoryId: string | null
}): Promise<SlaConfigView | null> {
  // 1) Product scope
  if (input.productId) {
    const direct = await db.slaConfig.findFirst({
      where: { scopeType: 'product', productId: input.productId, isActive: true },
      include: { product: { select: { name: true } } },
    })
    if (direct) return toView(direct)
  }

  // 2) Category scope
  if (input.categoryId) {
    const direct = await db.slaConfig.findFirst({
      where: { scopeType: 'category', scopeId: input.categoryId, isActive: true },
      include: { product: { select: { name: true } } },
    })
    if (direct) return toView(direct)
  }

  // 3) Global scope
  const global = await db.slaConfig.findFirst({
    where: { scopeType: 'global', isActive: true },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return global ? toView(global) : null
}

function toView(row: {
  id: string
  scopeType: 'global' | 'category' | 'product'
  scopeId: string | null
  productId: string | null
  deliveryStrategy: 'INSTANT_AUTO' | 'MANUAL_KEY' | 'MANUAL_MESSAGE' | 'FILE_DOWNLOAD' | 'TOPUP' | 'EXTERNAL_INVITE' | 'AI_RESELLER'
  threshold1Minutes: number
  threshold1Channels: unknown
  threshold2Minutes: number
  threshold2Channels: unknown
  threshold3Minutes: number
  threshold3Channels: unknown
  autoCancelAtMinutes: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  product?: { name: string } | null
}): SlaConfigView {
  return {
    id: row.id,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    productId: row.productId,
    productName: row.product?.name ?? null,
    deliveryStrategy: row.deliveryStrategy,
    threshold1Minutes: row.threshold1Minutes,
    threshold1Channels: (row.threshold1Channels as SlaChannel[]) ?? [],
    threshold2Minutes: row.threshold2Minutes,
    threshold2Channels: (row.threshold2Channels as SlaChannel[]) ?? [],
    threshold3Minutes: row.threshold3Minutes,
    threshold3Channels: (row.threshold3Channels as SlaChannel[]) ?? [],
    autoCancelAtMinutes: row.autoCancelAtMinutes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Scan toàn bộ paid/processing orders để trigger SLA threshold.
 * Trả về counts (không throw trong loop).
 */
export async function runSlaScan(opts?: { batchLimit?: number }): Promise<SlaScanOutput> {
  const counters: SlaScanOutput = {
    scanned: 0,
    breached: 0,
    enqueued: 0,
    skippedDuplicate: 0,
    unsupportedChannels: 0,
    errors: 0,
  }

  const batchLimit = opts?.batchLimit ?? DEFAULT_BATCH_LIMIT

  const orders = await db.order.findMany({
    where: {
      status: { in: ['paid', 'processing'] },
      paidAt: { not: null },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paidAt: true,
      createdAt: true,
      slaDeadline: true,
      userId: true,
      items: {
        select: {
          productId: true,
          product: {
            select: {
              categoryId: true,
            },
          },
        },
      },
    },
    orderBy: { paidAt: 'asc' },
    take: batchLimit,
  })

  counters.scanned = orders.length

  for (const order of orders) {
    try {
      const firstItem = order.items[0]
      const cfg = await resolveSlaConfig({
        productId: firstItem?.productId ?? null,
        categoryId: firstItem?.product?.categoryId ?? null,
      })
      if (!cfg) {
        counters.skippedDuplicate += 1
        continue
      }

      const breaches = computeBreaches(order, cfg)
      if (breaches.length === 0) continue

      for (const level of breaches) {
        const channels = pickChannels(cfg, level)
        if (channels.length === 0) {
          counters.skippedDuplicate += 1
          continue
        }

        // P10 B3: escalateBreach handles multi-recipient + multi-channel enqueue.
        // Idempotency được handle NGAY trong escalateBreach qua OrderSlaEscalationLog
        // (skip nếu đã fire trong LOUD_REPEAT_INTERVAL_MS). Nên không cần check
        // OrderSlaHistory ở đây nữa — scanner chỉ là trigger đầu tiên.
        const { slaEscalation } = await import('./escalation')
        const minutesOver = Math.round(
          (Date.now() - (order.paidAt ?? order.createdAt).getTime()) / 60_000
        )
        const attempts = await slaEscalation.escalateBreach({
          orderId: order.id,
          orderNumber: order.orderNumber,
          minutesOver,
          level,
          channels,
        })

        // Skip chính là attempt ok=true với error="recent fire, skip"
        const sentChannels = attempts
          .filter((a) => a.ok && a.error !== 'recent fire, skip')
          .map((a) => a.channel)
        const skippedCount = attempts.filter((a) => a.error === 'recent fire, skip').length
        const failedCount = attempts.filter((a) => !a.ok && a.error !== 'recent fire, skip').length

        // P10: giữ lại OrderSlaHistory row để audit nhưng KHÔNG dùng để skip
        // (skip logic đã chuyển sang OrderSlaEscalationLog).
        // Chỉ write 1 row cho cùng (orderId, thresholdLevel) — check trước.
        const historyExists = await db.orderSlaHistory.findFirst({
          where: { orderId: order.id, thresholdLevel: level },
          select: { id: true },
        })
        if (!historyExists) {
          await db.orderSlaHistory.create({
            data: {
              orderId: order.id,
              thresholdLevel: level,
              triggeredAt: new Date(),
              channelsSent: sentChannels as unknown as never,
              result:
                sentChannels.length === 0
                  ? failedCount > 0
                    ? `failed:${failedCount}`
                    : 'no channel delivered'
                  : null,
            },
          })
        }

        if (skippedCount > 0) counters.skippedDuplicate += 1
        if (failedCount > 0) counters.unsupportedChannels += failedCount

        // Set slaDeadline nếu có autoCancelAtMinutes (chưa cancel ở P4-08).
        if (!order.slaDeadline && cfg.autoCancelAtMinutes) {
          await db.order.update({
            where: { id: order.id },
            data: {
              slaDeadline: new Date(
                (order.paidAt ?? order.createdAt).getTime() +
                  cfg.autoCancelAtMinutes * 60 * 1000
              ),
            },
          })
        }

        counters.breached += 1
        if (sentChannels.length > 0) counters.enqueued += 1
      }
    } catch (err) {
      counters.errors += 1
      logger.error(
        {
          err: (err as Error).message,
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
        'sla-scan: order error'
      )
    }
  }

  logger.info(counters, 'sla-scan: tick done')
  return counters
}

function computeBreaches(
  order: { paidAt: Date | null; createdAt: Date },
  cfg: SlaConfigView
): Array<1 | 2 | 3> {
  const origin = order.paidAt ?? order.createdAt
  const elapsedMin = (Date.now() - origin.getTime()) / 60_000
  const breaches: Array<1 | 2 | 3> = []
  if (elapsedMin >= cfg.threshold1Minutes) breaches.push(1)
  if (elapsedMin >= cfg.threshold2Minutes) breaches.push(2)
  if (elapsedMin >= cfg.threshold3Minutes) breaches.push(3)
  return breaches
}

function pickChannels(cfg: SlaConfigView, level: 1 | 2 | 3): SlaChannel[] {
  switch (level) {
    case 1:
      return cfg.threshold1Channels
    case 2:
      return cfg.threshold2Channels
    case 3:
      return cfg.threshold3Channels
  }
}

export const slaScanner = {
  runSlaScan,
  resolveSlaConfig,
}
