import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import type { CreateFaqInput, FaqView, UpdateFaqInput } from './types'

export const faqService = {
  /** Public list — chỉ trả published. */
  async listPublished(): Promise<FaqView[]> {
    const rows = await db.faq.findMany({
      where: { status: 'published' },
      orderBy: [{ position: 'asc' }, { publishedAt: 'desc' }],
    })
    return rows.map(toView)
  },

  /** Admin list — paginated, có filter. */
  async listAdmin(opts: {
    page: number
    limit: number
    status?: string
    category?: string
  }): Promise<{ items: FaqView[]; total: number; hasMore: boolean }> {
    const where: Record<string, unknown> = {}
    if (opts.status) where.status = opts.status
    if (opts.category) where.category = opts.category
    const [rows, total] = await Promise.all([
      db.faq.findMany({
        where,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      db.faq.count({ where }),
    ])
    return {
      items: rows.map(toView),
      total,
      hasMore: opts.page * opts.limit < total,
    }
  },

  async getById(id: string): Promise<FaqView> {
    const row = await db.faq.findUnique({ where: { id } })
    if (!row) throw new NotFoundError('FAQ not found')
    return toView(row)
  },

  async create(input: CreateFaqInput): Promise<FaqView> {
    const row = await db.faq.create({
      data: {
        category: input.category,
        question: input.question,
        answer: input.answer,
        position: input.position ?? 0,
        status: input.status ?? 'draft',
        publishedAt: input.status === 'published' ? new Date() : null,
      },
    })
    return toView(row)
  },

  async update(id: string, input: UpdateFaqInput): Promise<FaqView> {
    const existing = await db.faq.findUnique({ where: { id }, select: { status: true } })
    if (!existing) throw new NotFoundError('FAQ not found')

    // Auto-set publishedAt khi status flip sang published lần đầu
    const data: Record<string, unknown> = { ...input }
    if (input.status === 'published' && existing.status !== 'published') {
      data.publishedAt = new Date()
    }
    if (input.status && input.status !== 'published') {
      // giữ nguyên publishedAt nếu draft/archived (audit)
    }

    const row = await db.faq.update({ where: { id }, data: data as never })
    return toView(row)
  },

  async delete(id: string): Promise<void> {
    const existing = await db.faq.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new NotFoundError('FAQ not found')
    await db.faq.delete({ where: { id } })
  },

  /** Increment view count (called khi user expand question). */
  async incrementView(id: string): Promise<void> {
    await db.faq.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })
  },
}

function toView(row: {
  id: string
  category: string
  question: string
  answer: string
  position: number
  status: string
  viewCount: number
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
}): FaqView {
  return {
    id: row.id,
    category: row.category as FaqView['category'],
    question: row.question,
    answer: row.answer,
    position: row.position,
    status: row.status as FaqView['status'],
    viewCount: row.viewCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  }
}
