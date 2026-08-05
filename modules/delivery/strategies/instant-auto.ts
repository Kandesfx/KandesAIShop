import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/encryption'
import * as inventoryService from '@/modules/inventory/service'
import type { StrategyContext } from '../types'

/**
 * INSTANT_AUTO — Phase 3 P3-04.
 *
 * Tự động giao key:
 *   1. Reserve 1 inventory item cho order.
 *   2. Decrypt value (in-memory).
 *   3. Encrypt lại với AES-256-GCM và lưu vào OrderItem.deliveredContentEncrypted.
 *   4. Mark inventory item delivered.
 *
 * ⚠️ KHÔNG log decrypted value.
 * ⚠️ KHÔNG trả key cho client ở API — chỉ lưu DB, user dùng reveal-key (P2-09) để xem.
 */
export async function deliverInstantAuto(ctx: StrategyContext): Promise<{
  deliveredItemIds: string[]
  success: boolean
}> {
  const { orderId, orderNumber, productId, variantId } = ctx

  // 1. Reserve inventory
  const inventoryItem = await inventoryService.reserveKey(productId, variantId, orderId)
  logger.info(
    { orderId, orderNumber, inventoryItemId: inventoryItem.id, productId },
    'INSTANT_AUTO reserved inventory'
  )

  // 2. Decrypt value (in-memory)
  let plaintext: string
  try {
    plaintext = decrypt(Buffer.from(inventoryItem.valueEncrypted))
  } catch (err) {
    logger.error(
      { orderId, inventoryItemId: inventoryItem.id, err: (err as Error).message },
      'INSTANT_AUTO decrypt fail — return to stock'
    )
    await inventoryService.returnToStock(inventoryItem.id)
    throw err
  }

  // 3. Re-encrypt + lưu vào OrderItem
  // Plaintext được wrap lại thành ciphertext (AES-256-GCM — định dạng như cũ).
  // Khi user reveal-key (P2-09), decrypt lại.
  const { encrypt } = await import('@/lib/encryption')
  const reEncrypted = encrypt(plaintext)

  // Clear plaintext ASAP
  plaintext = ''

  await db.orderItem.updateMany({
    where: {
      orderId,
      productId,
      variantId: variantId ?? null,
      deliveredContentEncrypted: null, // chỉ update items chưa có key
    },
    data: {
      deliveredContentEncrypted: reEncrypted,
    },
  })

  // 4. Mark inventory delivered
  await inventoryService.markDelivered(inventoryItem.id)

  return { deliveredItemIds: [inventoryItem.id], success: true }
}