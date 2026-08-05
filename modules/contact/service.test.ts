import { describe, it, expect, beforeEach, vi } from 'vitest'

const findManyMock = vi.fn()
const findUniqueMock = vi.fn()
const createMock = vi.fn()
const updateMock = vi.fn()
const countMock = vi.fn()
const auditLogCreateMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    contactSubmission: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      count: (...args: unknown[]) => countMock(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => auditLogCreateMock(...args),
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

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { contactService } from './service'

beforeEach(() => {
  findManyMock.mockReset()
  findUniqueMock.mockReset()
  createMock.mockReset()
  updateMock.mockReset()
  countMock.mockReset()
  auditLogCreateMock.mockReset()
})

describe('contact service — P4-11', () => {
  describe('create', () => {
    it('create row + audit log + return id', async () => {
      createMock.mockResolvedValueOnce({ id: 'sub-1' })
      auditLogCreateMock.mockResolvedValueOnce({})

      const r = await contactService.create({
        name: 'Nguyễn Văn A',
        email: 'a@example.com',
        subject: 'Về đơn hàng',
        message: 'Tôi chưa nhận được key',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla',
      })
      expect(r.id).toBe('sub-1')
      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'a@example.com',
          status: 'new',
        }),
        select: { id: true },
      })
      expect(auditLogCreateMock).toHaveBeenCalled()
    })

    it('audit fail không block create', async () => {
      createMock.mockResolvedValueOnce({ id: 'sub-2' })
      auditLogCreateMock.mockRejectedValueOnce(new Error('audit down'))

      const r = await contactService.create({
        name: 'B',
        email: 'b@example.com',
        subject: 'Câu hỏi',
        message: 'Xin chào',
      })
      expect(r.id).toBe('sub-2')
    })
  })

  describe('listAdmin', () => {
    it('filter status + page', async () => {
      findManyMock.mockResolvedValueOnce([])
      countMock.mockResolvedValueOnce(0)
      await contactService.listAdmin({ page: 2, limit: 10, status: 'new' })
      expect(findManyMock).toHaveBeenCalledWith({
        where: { status: 'new' },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      })
    })
  })

  describe('updateStatus', () => {
    it('update status + notes', async () => {
      findUniqueMock.mockResolvedValueOnce({ id: 'sub-1' })
      updateMock.mockResolvedValueOnce({
        id: 'sub-1',
        name: 'A',
        email: 'a@example.com',
        phone: null,
        subject: 'S',
        message: 'M',
        category: null,
        status: 'resolved',
        ipAddress: null,
        userAgent: null,
        internalNotes: 'Done',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const r = await contactService.updateStatus('sub-1', 'resolved', 'Done')
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'resolved', internalNotes: 'Done' },
      })
      expect(r.status).toBe('resolved')
    })

    it('throw khi missing', async () => {
      findUniqueMock.mockResolvedValueOnce(null)
      await expect(contactService.updateStatus('missing', 'closed')).rejects.toThrow('not found')
    })
  })
})