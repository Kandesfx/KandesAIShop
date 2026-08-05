import { z } from 'zod'

export const addItemSchema = z.object({
  productId: z.string().uuid('productId phải là UUID'),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1, 'Số lượng tối thiểu 1').max(99, 'Số lượng tối đa 99'),
})
export type AddItemInput = z.infer<typeof addItemSchema>

export const updateQtySchema = z.object({
  quantity: z.number().int().min(0, 'Số lượng không âm').max(99),
})
export type UpdateQtyInput = z.infer<typeof updateQtySchema>
