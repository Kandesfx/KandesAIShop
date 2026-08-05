import type { z } from 'zod'
import type {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
} from './validators'

export type createProductInput = z.infer<typeof createProductSchema>
export type updateProductInput = z.infer<typeof updateProductSchema>
export type createCategoryInput = z.infer<typeof createCategorySchema>
export type updateCategoryInput = z.infer<typeof updateCategorySchema>
