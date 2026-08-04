import { db } from '@/lib/db'
import { logger } from '../../lib/logger'
import { AppError, NotFoundError } from '../../lib/errors'
import { markOrderDelivered } from '../payment/service'
import { notifyOrderEvent } from '../notification'
import { deliverInstantAuto } from './strategies/instant-auto'
import {
  deliverManualKey,
  deliverManualMessage,
  deliverFileDownload,
  deliverTopup,
  deliverExternalInvite,
} from './strategies/manual'
import { deliverAiReseller } from './strategies/ai-reseller'
import type { ProcessOrderResult, StrategyContext } from './types'

/**
 * Delivery service — Phase 3 P3-04.
 *
 * Dispatch order → strategy theo `Product.deliveryStrategy`.
 *
 * Flow:
 *   - Load order + items + product.
 *   - Group items by (productId, variantId) để xử lý quantity.
 *   - For each group: chạy strategy.
 *   - Nếu strategy=INSTANT_AUTO → call `markOrderDelivered()` cuối cùng (sau khi tất cả items OK).
 *
 * Phase 3: sync execution. Phase 4: BullMQ queue + retry.
 */

async function buildContextForItem(order: { id: string; orderNumber: string }, productId: string, variantId: string | null, quantity: number, productDeliveryStrategy: StrategyContext['productDeliveryStrategy']): Promise<StrategyContext> {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    productId,
    variantId,
    quantity,
    productDeliveryStrategy,
  }
}

export async function processOrder(orderId: string): Promise<ProcessOrderResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, deliveryStrategy: true } },
        },
      },
    },
  })

  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng')
  if (order.status !== 'paid') {
    logger.warn(
      { orderId, status: order.status },
      'processOrder called nhưng order chưa paid — skip'
    )
    return {
      orderId,
      strategy: 'INSTANT_AUTO',
      deliveredItemIds: [],
      status: 'processing',
      message: `Order chưa ở trạng thái 'paid' (status=${order.status})`,
    }
  }

  // Group items by (productId, variantId) + strategy
  const groups = new Map<
    string,
    {
      productId: string
      variantId: string | null
      quantity: number
      strategy: StrategyContext['productDeliveryStrategy']
    }
  >()

  for (const it of order.items) {
    const key = `${it.productId}:${it.variantId ?? ''}`
    const existing = groups.get(key)
    if (existing) {
      existing.quantity += it.quantity
    } else {
      groups.set(key, {
        productId: it.productId,
        variantId: it.variantId,
        quantity: it.quantity,
        strategy: it.product.deliveryStrategy,
      })
    }
  }

  const deliveredItemIds: string[] = []
  const strategies = new Set<StrategyContext['productDeliveryStrategy']>()

  for (const group of groups.values()) {
    const ctx = await buildContextForItem(order, group.productId, group.variantId, group.quantity, group.strategy)
    strategies.add(group.strategy)

    const result = await dispatchStrategy(ctx)
    deliveredItemIds.push(...result.deliveredItemIds)

    // Nếu 1 strategy fail → fail cả order, không auto-delivered
    if (!result.success) {
      throw new AppError(
        'DELIVERY_FAILED',
        `Strategy ${group.strategy} fail cho ${group.productId}`,
        500
      )
    }
  }

  // Nếu TẤT CẢ strategies thuộc nhóm instant (INSTANT_AUTO hoặc AI_RESELLER) → mark order delivered.
  // AI_RESELLER auto-delivers bằng cách cấp NCC key NCC ngay khi order paid (P6-11).
  const allInstant = [...strategies].every((s) => s === 'INSTANT_AUTO' || s === 'AI_RESELLER')
  if (allInstant && strategies.size > 0) {
    await markOrderDelivered(order.id)
    // Enqueue email notification (D25 + P3-07). Fire-and-forget — failure
    // never blocks the delivery pipeline.
    void notifyOrderEvent('order.delivered', order.id).catch((err) => {
      logger.error({ err, orderId: order.id }, 'Failed to enqueue order.delivered notification')
    })
    const primaryStrategy: StrategyContext['productDeliveryStrategy'] =
      [...strategies][0] ?? 'INSTANT_AUTO'
    return {
      orderId,
      strategy: primaryStrategy,
      deliveredItemIds,
      status: 'delivered',
    }
  }

  // Mixed hoặc có manual → giữ processing
  return {
    orderId,
    strategy: strategies.values().next().value ?? 'INSTANT_AUTO',
    deliveredItemIds,
    status: 'processing',
    message: strategies.size > 1
      ? `Multiple strategies: ${[...strategies].join(', ')}`
      : `${[...strategies][0]} — chờ admin`,
  }
}

async function dispatchStrategy(ctx: StrategyContext): Promise<{ deliveredItemIds: string[]; success: boolean }> {
  switch (ctx.productDeliveryStrategy) {
    case 'INSTANT_AUTO':
      return deliverInstantAuto(ctx)
    case 'MANUAL_KEY':
      return deliverManualKey(ctx)
    case 'MANUAL_MESSAGE':
      return deliverManualMessage(ctx)
    case 'FILE_DOWNLOAD':
      return deliverFileDownload(ctx)
    case 'TOPUP':
      return deliverTopup(ctx)
    case 'EXTERNAL_INVITE':
      return deliverExternalInvite(ctx)
    case 'AI_RESELLER':
      return deliverAiReseller(ctx)
  }
}

export const deliveryService = {
  processOrder,
}