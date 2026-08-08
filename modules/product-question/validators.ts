import { z } from 'zod'

export const createQuestionSchema = z.object({
  productSlug: z.string().min(1, 'Product slug is required'),
  question: z.string().min(5, 'Question must be at least 5 characters').max(500),
})

export const answerQuestionSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().min(5, 'Answer must be at least 5 characters').max(1000),
})

export const listQuestionsSchema = z.object({
  productSlug: z.string().min(1),
  answered: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(50).optional(),
})

export const toggleVisibilitySchema = z.object({
  questionId: z.string().uuid(),
})
