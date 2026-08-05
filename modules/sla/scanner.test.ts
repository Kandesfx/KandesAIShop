import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * SLA scanner unit tests — P4-08 + P5-06.
 * Mock Prisma + escalation service. KHÔNG touch real DB.
 */

const slaConfigFindFirstMock = vi.fn()
const orderFindManyMock = vi.fn()
const orderFindUniqueMock = vi.fn()
const orderUpdateMock = vi.fn()
const orderSlaHistoryFindFirstMock = vi.fn()
const orderSlaHistoryCreateMock = vi.fn()
const userFindUniqueMock = vi.fn()
const escalateBreachMock = vi.fn()
const loggerInfoMock = vi.fn()
const loggerWarnMock = vi.fn()
const loggerErrorMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    slaConfig: {
      findFirst: (...args: unknown[]) => slaConfigFindFirstMock(...args),
    },
    order: {
      findMany: (...args: unknown[]) => orderFindManyMock(...args),
      findUnique: (...args: unknown[]) => orderFindUniqueMock(...args),
      update: (...args: unknown[]) => orderUpdateMock(...args),
    },
    orderSlaHistory: {
      findFirst: (...args: unknown[]) => orderSlaHistoryFindFirstMock(...args),
      create: (...args: unknown[]) => orderSlaHistoryCreateMock(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}))

vi.mock('./escalation', () => ({
  slaEscalation: {
    escalateBreach: (...args: unknown[]) => escalateBreachMock(...args),
  },
}))

const { runSlaScan, resolveSlaConfig } = await import('./scanner')

beforeEach(() => {
  slaConfigFindFirstMock.mockReset()
  orderFindManyMock.mockReset()
  orderFindUniqueMock.mockReset()
  orderUpdateMock.mockReset()
  orderSlaHistoryFindFirstMock.mockReset()
  orderSlaHistoryCreateMock.mockReset()
  userFindUniqueMock.mockReset()
  escalateBreachMock.mockReset()
  loggerInfoMock.mockReset()
  loggerWarnMock.mockReset()
  loggerErrorMock.mockReset()
  orderSlaHistoryCreateMock.mockResolvedValue({ id: 'hist-1' })
  orderUpdateMock.mockResolvedValue({ id: 'order-1' })
})

const globalConfig = {
  id: 'cfg-global',
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
  autoCancelAtMinutes: 240,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  product: null,
}

const baseOrder = {
  id: 'order-1',
  orderNumber: 'KDS-20260805-0001',
  status: 'paid' as const,
  paidAt: new Date(Date.now() - 90 * 60 * 1000),
  createdAt: new Date(Date.now() - 120 * 60 * 1000),
  slaDeadline: null,
  userId: 'user-1',
  items: [
    {
      productId: 'prod-1',
      product: { categoryId: 'cat-1' },
    },
  ],
}

