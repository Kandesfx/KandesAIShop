import { z } from 'zod'

/**
 * Support ticket schemas — P7-05.
 */

export const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  body: z.string().min(10).max(5000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  orderId: z.string().uuid().optional(),
  category: z.enum(['payment', 'product', 'account', 'other']).default('other'),
})

export const replyTicketSchema = z.object({
  body: z.string().min(1).max(5000),
})

export const resolveTicketSchema = z.object({
  resolution: z.string().max(2000).optional(),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type ReplyTicketInput = z.infer<typeof replyTicketSchema>
export type ResolveTicketInput = z.infer<typeof resolveTicketSchema>