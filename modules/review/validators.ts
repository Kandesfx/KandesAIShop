import { z } from 'zod'

/**
 * Validators cho review module — P4-04.
 *
 * Validation ở route boundary, service tin tưởng input đã validate.
 */

// Rating 1-5
export const ratingSchema = z.number().int().min(1).max(5)

// Tạo review
export const createReviewSchema = z.object({
  rating: ratingSchema,
  title: z.string().max(200).optional(),
  content: z.string().min(10).max(5000),
  isAnonymous: z.boolean().default(false),
})

// Cập nhật review
export const updateReviewSchema = z.object({
  rating: ratingSchema.optional(),
  title: z.string().max(200).optional().nullable(),
  content: z.string().min(10).max(5000).optional(),
  isAnonymous: z.boolean().optional(),
})

// Filter reviews
export const listReviewsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['newest', 'oldest', 'helpful']).default('newest'),
})

// Mark helpful
export const markHelpfulSchema = z.object({
  reviewId: z.string().uuid(),
})

// Admin approve/reject
export const moderateReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reply: z.string().max(2000).optional(),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
export type ListReviewsInput = z.infer<typeof listReviewsSchema>
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>
