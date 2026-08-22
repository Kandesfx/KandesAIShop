import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { slaEscalation } from './escalation'
import type { SlaChannel } from './types'

/**
 * Cron SLA escalation repeat — P10 B4.
 *
 * Mỗi 5 phút quét TẤT CẢ đơn ở trạng thái paid/processing.
 * Nếu đơn đã quá ngưỡng level 3 (>= 120 phút kể từ paid) mà CHƯA được delivered/cancelled
 * thì gọi lại `escalateBreach` với isLoud=true (lặp lại mỗi 15 phút, idempotent).
 *
 * Lưu ý:
 *   - Idempotent: scanner.ts + escalation.ts đã có cơ chế skip nếu đã fire trong 15 phút.
 *   - Không nên chạy đồng thời với scanner.ts để tránh race, nhưng vì idempotent
 *     nên safe.
 *   - Dùng cú pháp `IN (paid, processing)` giống scanner để giảm query.
 *
 * Entry points:
 *   - src/app/api/cron/sla-escalation-repeat/route.ts
 *   - scripts/cron/sla-escalation-repeat.ts (CLI trigger)
 */

export interface RepeatRunResult {
  scanned: number
  escalated: number
  skipped: number
  errors: number
  startedAt: string
  finishedAt: string
}

export async function runSlaEscalationRepeatCron(opts?: {
  limit?: number
  dryRun?: boolean
}): Promise<RepeatRunResult> {
  const startedAt = new Date()
  const limit = opts?.limit ?? 200
  const dryRun = opts?.dryRun ?? false

  // Tìm đơn paid/processing quá 60 phút (để có thể cả level 2 và 3)
  const sinceCutoff = new Date(Date.now() - 60 * 60 * 1000)
  const orders = await db.order.findMany({
    where: {
      status: { in: ['paid', 'processing'] },
      paidAt: { lte: sinceCutoff },
    },
    orderBy: { paidAt: 'asc' },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      paidAt: true,
      createdAt: true,
      items: {
        select: {
          product: {
            select: { name: true },
          },
        },
        take: 1,
      },
    },
  })

  let escalated = 0
  let skipped = 0
  let errors = 0

  for (const order of orders) {
    const productName = order.items[0]?.product?.name
    const decision = await slaEscalation.shouldRepeatLoudEscalation({
      status: 'paid',
      paidAt: order.paidAt,
      createdAt: order.createdAt,
    })

    if (!decision.repeat) {
      skipped++
      continue
    }

    // Lấy channels config từ order.product.slaConfig nếu có; default = tất cả channels
    const channels: SlaChannel[] = ['email', 'telegram', 'zalo', 'sms', 'voice']

    if (dryRun) {
      logger.info(
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          minutesOver: decision.minutesOver,
        },
        'sla-escalation-repeat: DRY-RUN would escalate'
      )
      escalated++
      continue
    }

    try {
      const result = await slaEscalation.escalateBreach({
        orderId: order.id,
        orderNumber: order.orderNumber,
        productName,
        minutesOver: decision.minutesOver,
        level: 3,
        channels,
        isLoud: true,
      })

      const okCount = result.filter((r) => r.ok && r.error !== 'recent fire, skip').length
      const skipCount = result.filter((r) => r.error === 'recent fire, skip').length
      if (okCount > 0) escalated++
      else if (skipCount > 0) skipped++
    } catch (err) {
      errors++
      const message = err instanceof Error ? err.message : 'unknown'
      logger.error(
        { orderId: order.id, err: message },
        'sla-escalation-repeat: failed to escalate'
      )
    }
  }

  const finishedAt = new Date()
  const summary: RepeatRunResult = {
    scanned: orders.length,
    escalated,
    skipped,
    errors,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
  }

  logger.info(summary, 'sla-escalation-repeat: run finished')
  return summary
}

export const slaEscalationRepeatCron = {
  runSlaEscalationRepeatCron,
}
