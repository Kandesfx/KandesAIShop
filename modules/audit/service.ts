import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import type { AuditListResult, AuditLogView, AuditQuery } from './types'

export const auditService = {
  /** List audit logs với filter + pagination. */
  async listLogs(query: AuditQuery): Promise<AuditListResult> {
    const where = buildWhere(query)

    const [rows, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          actor: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      db.auditLog.count({ where }),
    ])

    return {
      items: rows.map(toView),
      page: query.page,
      limit: query.limit,
      total,
      hasMore: query.page * query.limit < total,
    }
  },

  /** Get một log detail (cho admin detail panel). */
  async getLog(id: string): Promise<AuditLogView> {
    const row = await db.auditLog.findUnique({
      where: { id },
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
    })
    if (!row) throw new NotFoundError('Audit log not found')
    return toView(row)
  },

  /** List distinct actions để gợi ý filter (cosmetic). */
  async listActions(): Promise<string[]> {
    const rows = await db.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      take: 100,
      orderBy: { action: 'asc' },
    })
    return rows.map((r) => r.action)
  },

  /** Write một audit log (call từ các service khác). */
  async record(input: {
    actorId: string | null
    actorType: 'user' | 'admin' | 'system' | 'anonymous'
    action: string
    resourceType?: string
    resourceId?: string
    ipAddress?: string
    userAgent?: string
    payload?: unknown
  }): Promise<void> {
    await db.auditLog.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorType,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        payload: (input.payload ?? null) as never,
      },
    })
  },
}

function buildWhere(query: AuditQuery) {
  const where: Record<string, unknown> = {}
  if (query.actorId) where.actorId = query.actorId
  if (query.action) where.action = query.action
  if (query.resourceType) where.resourceType = query.resourceType
  if (query.resourceId) where.resourceId = query.resourceId
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    }
  }
  return where
}

function toView(
  row: {
    id: string
    actorId: string | null
    actorType: string
    action: string
    resourceType: string | null
    resourceId: string | null
    ipAddress: string | null
    userAgent: string | null
    payload: unknown
    createdAt: Date
    actor?: { id: string; email: string | null; name: string | null } | null
  }
): AuditLogView {
  return {
    id: row.id,
    actorId: row.actorId,
    actorType: row.actorType,
    actorEmail: row.actor?.email ?? null,
    actorName: row.actor?.name ?? null,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  }
}
