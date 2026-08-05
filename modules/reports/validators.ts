import { z } from 'zod'

/**
 * Reports validators — P4-07.
 *
 * Validate date range + filters ở route boundary. Service KHÔNG validate.
 */

export const reportRangePresetSchema = z.enum(['7d', '30d', '90d', 'mtd', 'qtd', 'ytd', 'custom'])

const dateString = z
  .string()
  .datetime({ message: 'Ngày không hợp lệ (cần ISO 8601)' })

export const revenueQuerySchema = z
  .object({
    preset: reportRangePresetSchema.default('30d'),
    from: dateString.optional(),
    to: dateString.optional(),
  })
  .refine(
    (q) => {
      if (q.preset !== 'custom') return true
      return !!q.from && !!q.to
    },
    { message: 'Với preset=custom cần from + to' }
  )
  .refine(
    (q) => {
      if (!q.from || !q.to) return true
      return new Date(q.from) < new Date(q.to)
    },
    { message: '`from` phải trước `to`' }
  )

export const inventoryQuerySchema = z.object({
  lowStockThreshold: z.coerce.number().int().min(0).max(10000).default(5),
})

export const topProductsQuerySchema = z
  .object({
    preset: reportRangePresetSchema.default('30d'),
    from: dateString.optional(),
    to: dateString.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .refine(
    (q) => {
      if (q.preset !== 'custom') return true
      return !!q.from && !!q.to
    },
    { message: 'Với preset=custom cần from + to' }
  )
  .refine(
    (q) => {
      if (!q.from || !q.to) return true
      return new Date(q.from) < new Date(q.to)
    },
    { message: '`from` phải trước `to`' }
  )

export type RevenueQueryInput = z.infer<typeof revenueQuerySchema>
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>
export type TopProductsQueryInput = z.infer<typeof topProductsQuerySchema>