describe('sla scanner — P4-08 + P5-06', () => {
  describe('resolveSlaConfig', () => {
    it('priority product → category → global', async () => {
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      const r = await resolveSlaConfig({ productId: 'p1', categoryId: 'c1' })
      expect(r?.id).toBe('cfg-global')
      expect(r?.threshold1Channels).toEqual(['email', 'telegram'])
    })

    it('product config wins', async () => {
      slaConfigFindFirstMock.mockResolvedValueOnce({
        ...globalConfig,
        id: 'cfg-product',
        scopeType: 'product',
      })
      const r = await resolveSlaConfig({ productId: 'p1', categoryId: null })
      expect(r?.id).toBe('cfg-product')
    })

    it('trả null nếu không có config nào', async () => {
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      const r = await resolveSlaConfig({ productId: null, categoryId: null })
      expect(r).toBeNull()
    })
  })

  describe('runSlaScan', () => {
    it('không có order → counters 0', async () => {
      orderFindManyMock.mockResolvedValueOnce([])
      const result = await runSlaScan()
      expect(result.scanned).toBe(0)
      expect(result.breached).toBe(0)
    })

    it('skip order khi không có SlaConfig', async () => {
      orderFindManyMock.mockResolvedValueOnce([baseOrder])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      const result = await runSlaScan()
      expect(result.scanned).toBe(1)
      expect(result.breached).toBe(0)
      expect(result.skippedDuplicate).toBe(1)
    })

    it('trigger ngưỡng 1+2 với escalateBreach', async () => {
      orderFindManyMock.mockResolvedValueOnce([baseOrder])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      orderSlaHistoryFindFirstMock.mockResolvedValue(null)
      escalateBreachMock.mockResolvedValue([
        { level: 1, channel: 'email', recipient: 'a@b.vn', ok: true },
        { level: 1, channel: 'telegram', recipient: 'tg-1', ok: true },
        { level: 2, channel: 'email', recipient: 'a@b.vn', ok: true },
        { level: 2, channel: 'telegram', recipient: 'tg-1', ok: true },
      ])

      const result = await runSlaScan()
      expect(result.scanned).toBe(1)
      expect(result.breached).toBe(2)
      expect(result.enqueued).toBe(2)
      expect(orderSlaHistoryCreateMock).toHaveBeenCalledTimes(2)
      expect(escalateBreachMock).toHaveBeenCalledTimes(2)
    })

    it('idempotent: skip ngưỡng đã trigger', async () => {
      orderFindManyMock.mockResolvedValueOnce([baseOrder])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      orderSlaHistoryFindFirstMock
        .mockResolvedValueOnce({ id: 'h1' })
        .mockResolvedValueOnce(null)
      escalateBreachMock.mockResolvedValue([
        { level: 2, channel: 'email', recipient: 'a@b.vn', ok: true },
      ])

      const result = await runSlaScan()
      expect(result.breached).toBe(1)
      expect(result.enqueued).toBe(1)
      expect(result.skippedDuplicate).toBe(1)
    })

    it('count unsupported channels (zalo/sms/voice fail)', async () => {
      orderFindManyMock.mockResolvedValueOnce([baseOrder])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      orderSlaHistoryFindFirstMock.mockResolvedValue(null)
      escalateBreachMock
        .mockResolvedValueOnce([{ level: 1, channel: 'email', recipient: 'a@b.vn', ok: true }])
        .mockResolvedValueOnce([
          { level: 2, channel: 'email', recipient: 'a@b.vn', ok: true },
          { level: 2, channel: 'telegram', recipient: 'tg-1', ok: false, error: 'provider fail' },
          { level: 2, channel: 'zalo', recipient: '', ok: false, error: 'no recipient' },
        ])

      const result = await runSlaScan()
      expect(result.scanned).toBe(1)
      expect(result.breached).toBe(2)
      expect(result.enqueued).toBe(2)
      // chỉ zalo counted (telegram fail không phải "unsupported")
      expect(result.unsupportedChannels).toBe(1)
    })

    it('set slaDeadline khi có autoCancelAtMinutes', async () => {
      orderFindManyMock.mockResolvedValueOnce([baseOrder])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      orderSlaHistoryFindFirstMock.mockResolvedValue(null)
      escalateBreachMock.mockResolvedValue([
        { level: 1, channel: 'email', recipient: 'a@b.vn', ok: true },
      ])

      await runSlaScan()
      expect(orderUpdateMock).toHaveBeenCalled()
      expect(orderUpdateMock.mock.calls[0]?.[0]).toMatchObject({
        where: { id: 'order-1' },
      })
    })

    it('không set slaDeadline khi đã có', async () => {
      orderFindManyMock.mockResolvedValueOnce([{ ...baseOrder, slaDeadline: new Date() }])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      orderSlaHistoryFindFirstMock.mockResolvedValue(null)
      escalateBreachMock.mockResolvedValue([
        { level: 1, channel: 'email', recipient: 'a@b.vn', ok: true },
      ])

      await runSlaScan()
      expect(orderUpdateMock).not.toHaveBeenCalled()
    })

    it('count error khi order throw', async () => {
      orderFindManyMock.mockResolvedValueOnce([baseOrder])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      orderSlaHistoryFindFirstMock.mockRejectedValueOnce(new Error('db boom'))

      const result = await runSlaScan()
      expect(result.errors).toBe(1)
      expect(result.scanned).toBe(1)
    })
  })
})
