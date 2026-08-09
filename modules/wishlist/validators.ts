import { z } from 'zod'

export const addWishlistSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
})

export const removeWishlistSchema = z.object({
  id: z.string().uuid(),
})
