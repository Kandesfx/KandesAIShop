import { z } from 'zod'

/**
 * Zod validators for admin order endpoints. Run at the route boundary,
 * service accepts parsed input (MASTER_SPEC §4.5 — validate ở ranh giới).
 */

const orderIdParam = z.string().uuid('Order ID không hợp lệ')

const orderStatusEnum = z.enum([
  'all',
  'pending',
  'paid',
  'processing',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
])

const paymentStatusEnum = z.enum([
  'all',
  'unpaid',
  'awaiting',
  'paid',
  'partial',
  'refunded',
  'failed',
])

const deliveryStrategyEnum = z.enum([
  'all',
  'INSTANT_AUTO',
  'MANUAL_KEY',
  'MANUAL_MESSAGE',
  'FILE_DOWNLOAD',
  'TOPUP',
  'EXTERNAL_INVITE',
])

export const listOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: orderStatusEnum.optional(),
  paymentStatus: paymentStatusEnum.optional(),
  deliveryStrategy: deliveryStrategyEnum.optional(),
  search: z.string().trim().min(1).max(120).optional(),
})

export const orderIdParamSchema = z.object({ id: orderIdParam })

const refundInputSchema = z.object({
  amountCents: z.string().regex(/^\d+$/, 'Số tiền phải là số nguyên dương'),
  reason: z.string().trim().min(3).max(500),
})

const cancelInputSchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

const noteInputSchema = z.object({
  note: z.string().trim().min(1).max(2000),
})

const deliverPickSchema = z.object({
  mode: z.literal('pick_from_stock'),
  itemIds: z.array(z.string().uuid()).min(1),
})

const deliverManualKeySchema = z.object({
  mode: z.literal('manual_key'),
  keys: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        key: z.string().trim().min(1).max(2000),
      })
    )
    .min(1),
})

const deliverManualMessageSchema = z.object({
  mode: z.literal('manual_message'),
  messages: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        message: z.string().trim().min(1).max(4000),
      })
    )
    .min(1),
})

export const deliverInputSchema = z.discriminatedUnion('mode', [
  deliverPickSchema,
  deliverManualKeySchema,
  deliverManualMessageSchema,
])

export const schemas = {
  list: listOrdersSchema,
  idParam: orderIdParamSchema,
  refund: refundInputSchema,
  cancel: cancelInputSchema,
  note: noteInputSchema,
  deliver: deliverInputSchema,
}

export type ListOrdersParsed = z.infer<typeof listOrdersSchema>
export type RefundParsed = z.infer<typeof refundInputSchema>
export type CancelParsed = z.infer<typeof cancelInputSchema>
export type NoteParsed = z.infer<typeof noteInputSchema>
export type DeliverParsed = z.infer<typeof deliverInputSchema>
