import { z } from 'zod'

/**
 * Inventory validators — Phase 3 P3-03.
 *
 * Routes boundary. Service trust input.
 */

export const inventoryItemStatus = z.enum([
  'available',
  'reserved',
  'delivered',
  'returned',
  'expired',
])
export type InventoryItemStatusInput = z.infer<typeof inventoryItemStatus>

/**
 * Add stock — paste 1 dòng / nhiều dòng / upload CSV.
 * Mỗi dòng = 1 raw value (key/credential/file content).
 */
export const addStockSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  values: z
    .array(z.string().min(1).max(2048))
    .min(1, 'Cần ít nhất 1 value')
    .max(10000, 'Tối đa 10000 values/batch'),
  note: z.string().max(500).optional(),
})
export type AddStockInput = z.infer<typeof addStockSchema>

/** Search/filter inventory — admin only. */
export const listInventorySchema = z.object({
  status: inventoryItemStatus.optional(),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  fingerprint: z.string().min(4).max(64).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
export type ListInventoryInput = z.infer<typeof listInventorySchema>

/** Batch create — metadata cho InventoryBatch row. */
export const batchSource = z.enum(['manual', 'csv', 'api'])
export type BatchSource = z.infer<typeof batchSource>