import { describe, it, expect, beforeEach, vi } from 'vitest'

const findManyMock = vi.fn()
const findUniqueMock = vi.fn()
const createMock = vi.fn()
const updateMock = vi.fn()
const deleteMock = vi.fn()
const countMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    faq: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
      count: (...args: unknown[]) => countMock(...args),
    },
  },
}))

vi.mock('@/lib/errors', () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(m: string) {
      super(m)
      this.name = 'NotFoundError'
    }
  },
}))

import { faqService } from './service'

beforeEach(() => {
  findManyMock.mockReset()
  findUniqueMock.mockReset()
  createMock.mockReset()
  updateMock.mockReset()
  deleteMock.mockReset()
  countMock.mockReset()
})

describe('faq service — P4-11', () => {
  describe('listPublished', () => {
    it('chỉ trả status=published', async () => {
      findManyMock.mockResolvedValueOnce([])
      await faqService.listPublished()
      expect(findManyMock).toHaveBeenCalledWith({
        where: { status: 'published' },
        orderBy: [{ position: 'asc' }, { publishedAt: 'desc' }],
      })
    })
  })

  describe('listAdmin', () => {
    it('filter status + category', async () => {
      findManyMock.mockResolvedValueOnce([])
      countMock.mockResolvedValueOnce(0)
      await faqService.listAdmin({ page: 1, limit: 20, status: 'draft', category: 'payment' })
      expect(findManyMock).toHaveBeenCalledWith({
        where: { status: 'draft', category: 'payment' },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        skip: 0,
        take: 20,
      })
    })
  })

  describe('create', () => {
    it('set publishedAt khi status=published', async () => {
      createMock.mockResolvedValueOnce({
        id: 'f1',
        category: 'general',
        question: 'Q?',
        answer: 'A.',
        position: 0,
        status: 'published',
        viewCount: 0,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        publishedAt: new Date('2026-01-01'),
      })
      const r = await faqService.create({
        category: 'general',
        question: 'Q?',
        answer: 'A.',
        status: 'published',
      })
      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: 'general',
          status: 'published',
          publishedAt: expect.any(Date),
        }),
      })
      expect(r.id).toBe('f1')
    })

    it('publishedAt null khi status=draft', async () => {
      createMock.mockResolvedValueOnce({
        id: 'f2',
        category: 'general',
        question: 'Q2?',
        answer: 'A2.',
        position: 0,
        status: 'draft',
        viewCount: 0,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        publishedAt: null,
      })
      await faqService.create({
        category: 'general',
        question: 'Q2?',
        answer: 'A2.',
        status: 'draft',
      })
      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          publishedAt: null,
        }),
      })
    })
  })

  describe('update', () => {
    it('auto-set publishedAt khi flip draft → published', async () => {
      findUniqueMock.mockResolvedValueOnce({ status: 'draft' })
      updateMock.mockResolvedValueOnce({
        id: 'f1',
        category: 'general',
        question: 'Q?',
        answer: 'A.',
        position: 0,
        status: 'published',
        viewCount: 0,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        publishedAt: new Date(),
      })
      await faqService.update('f1', { status: 'published' })
      const callArg = updateMock.mock.calls[0]?.[0]?.data
      expect(callArg.publishedAt).toBeInstanceOf(Date)
    })

    it('không set publishedAt khi giữ nguyên published', async () => {
      findUniqueMock.mockResolvedValueOnce({ status: 'published' })
      updateMock.mockResolvedValueOnce({
        id: 'f1',
        category: 'general',
        question: 'Q?',
        answer: 'A.',
        position: 0,
        status: 'published',
        viewCount: 0,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        publishedAt: new Date('2026-01-01'),
      })
      await faqService.update('f1', { status: 'published' })
      const callArg = updateMock.mock.calls[0]?.[0]?.data
      expect(callArg.publishedAt).toBeUndefined()
    })

    it('throw NotFoundError khi missing', async () => {
      findUniqueMock.mockResolvedValueOnce(null)
      await expect(faqService.update('missing', { status: 'archived' })).rejects.toThrow('not found')
    })
  })

  describe('delete', () => {
    it('delete thành công', async () => {
      findUniqueMock.mockResolvedValueOnce({ id: 'f1' })
      deleteMock.mockResolvedValueOnce({ id: 'f1' })
      await expect(faqService.delete('f1')).resolves.toBeUndefined()
    })

    it('throw khi missing', async () => {
      findUniqueMock.mockResolvedValueOnce(null)
      await expect(faqService.delete('missing')).rejects.toThrow('not found')
    })
  })

  describe('incrementView', () => {
    it('call update với increment 1', async () => {
      updateMock.mockResolvedValueOnce({})
      await faqService.incrementView('f1')
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { viewCount: { increment: 1 } },
      })
    })
  })
})