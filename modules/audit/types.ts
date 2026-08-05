export type AuditAction = string

export interface AuditLogView {
  id: string
  actorId: string | null
  actorType: string
  actorEmail: string | null
  actorName: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  userAgent: string | null
  payload: unknown
  createdAt: string
}

export interface AuditQuery {
  page: number
  limit: number
  actorId?: string
  action?: string
  resourceType?: string
  resourceId?: string
  from?: string
  to?: string
}

export interface AuditListResult {
  items: AuditLogView[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}
