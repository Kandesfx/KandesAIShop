import { describe, it, expect, beforeEach, vi } from 'vitest'

const findManyMock = vi.fn()
const countMock = vi.fn()
const findUniqueMock = vi.fn()
const createMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    auditLog: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      count: (...args: unknown[]) => countMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
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

import { auditService } from './service'

beforeEach(() => {
  findManyMock.mockReset()
  countMock.mockReset()
  findUniqueMock.mockReset()
  createMock.mockReset()
})

describe('audit service — P4-09', () => {
  describe('listLogs', () => {
    it('default page=1, limit=20, no filter', async () => {
      findManyMock.mockResolvedValueOnce([])
      countMock.mockResolvedValueOnce(0)
      const r = await auditService.listLogs({ page: 1, limit: 20 })
      expect(r.page).toBe(1)
      expect(r.limit).toBe(20)
      expect(r.total).toBe(0)
      expect(r.hasMore).toBe(false)
    })

    it('build where dựa trên filters', async () => {
      findManyMock.mockResolvedValueOnce([])
      countMock.mockResolvedValueOnce(0)
      await auditService.listLogs({
        page: 2,
        limit: 10,
        actorId: 'a1',
        action: 'order.approve',
        resourceType: 'order',
        resourceId: 'o1',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.999Z',
      })
      const where = findManyMock.mock.calls[0]?.[0]?.where
      expect(where).toMatchObject({
        actorId: 'a1',
        action: 'order.approve',
        resourceType: 'order',
        resourceId: 'o1',
        createdAt: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lte: new Date('2026-01-31T23:59:59.999Z'),
        },
      })
      expect(findManyMock.mock.calls[0]?.[0]?.skip).toBe(10)
      expect(findManyMock.mock.calls[0]?.[0]?.take).toBe(10)
    })

    it('maps row with actor → view', async () => {
      findManyMock.mockResolvedValueOnce([
        {
          id: 'log1',
          actorId: 'u1',
          actorType: 'admin',
          action: 'faq.publish',
          resourceType: 'faq',
          resourceId: 'f1',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla',
          payload: { note: 'ok' },
          createdAt: new Date('2026-01-15T10:00:00Z'),
          actor: { id: 'u1', email: 'admin@test.vn', name: 'Admin' },
        },
      ])
      countMock.mockResolvedValueOnce(1)
      const r = await auditService.listLogs({ page: 1, limit: 20 })
      expect(r.items[0]?.actorEmail).toBe('admin@test.vn')
      expect(r.items[0]?.actorName).toBe('Admin')
      expect(r.items[0]?.action).toBe('faq.publish')
      expect(r.hasMore).toBe(false)
    })

    it('hasMore true khi total > skip+len', async () => {
      findManyMock.mockResolvedValueOnce([])
      countMock.mockResolvedValueOnce(50)
      const r = await auditService.listLogs({ page: 1, limit: 20 })
      expect(r.hasMore).toBe(true)
    })
  })

  describe('getLog', () => {
    it('trả view khi found', async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: 'l1',
        actorId: null,
        actorType: 'system',
        action: 'cron.run',
        resourceType: null,
        resourceId: null,
        ipAddress: null,
        userAgent: null,
        payload: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        actor: null,
      })
      const r = await auditService.getLog('l1')
      expect(r.action).toBe('cron.run')
      expect(r.actorEmail).toBeNull()
    })

    it('throw NotFoundError khi missing', async () => {
      findUniqueMock.mockResolvedValueOnce(null)
      await expect(auditService.getLog('missing')).rejects.toThrow('not found')
    })
  })

  describe('listActions', () => {
    it('distinct actions sort asc', async () => {
      findManyMock.mockResolvedValueOnce([
        { action: 'order.approve' },
        { action: 'faq.publish' },
        { action: 'user.lock' },
      ])
      const r = await auditService.listActions()
      expect(r).toEqual(['order.approve', 'faq.publish', 'user.lock'])
    })
  })

  describe('record', () => {
    it('write row với payload + actorType', async () => {
      createMock.mockResolvedValueOnce({ id: 'new-log' })
      await auditService.record({
        actorId: 'u1',
        actorType: 'admin',
        action: 'order.refund',
        resourceType: 'order',
        resourceId: 'o1',
        ipAddress: '127.0.0.1',
        payload: { amount: 100000 },
      })
      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'u1',
          actorType: 'admin',
          action: 'order.refund',
          resourceType: 'order',
          resourceId: 'o1',
          ipAddress: '127.0.0.1',
          payload: { amount: 100000 },
        }),
      })
    })
  })
})
