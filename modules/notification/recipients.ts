import { z } from 'zod'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'

/**
 * Notification recipients — P10 B2.
 *
 * Quản lý danh sách admin on-call nhận SLA escalation + critical alerts.
 * Mỗi recipient có 1 label (vd "Hải on-call", "Hùng backup") + JSON `channels`
 * chứa thông tin liên lạc cho từng channel (email/telegram/zalo/sms/voice).
 *
 * Resolution logic:
 *   - `listOnCallRecipients(level)` — trả về recipients theo mức độ nghiêm trọng:
 *       level 1: 1 recipient có priority thấp nhất
 *       level 2: 2 recipients
 *       level 3: TẤT CẢ on-call
 *   - Fallback: nếu DB rỗng → dùng env-based single recipient (back-compat D35).
 */

export const recipientChannelSchema = z.object({
  email: z.object({ to: z.string().email() }).optional(),
  telegram: z.object({ chatId: z.string().min(1) }).optional(),
  zalo: z.object({ userId: z.string().min(1) }).optional(),
  sms: z.object({ phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone phải E.164') }).optional(),
  voice: z.object({ phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone phải E.164') }).optional(),
})

export type RecipientChannel = z.infer<typeof recipientChannelSchema>

export interface NotificationRecipientView {
  id: string
  userId: string | null
  label: string
  channels: RecipientChannel
  isOnCall: boolean
  isActive: boolean
  priority: number
  notes: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface CreateRecipientInput {
  userId?: string | null
  label: string
  channels: RecipientChannel
  isOnCall?: boolean
  isActive?: boolean
  priority?: number
  notes?: string | null
}

export interface UpdateRecipientInput {
  userId?: string | null
  label?: string
  channels?: RecipientChannel
  isOnCall?: boolean
  isActive?: boolean
  priority?: number
  notes?: string | null
}

function toView(row: {
  id: string
  userId: string | null
  label: string
  channels: unknown
  isOnCall: boolean
  isActive: boolean
  priority: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
}): NotificationRecipientView {
  const channels = recipientChannelSchema.parse(row.channels ?? {})
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    channels,
    isOnCall: row.isOnCall,
    isActive: row.isActive,
    priority: row.priority,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
  }
}

// === List ===

export async function listRecipients(opts?: {
  isActive?: boolean
  isOnCall?: boolean
}): Promise<{ items: NotificationRecipientView[]; total: number }> {
  const where: Record<string, unknown> = {}
  if (opts?.isActive !== undefined) where.isActive = opts.isActive
  if (opts?.isOnCall !== undefined) where.isOnCall = opts.isOnCall

  const [rows, total] = await Promise.all([
    db.notificationRecipient.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    }),
    db.notificationRecipient.count({ where }),
  ])
  return { items: rows.map(toView), total }
}

export async function getRecipient(id: string): Promise<NotificationRecipientView> {
  const row = await db.notificationRecipient.findUnique({ where: { id } })
  if (!row) throw new NotFoundError(`Recipient không tồn tại: ${id}`)
  return toView(row)
}

/**
 * Resolve recipients cho 1 SLA breach level.
 *
 * Quy ước:
 *   - level 1 (cảnh báo sớm): chỉ 1 recipient priority thấp nhất
 *   - level 2 (cảnh báo nặng): 2 recipients
 *   - level 3 (quá hạn nghiêm trọng): TẤT CẢ on-call
 *
 * Nếu DB rỗng → fallback env-based single recipient (D35 back-compat).
 */
export async function listOnCallRecipients(
  level: 1 | 2 | 3
): Promise<NotificationRecipientView[]> {
  const where = { isActive: true, isOnCall: true }
  const take = level === 1 ? 1 : level === 2 ? 2 : 100
  const rows = await db.notificationRecipient.findMany({
    where,
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    take,
  })

  if (rows.length > 0) {
    return rows.map(toView)
  }

  // Fallback: build a virtual recipient from env vars (D35)
  const fallback = buildFallbackRecipient()
  if (!fallback) return []
  return [fallback]
}

function buildFallbackRecipient(): NotificationRecipientView | null {
  const channels: RecipientChannel = {}
  // Email fallback = first super_admin (skip — caller resolves email from order.user.email)
  if (env.TELEGRAM_ADMIN_CHAT_ID) {
    channels.telegram = { chatId: env.TELEGRAM_ADMIN_CHAT_ID }
  }
  if (env.ZALO_OA_ADMIN_USER_ID) {
    channels.zalo = { userId: env.ZALO_OA_ADMIN_USER_ID }
  }
  if (env.TWILIO_FROM_NUMBER && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    // Không có phone env → skip SMS/voice fallback
  }

  if (Object.keys(channels).length === 0) return null

  return {
    id: 'env-fallback',
    userId: null,
    label: 'Env fallback (D35)',
    channels,
    isOnCall: true,
    isActive: true,
    priority: 999,
    notes: 'Auto-generated từ env khi DB rỗng.',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    createdBy: null,
  }
}

// === Create / Update / Delete ===

export async function createRecipient(
  input: CreateRecipientInput,
  actor: { id: string }
): Promise<NotificationRecipientView> {
  // Validate: ít nhất 1 channel phải có
  const filled = Object.values(input.channels).filter(Boolean)
  if (filled.length === 0) {
    throw new ValidationError('Recipient phải có ít nhất 1 channel')
  }

  // Check unique label
  const existing = await db.notificationRecipient.findFirst({
    where: { label: input.label },
    select: { id: true },
  })
  if (existing) {
    throw new ConflictError(`Label đã tồn tại: ${input.label}`)
  }

  const row = await db.notificationRecipient.create({
    data: {
      userId: input.userId ?? null,
      label: input.label,
      channels: input.channels as unknown as object,
      isOnCall: input.isOnCall ?? false,
      isActive: input.isActive ?? true,
      priority: input.priority ?? 100,
      notes: input.notes ?? null,
      createdBy: actor.id,
    },
  })

  logger.info(
    { recipientId: row.id, label: row.label, actorId: actor.id },
    'NotificationRecipient created'
  )
  return toView(row)
}

export async function updateRecipient(
  id: string,
  input: UpdateRecipientInput,
  actor: { id: string }
): Promise<NotificationRecipientView> {
  if (id === 'env-fallback') {
    throw new ValidationError('Không thể sửa env-fallback recipient')
  }

  const existing = await db.notificationRecipient.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError(`Recipient không tồn tại: ${id}`)

  if (input.channels) {
    const filled = Object.values(input.channels).filter(Boolean)
    if (filled.length === 0) {
      throw new ValidationError('Recipient phải có ít nhất 1 channel')
    }
  }
  if (input.label && input.label !== existing.label) {
    const dup = await db.notificationRecipient.findFirst({
      where: { label: input.label, NOT: { id } },
      select: { id: true },
    })
    if (dup) throw new ConflictError(`Label đã tồn tại: ${input.label}`)
  }

  const row = await db.notificationRecipient.update({
    where: { id },
    data: {
      ...(input.userId !== undefined && { userId: input.userId }),
      ...(input.label !== undefined && { label: input.label }),
      ...(input.channels !== undefined && { channels: input.channels as unknown as object }),
      ...(input.isOnCall !== undefined && { isOnCall: input.isOnCall }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  })

  logger.info({ recipientId: id, actorId: actor.id }, 'NotificationRecipient updated')
  return toView(row)
}

export async function deleteRecipient(id: string, actor: { id: string }): Promise<void> {
  if (id === 'env-fallback') {
    throw new ValidationError('Không thể xoá env-fallback recipient')
  }
  const existing = await db.notificationRecipient.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError(`Recipient không tồn tại: ${id}`)

  await db.notificationRecipient.delete({ where: { id } })
  logger.info({ recipientId: id, actorId: actor.id }, 'NotificationRecipient deleted')
}

export const notificationRecipientsService = {
  listRecipients,
  getRecipient,
  listOnCallRecipients,
  createRecipient,
  updateRecipient,
  deleteRecipient,
}
