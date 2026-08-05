import { z } from 'zod'
import { SlaScope, DeliveryStrategy } from '@prisma/client'

/**
 * SLA validators — P4-06.
 *
 * Validate ở route boundary. Service KHÔNG validate.
 */

const channelSchema = z.enum(['email', 'telegram', 'zalo', 'sms', 'voice'])

const baseFields = {
  threshold1Minutes: z.coerce.number().int().min(1).max(43200),
  threshold1Channels: z.array(channelSchema).min(1),
  threshold2Minutes: z.coerce.number().int().min(1).max(43200),
  threshold2Channels: z.array(channelSchema).min(1),
  threshold3Minutes: z.coerce.number().int().min(1).max(43200),
  threshold3Channels: z.array(channelSchema).min(1),
  autoCancelAtMinutes: z.coerce.number().int().min(1).max(43200).nullable().optional(),
  isActive: z.coerce.boolean().optional(),
}

export const createSlaConfigSchema = z
  .object({
    scopeType: z.nativeEnum(SlaScope),
    scopeId: z.string().uuid().nullable().optional(),
    productId: z.string().uuid().nullable().optional(),
    deliveryStrategy: z.nativeEnum(DeliveryStrategy),
    ...baseFields,
  })
  .superRefine((data, ctx) => {
    // Logical checks: thresholds tăng dần.
    if (data.threshold2Minutes < data.threshold1Minutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['threshold2Minutes'],
        message: 'Ngưỡng 2 phải ≥ ngưỡng 1',
      })
    }
    if (data.threshold3Minutes < data.threshold2Minutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['threshold3Minutes'],
        message: 'Ngưỡng 3 phải ≥ ngưỡng 2',
      })
    }
    if (data.autoCancelAtMinutes && data.autoCancelAtMinutes < data.threshold3Minutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['autoCancelAtMinutes'],
        message: 'Auto-cancel phải ≥ ngưỡng 3',
      })
    }
    // scopeId required khi scopeType=product/category
    if (data.scopeType === SlaScope.product && !data.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productId'],
        message: 'Cần productId khi scopeType=product',
      })
    }
    if (
      (data.scopeType === SlaScope.category || data.scopeType === SlaScope.product) &&
      !data.scopeId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeId'],
        message: `Cần scopeId khi scopeType=${data.scopeType}`,
      })
    }
  })

export const updateSlaConfigSchema = z
  .object({
    deliveryStrategy: z.nativeEnum(DeliveryStrategy).optional(),
    ...baseFields,
  })
  .superRefine((data, ctx) => {
    if (
      data.threshold2Minutes !== undefined &&
      data.threshold1Minutes !== undefined &&
      data.threshold2Minutes < data.threshold1Minutes
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['threshold2Minutes'],
        message: 'Ngưỡng 2 phải ≥ ngưỡng 1',
      })
    }
    if (
      data.threshold3Minutes !== undefined &&
      data.threshold2Minutes !== undefined &&
      data.threshold3Minutes < data.threshold2Minutes
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['threshold3Minutes'],
        message: 'Ngưỡng 3 phải ≥ ngưỡng 2',
      })
    }
  })

export const slaConfigIdParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
})

export type CreateSlaConfigInputSchema = z.infer<typeof createSlaConfigSchema>
export type UpdateSlaConfigInputSchema = z.infer<typeof updateSlaConfigSchema>
