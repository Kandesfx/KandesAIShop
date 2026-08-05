import { describe, it, expect, beforeEach, vi } from 'vitest'

const notificationFindManyMock = vi.fn()
const notificationCountMock = vi.fn()
const notificationFindUniqueMock = vi.fn()
const notificationUpdateMock = vi.fn()
const auditLogCreateMock = vi.fn()

const processQueueMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    notification: {
      findMany: (...args: unknown[]) => notificationFindManyMock(...args),
      count: (...args: unknown[]) => notificationCountMock(...args),
      findUnique: (...args: unknown[]) => notificationFindUniqueMock(...args),
      update: (...args: unknown[]) => notificationUpdateMock(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => auditLogCreateMock(...args),
    },
  },
}))

const loggerInfoMock = vi.fn()
const loggerWarnMock = vi.fn()
const loggerErrorMock = vi.fn()

vi.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}))

vi.mock('./service', () => ({
  processQueue: (...args: unknown[]) => processQueueMock(...args),
}))

const { notificationAdmin } = await import('./admin')

beforeEach(() => {
  notificationFindManyMock.mockReset()
  notificationCountMock.mockReset()
  notificationFindUniqueMock.mockReset()
  notificationUpdateMock.mockReset()
  auditLogCreateMock.mockReset()
  processQueueMock.mockReset()
  loggerInfoMock.mockReset()
  loggerWarnMock.mockReset()
  loggerErrorMock.mockReset()
  auditLogCreateMock.mockResolvedValue({ id: 'a1' })
  processQueueMock.mockResolvedValue({ processed: 1, sent: 1, failed: 0, deadLettered: 0 })
})

describe('notification admin — P5-08', () => {
  describe('listAdmin', () => {
    it('trả rows + total + pagination', async () => {
      const now = new Date()
      notificationFindManyMock.mockResolvedValueOnce([
        {
          id: 'n1',
          event: 'order.paid',
          channel: 'email',
          recipient: 'a@b.vn',
          orderId: 'o1',
          status: 'sent',
          attempts: 1,
          maxAttempts: 3,
          lastError: null,
          nextAttemptAt: null,
          sentAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ])
      notificationCountMock.mockResolvedValueOnce(1)

      const r = await notificationAdmin.listAdmin({ page: 1, pageSize: 20 })

      expect(r.rows).toHaveLength(1)
      expect(r.total).toBe(1)
      expect(r.page).toBe(1)
      expect(r.pageSize).toBe(20)
    })

    it('build where filter với status + channel', async () => {
      notificationFindManyMock.mockResolvedValueOnce([])
      notificationCountMock.mockResolvedValueOnce(0)

      await notificationAdmin.listAdmin({ status: 'failed', channel: 'telegram' })

      const whereArg = notificationFindManyMock.mock.calls[0]?.[0]?.where
      expect(whereArg).toMatchObject({ status: 'failed', channel: 'telegram' })
    })
  })

  describe('retry', () => {
    it('throw nếu notification không tồn tại', async () => {
      notificationFindUniqueMock.mockResolvedValueOnce(null)
      await expect(notificationAdmin.retry('nope', { id: 'a1' })).rejects.toThrow(
        'không tồn tại'
      )
    })

    it('throw nếu status không retry được', async () => {
      notificationFindUniqueMock.mockResolvedValueOnce({ id: 'n1', status: 'sent', attempts: 1 })
      await expect(notificationAdmin.retry('n1', { id: 'a1' })).rejects.toThrow(
        /không retry được/
      )
    })

    it('reset failed → enqueueRetry + audit + processQueue', async () => {
      notificationFindUniqueMock
        .mockResolvedValueOnce({ id: 'n1', status: 'failed', attempts: 2 }) // first find (retry entry guard)
        .mockResolvedValueOnce({ id: 'n1', payload: {} }) // enqueueRetry inner find
        .mockResolvedValueOnce({ id: 'n1', status: 'queued', attempts: 0, error: null }) // final find to return view
      notificationUpdateMock.mockResolvedValueOnce({ id: 'n1' })

      await notificationAdmin.retry('n1', { id: 'a1' })

      expect(auditLogCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'notification.retry',
            actorId: 'a1',
          }),
        })
      )
      await new Promise((r) => setTimeout(r, 0))
      expect(processQueueMock).toHaveBeenCalledWith(5)
    })
  })
})
