import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * SLA service unit tests — P4-06.
 * Mock `@/lib/db` + `@/lib/logger`. KHÔNG touch real Prisma.
 */

const findManyMock = vi.fn()
const findUniqueMock = vi.fn()
const createMock = vi.fn()
const updateMock = vi.fn()
const deleteMock = vi.fn()
const countMock = vi.fn()
const auditLogCreateMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    slaConfig: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
      count: (...args: unknown[]) => countMock(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => auditLogCreateMock(...args),
    },
  },
}))

const loggerInfoMock = vi.fn()
vi.mock('@/lib/logger', () => ({
  logger: { info: (...args: unknown[]) => loggerInfoMock(...args), warn: vi.fn(), error: vi.fn() },
}))

import { slaService } from './service'

beforeEach(() => {
  findManyMock.mockReset()
  findUniqueMock.mockReset()
  createMock.mockReset()
  updateMock.mockReset()
  deleteMock.mockReset()
  countMock.mockReset()
  auditLogCreateMock.mockReset()
  loggerInfoMock.mockReset()
  auditLogCreateMock.mockResolvedValue({ id: 'log' })
})

const baseRow = {
  id: 'sla-1',
  scopeType: 'global' as const,
  scopeId: null,
  productId: null,
  deliveryStrategy: 'MANUAL_KEY' as const,
  threshold1Minutes: 30,
  threshold1Channels: ['email', 'telegram'],
  threshold2Minutes: 60,
  threshold2Channels: ['email', 'telegram', 'zalo'],
  threshold3Minutes: 120,
  threshold3Channels: ['email', 'telegram', 'zalo', 'voice'],
  autoCancelAtMinutes: null,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  product: null,
}

describe('sla service — P4-06', () => {
  describe('listSlaConfigs', () => {
    it('returns items + total; cast JSON channels', async () => {
      findManyMock.mockResolvedValueOnce([baseRow])
      countMock.mockResolvedValueOnce(1)

      const result = await slaService.listSlaConfigs()
      expect(result.total).toBe(1)
      expect(result.items[0]?.threshold1Channels).toEqual(['email', 'telegram'])
      expect(result.items[0]?.createdAt).toBe('2026-01-01T00:00:00.000Z')
    })
  })

  describe('getSlaConfig', () => {
    it('returns view khi tìm thấy', async () => {
      findUniqueMock.mockResolvedValueOnce(baseRow)
      const view = await slaService.getSlaConfig('sla-1')
      expect(view.id).toBe('sla-1')
      expect(view.threshold2Channels).toContain('zalo')
    })

    it('throws NotFoundError khi không tồn tại', async () => {
      findUniqueMock.mockResolvedValueOnce(null)
      await expect(slaService.getSlaConfig('nope')).rejects.toThrow(/không tồn tại/)
    })
  })

  describe('createSlaConfig', () => {
    it('writes row + audit, returns view', async () => {
      createMock.mockResolvedValueOnce(baseRow)

      const result = await slaService.createSlaConfig(
        {
          scopeType: 'global',
          deliveryStrategy: 'MANUAL_KEY',
          threshold1Minutes: 30,
          threshold1Channels: ['email', 'telegram'],
          threshold2Minutes: 60,
          threshold2Channels: ['email', 'telegram', 'zalo'],
          threshold3Minutes: 120,
          threshold3Channels: ['email', 'telegram', 'zalo', 'voice'],
        },
        { id: 'admin-1' }
      )

      expect(result.id).toBe('sla-1')
      expect(auditLogCreateMock).toHaveBeenCalledTimes(1)
      expect(auditLogCreateMock.mock.calls[0]?.[0]).toMatchObject({
        data: {
          action: 'sla_config.create',
          actorId: 'admin-1',
          resourceId: 'sla-1',
        },
      })
    })
  })

  describe('updateSlaConfig', () => {
    it('updates row + audit khi tồn tại', async () => {
      findUniqueMock.mockResolvedValueOnce(baseRow)
      updateMock.mockResolvedValueOnce({ ...baseRow, threshold1Minutes: 45 })

      const result = await slaService.updateSlaConfig(
        'sla-1',
        { threshold1Minutes: 45 },
        { id: 'admin-1' }
      )

      expect(result.threshold1Minutes).toBe(45)
      expect(updateMock).toHaveBeenCalledTimes(1)
      expect(auditLogCreateMock).toHaveBeenCalledTimes(1)
    })

    it('throws NotFoundError khi id không tồn tại', async () => {
      findUniqueMock.mockResolvedValueOnce(null)
      await expect(
        slaService.updateSlaConfig('nope', { threshold1Minutes: 45 }, { id: 'admin-1' })
      ).rejects.toThrow(/không tồn tại/)
    })
  })

  describe('deleteSlaConfig', () => {
    it('hard delete + audit', async () => {
      findUniqueMock.mockResolvedValueOnce(baseRow)
      deleteMock.mockResolvedValueOnce({ id: 'sla-1' })

      await slaService.deleteSlaConfig('sla-1', { id: 'admin-1' })

      expect(deleteMock).toHaveBeenCalledTimes(1)
      expect(auditLogCreateMock).toHaveBeenCalledTimes(1)
      expect(auditLogCreateMock.mock.calls[0]?.[0]).toMatchObject({
        data: { action: 'sla_config.delete' },
      })
    })

    it('throws NotFoundError khi id không tồn tại', async () => {
      findUniqueMock.mockResolvedValueOnce(null)
      await expect(
        slaService.deleteSlaConfig('nope', { id: 'admin-1' })
      ).rejects.toThrow(/không tồn tại/)
    })
  })
})
