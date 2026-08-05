import { z } from 'zod'

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  actorId: z.string().optional(),
  action: z.string().max(100).optional(),
  resourceType: z.string().max(100).optional(),
  resourceId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export type AuditQuerySchema = z.infer<typeof auditQuerySchema>
