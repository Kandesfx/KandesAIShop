import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { NotFoundError } from '@/lib/errors'
import type {
  SlaConfigView,
  CreateSlaConfigInput,
  UpdateSlaConfigInput,
  SlaChannel,
} from './types'

/**
 * SLA service — P4-06.
 *
 * Admin CRUD cho SlaConfig (global / category / product scope).
 * P4-08 mới wire scanner cron (cron handler nằm ở `modules/jobs/handlers/sla-scanner.ts`).
 *
 * Quy ước:
 *   - KHÔNG validate (route đã parseInput).
 *   - Channels JSON column cast về string[] khi trả ra.
 *   - Soft delete không dùng — hard delete + audit log.
 */

function toView(row: {
  id: string
  scopeType: 'global' | 'category' | 'product'
  scopeId: string | null
  productId: string | null
  deliveryStrategy: 'INSTANT_AUTO' | 'MANUAL_KEY' | 'MANUAL_MESSAGE' | 'FILE_DOWNLOAD' | 'TOPUP' | 'EXTERNAL_INVITE' | 'AI_RESELLER'
  threshold1Minutes: number
  threshold1Channels: unknown
  threshold2Minutes: number
  threshold2Channels: unknown
  threshold3Minutes: number
  threshold3Channels: unknown
  autoCancelAtMinutes: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  product?: { name: string } | null
}): SlaConfigView {
  return {
    id: row.id,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    productId: row.productId,
    productName: row.product?.name ?? null,
    deliveryStrategy: row.deliveryStrategy,
    threshold1Minutes: row.threshold1Minutes,
    threshold1Channels: (row.threshold1Channels as SlaChannel[]) ?? [],
    threshold2Minutes: row.threshold2Minutes,
    threshold2Channels: (row.threshold2Channels as SlaChannel[]) ?? [],
    threshold3Minutes: row.threshold3Minutes,
    threshold3Channels: (row.threshold3Channels as SlaChannel[]) ?? [],
    autoCancelAtMinutes: row.autoCancelAtMinutes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const slaInclude = { product: { select: { name: true } } } as const

export async function listSlaConfigs(opts?: {
  scopeType?: 'global' | 'category' | 'product'
  isActive?: boolean
}): Promise<{ items: SlaConfigView[]; total: number }> {
  const where: Record<string, unknown> = {}
  if (opts?.scopeType) where.scopeType = opts.scopeType
  if (opts?.isActive !== undefined) where.isActive = opts.isActive

  const [rows, total] = await Promise.all([
    db.slaConfig.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: slaInclude,
    }),
    db.slaConfig.count({ where }),
  ])

  return {
    items: rows.map(toView),
    total,
  }
}

export async function getSlaConfig(id: string): Promise<SlaConfigView> {
  const row = await db.slaConfig.findUnique({
    where: { id },
    include: slaInclude,
  })
  if (!row) {
    throw new NotFoundError(`SlaConfig không tồn tại: ${id}`)
  }
  return toView(row)
}

export async function createSlaConfig(
  input: CreateSlaConfigInput,
  actor: { id: string }
): Promise<SlaConfigView> {
  const created = await db.slaConfig.create({
    data: {
      scopeType: input.scopeType,
      scopeId: input.scopeId ?? null,
      productId: input.productId ?? null,
      deliveryStrategy: input.deliveryStrategy,
      threshold1Minutes: input.threshold1Minutes,
      threshold1Channels: input.threshold1Channels as never,
      threshold2Minutes: input.threshold2Minutes,
      threshold2Channels: input.threshold2Channels as never,
      threshold3Minutes: input.threshold3Minutes,
      threshold3Channels: input.threshold3Channels as never,
      autoCancelAtMinutes: input.autoCancelAtMinutes ?? null,
      isActive: input.isActive ?? true,
    },
    include: slaInclude,
  })

  await db.auditLog.create({
    data: {
      actorId: actor.id,
      actorType: 'admin',
      action: 'sla_config.create',
      resourceType: 'sla_config',
      resourceId: created.id,
      payload: { scopeType: created.scopeType, deliveryStrategy: created.deliveryStrategy } as never,
    },
  })

  logger.info(
    {
      slaConfigId: created.id,
      scopeType: created.scopeType,
      actorId: actor.id,
    },
    'SlaConfig created'
  )

  return toView(created)
}

export async function updateSlaConfig(
  id: string,
  input: UpdateSlaConfigInput,
  actor: { id: string }
): Promise<SlaConfigView> {
  const existing = await db.slaConfig.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError(`SlaConfig không tồn tại: ${id}`)
  }

  const updated = await db.slaConfig.update({
    where: { id },
    data: {
      ...(input.deliveryStrategy !== undefined && { deliveryStrategy: input.deliveryStrategy }),
      ...(input.threshold1Minutes !== undefined && { threshold1Minutes: input.threshold1Minutes }),
      ...(input.threshold1Channels !== undefined && {
        threshold1Channels: input.threshold1Channels as never,
      }),
      ...(input.threshold2Minutes !== undefined && { threshold2Minutes: input.threshold2Minutes }),
      ...(input.threshold2Channels !== undefined && {
        threshold2Channels: input.threshold2Channels as never,
      }),
      ...(input.threshold3Minutes !== undefined && { threshold3Minutes: input.threshold3Minutes }),
      ...(input.threshold3Channels !== undefined && {
        threshold3Channels: input.threshold3Channels as never,
      }),
      ...(input.autoCancelAtMinutes !== undefined && {
        autoCancelAtMinutes: input.autoCancelAtMinutes,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    include: slaInclude,
  })

  await db.auditLog.create({
    data: {
      actorId: actor.id,
      actorType: 'admin',
      action: 'sla_config.update',
      resourceType: 'sla_config',
      resourceId: id,
      payload: { changedKeys: Object.keys(input) } as never,
    },
  })

  logger.info({ slaConfigId: id, actorId: actor.id }, 'SlaConfig updated')

  return toView(updated)
}

export async function deleteSlaConfig(id: string, actor: { id: string }): Promise<void> {
  const existing = await db.slaConfig.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError(`SlaConfig không tồn tại: ${id}`)
  }

  await db.slaConfig.delete({ where: { id } })

  await db.auditLog.create({
    data: {
      actorId: actor.id,
      actorType: 'admin',
      action: 'sla_config.delete',
      resourceType: 'sla_config',
      resourceId: id,
      payload: { scopeType: existing.scopeType } as never,
    },
  })

  logger.info({ slaConfigId: id, actorId: actor.id }, 'SlaConfig deleted')
}

export const slaService = {
  listSlaConfigs,
  getSlaConfig,
  createSlaConfig,
  updateSlaConfig,
  deleteSlaConfig,
}
