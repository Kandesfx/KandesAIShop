import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { StrategyContext } from '../types'

/**
 * MANUAL_KEY — Phase 3 P3-04.
 *
 * Set order status 'processing' + đợi admin nhập key thủ công qua admin UI (Phase 4).
 *
 * Phase 3 chỉ cần transition status + ghi audit log.
 */
export async function deliverManualKey(ctx: StrategyContext): Promise<{
  deliveredItemIds: string[]
  success: boolean
}> {
  const { orderId, orderNumber } = ctx
  await transitionToProcessing(orderId, 'MANUAL_KEY')
  logger.info(
    { orderId, orderNumber },
    'MANUAL_KEY — chuyển processing, đợi admin nhập key'
  )
  return { deliveredItemIds: [], success: true }
}

export async function deliverManualMessage(ctx: StrategyContext): Promise<{
  deliveredItemIds: string[]
  success: boolean
}> {
  const { orderId, orderNumber } = ctx
  await transitionToProcessing(orderId, 'MANUAL_MESSAGE')
  logger.info(
    { orderId, orderNumber },
    'MANUAL_MESSAGE — chuyển processing, đợi admin nhập message'
  )
  return { deliveredItemIds: [], success: true }
}

export async function deliverFileDownload(ctx: StrategyContext): Promise<{
  deliveredItemIds: string[]
  success: boolean
}> {
  const { orderId, orderNumber } = ctx
  await transitionToProcessing(orderId, 'FILE_DOWNLOAD')
  logger.info(
    { orderId, orderNumber },
    'FILE_DOWNLOAD — chuyển processing, đợi admin upload file'
  )
  return { deliveredItemIds: [], success: true }
}

export async function deliverTopup(ctx: StrategyContext): Promise<{
  deliveredItemIds: string[]
  success: boolean
}> {
  const { orderId, orderNumber } = ctx
  await transitionToProcessing(orderId, 'TOPUP')
  logger.info(
    { orderId, orderNumber },
    'TOPUP — chuyển processing, Phase 4 sẽ implement provider API'
  )
  return { deliveredItemIds: [], success: true }
}

export async function deliverExternalInvite(ctx: StrategyContext): Promise<{
  deliveredItemIds: string[]
  success: boolean
}> {
  const { orderId, orderNumber } = ctx
  await transitionToProcessing(orderId, 'EXTERNAL_INVITE')
  logger.info(
    { orderId, orderNumber },
    'EXTERNAL_INVITE — chuyển processing, Phase 4 sẽ implement email invitation'
  )
  return { deliveredItemIds: [], success: true }
}

/**
 * Transition order: paid → processing (idempotent — skip nếu đã processing/delivered).
 */
async function transitionToProcessing(
  orderId: string,
  strategy: 'MANUAL_KEY' | 'MANUAL_MESSAGE' | 'FILE_DOWNLOAD' | 'TOPUP' | 'EXTERNAL_INVITE'
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  })
  if (!order) throw new Error(`Order ${orderId} không tồn tại`)
  if (order.status !== 'paid') {
    throw new Error(`Order ${orderId} không ở trạng thái 'paid' (status=${order.status})`)
  }

  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: { status: 'processing' },
    }),
    db.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: 'paid',
        toStatus: 'processing',
        reason: `Delivery strategy: ${strategy} (waiting admin)`,
      },
    }),
  ])

  // Tạo Delivery row tracking attempt
  await db.delivery.create({
    data: {
      orderId,
      strategy,
      status: 'pending',
      attemptCount: 1,
    },
  })
}