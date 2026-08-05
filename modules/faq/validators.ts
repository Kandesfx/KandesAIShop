import { z } from 'zod'

export const faqCategorySchema = z.enum(['general', 'payment', 'delivery', 'account', 'refund', 'technical'])
export const faqStatusSchema = z.enum(['draft', 'published', 'archived'])

export const createFaqSchema = z.object({
  category: faqCategorySchema,
  question: z.string().min(5, 'Câu hỏi ≥ 5 ký tự').max(500),
  answer: z.string().min(10, 'Câu trả lời ≥ 10 ký tự').max(10_000),
  position: z.coerce.number().int().min(0).max(9999).default(0),
  status: faqStatusSchema.default('draft'),
})

export const updateFaqSchema = z.object({
  category: faqCategorySchema.optional(),
  question: z.string().min(5).max(500).optional(),
  answer: z.string().min(10).max(10_000).optional(),
  position: z.coerce.number().int().min(0).max(9999).optional(),
  status: faqStatusSchema.optional(),
})

export const faqIdParamSchema = z.object({
  id: z.string().uuid(),
})

export type CreateFaqSchema = z.infer<typeof createFaqSchema>
export type UpdateFaqSchema = z.infer<typeof updateFaqSchema>
