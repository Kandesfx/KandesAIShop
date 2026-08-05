import { z } from 'zod'

/**
 * Schema cho /api/me/notification-prefs. Validate ở route boundary.
 */

const channelKey = z.enum(['email', 'telegram', 'zalo', 'sms'])

const eventKey = z.enum([
  'order.created',
  'order.paid',
  'order.delivered',
  'order.cancelled',
  'order.refunded',
])

export const updatePrefsSchema = z.object({
  channels: z
    .object({
      email: z.boolean().optional(),
      telegram: z.boolean().optional(),
      zalo: z.boolean().optional(),
      sms: z.boolean().optional(),
    })
    .strict()
    .optional(),
  events: z
    .object({
      'order.created': z.boolean().optional(),
      'order.paid': z.boolean().optional(),
      'order.delivered': z.boolean().optional(),
      'order.cancelled': z.boolean().optional(),
      'order.refunded': z.boolean().optional(),
    })
    .strict()
    .optional(),
})

export type UpdatePrefsInput = z.infer<typeof updatePrefsSchema>
