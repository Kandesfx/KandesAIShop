import type { Prisma, NotificationStatus } from '@prisma/client'

/**
 * Admin notification dashboard — P5-08.
 *
 * Filters + pagination khi list. Retry chỉ apply cho failed rows (Prisma enum
 * không có 'dead' — internal outcome 'dead' map về status='failed' lúc write).
 */

export type NotificationRowView = {
  id: string
  event: string
  channel: string
  recipient: string
  orderId: string | null
  status: NotificationStatus
  attempts: number
  maxAttempts: number
  error: string | null
  sentAt: Date | null
  createdAt: Date
}

export type NotificationListFilter = {
  status?: NotificationStatus
  channel?: string
  event?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

export const DEFAULT_PAGE_SIZE = 20

export function buildWhereFilter(
  filter: NotificationListFilter
): Prisma.NotificationWhereInput {
  const where: Prisma.NotificationWhereInput = {}
  if (filter.status) where.status = filter.status
  if (filter.channel) where.channel = filter.channel as Prisma.NotificationWhereInput['channel']
  if (filter.event) where.event = filter.event
  if (filter.from || filter.to) {
    where.createdAt = {}
    if (filter.from) (where.createdAt as Record<string, Date>).gte = filter.from
    if (filter.to) (where.createdAt as Record<string, Date>).lte = filter.to
  }
  return where
}
