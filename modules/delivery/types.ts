/**
 * Delivery types — Phase 3 P3-04.
 */

import type { DeliveryStrategy as DeliveryStrategyEnum } from '@prisma/client'

export type DeliveryStrategyName = DeliveryStrategyEnum

export type ProcessOrderResult = {
  orderId: string
  strategy: DeliveryStrategyName
  deliveredItemIds: string[]
  status: 'delivered' | 'processing' | 'failed'
  message?: string
}

/**
 * Discriminated union cho strategy input.
 * Mỗi strategy nhận input riêng (vd INSTANT_AUTO cần inventoryService, FILE_DOWNLOAD cần signed URL helper).
 */
export type StrategyContext = {
  orderId: string
  orderNumber: string
  productId: string
  variantId: string | null
  quantity: number
  productDeliveryStrategy: DeliveryStrategyName
}