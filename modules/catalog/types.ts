import type { z } from 'zod'
import type { Product as PrismaProduct } from '@prisma/client'
import type {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
} from './validators'

/**
 * Product type với avgRating converted to number (from Prisma Decimal).
 * Repository layer converts Decimal → number for all public queries.
 */
export type Product = Omit<PrismaProduct, 'avgRating'> & {
  avgRating: number
}

export type createProductInput = z.infer<typeof createProductSchema>
export type updateProductInput = z.infer<typeof updateProductSchema>
export type createCategoryInput = z.infer<typeof createCategorySchema>
export type updateCategoryInput = z.infer<typeof updateCategorySchema>
