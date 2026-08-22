import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * SLA scanner unit tests — P4-08 + P5-06 + P10 B3.
 *
 * Mock Prisma + escalation service. KHÔNG touch real DB.
 *
 * P10 note: scanner không còn skip ở OrderSlaHistory (chuyển skip logic sang
 * escalation.ts qua OrderSlaEscalationLog). Vẫn write 1 history row per
 * (orderId, thresholdLevel) cho audit.
 */

const slaConfigFindFirstMock = vi.fn()
const orderFindManyMock = vi.fn()
const orderUpdateMock = vi.fn()
const orderSlaHistoryFindFirstMock = vi.fn()
const orderSlaHistoryCreateMock = vi.fn()
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
      update: (...args: unknown[]) => orderUpdateMock(...args),
    },
    orderSlaHistory: {
      findFirst: (...args: unknown[]) => orderSlaHistoryFindFirstMock(...args),
      create: (...args: unknown[]) => orderSlaHistoryCreateMock(...args),
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
  orderUpdateMock.mockReset()
  orderSlaHistoryFindFirstMock.mockReset()
  orderSlaHistoryCreateMock.mockReset()
  escalateBreachMock.mockReset()
  loggerInfoMock.mockReset()
  loggerWarnMock.mockReset()
  loggerErrorMock.mockReset()
  orderSlaHistoryCreateMock.mockResolvedValue({ id: 'hist-1' })
  orderUpdateMock.mockResolvedValue({ id: 'order-1' })
  orderSlaHistoryFindFirstMock.mockResolvedValue(null) // default: chưa có history row
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

describe('sla scanner — P4-08 + P5-06 + P10 B3', () => {
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
      escalateBreachMock
        .mockResolvedValueOnce([
          { level: 1, channel: 'email', recipientId: null, recipientTarget: 'a@b.vn', ok: true, isLoud: false, attemptNumber: 1 },
          { level: 1, channel: 'telegram', recipientId: null, recipientTarget: 'tg-1', ok: true, isLoud: false, attemptNumber: 1 },
        ])
        .mockResolvedValueOnce([
          { level: 2, channel: 'email', recipientId: null, recipientTarget: 'a@b.vn', ok: true, isLoud: false, attemptNumber: 1 },
          { level: 2, channel: 'telegram', recipientId: null, recipientTarget: 'tg-1', ok: true, isLoud: false, attemptNumber: 1 },
        ])

      const result = await runSlaScan()
      expect(result.scanned).toBe(1)
      expect(result.breached).toBe(2)
      expect(result.enqueued).toBe(2)
      expect(orderSlaHistoryCreateMock).toHaveBeenCalledTimes(2)
      expect(escalateBreachMock).toHaveBeenCalledTimes(2)
    })

    it('không tạo duplicate OrderSlaHistory khi cùng (orderId, level)', async () => {
      orderFindManyMock.mockResolvedValueOnce([baseOrder])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      // Level 1: history exists → skip write; Level 2: chưa có → write
      orderSlaHistoryFindFirstMock
        .mockResolvedValueOnce({ id: 'h1' })
        .mockResolvedValueOnce(null)
      escalateBreachMock
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { level: 2, channel: 'email', recipientId: null, recipientTarget: 'a@b.vn', ok: true, isLoud: false, attemptNumber: 1 },
        ])

      const result = await runSlaScan()
      expect(result.breached).toBe(2) // cả 2 ngưỡng đều gọi escalate (idempotent skip ngay trong escalation)
      expect(result.enqueued).toBe(1) // chỉ ngưỡng 2 có sent channel
      expect(orderSlaHistoryCreateMock).toHaveBeenCalledTimes(1) // chỉ write 1 row mới
    })

    it('count unsupported channels = failed attempts không "recent fire, skip"', async () => {
      orderFindManyMock.mockResolvedValueOnce([baseOrder])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      escalateBreachMock
        .mockResolvedValueOnce([
          { level: 1, channel: 'email', recipientId: null, recipientTarget: 'a@b.vn', ok: true, isLoud: false, attemptNumber: 1 },
        ])
        .mockResolvedValueOnce([
          { level: 2, channel: 'email', recipientId: null, recipientTarget: 'a@b.vn', ok: true, isLoud: false, attemptNumber: 1 },
          { level: 2, channel: 'telegram', recipientId: null, recipientTarget: 'tg-1', ok: false, error: 'provider fail', isLoud: false, attemptNumber: 1 },
          { level: 2, channel: 'zalo', recipientId: null, recipientTarget: '', ok: false, error: 'channel not configured for recipient', isLoud: false, attemptNumber: 1 },
        ])

      const result = await runSlaScan()
      expect(result.scanned).toBe(1)
      expect(result.breached).toBe(2)
      expect(result.enqueued).toBe(2)
      // Cả telegram fail + zalo fail đều counted vào unsupportedChannels (failedCount = 2)
      expect(result.unsupportedChannels).toBe(2)
    })

    it('set slaDeadline khi có autoCancelAtMinutes', async () => {
      orderFindManyMock.mockResolvedValueOnce([baseOrder])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      escalateBreachMock.mockResolvedValue([
        { level: 1, channel: 'email', recipientId: null, recipientTarget: 'a@b.vn', ok: true, isLoud: false, attemptNumber: 1 },
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
      escalateBreachMock.mockResolvedValue([
        { level: 1, channel: 'email', recipientId: null, recipientTarget: 'a@b.vn', ok: true, isLoud: false, attemptNumber: 1 },
      ])

      await runSlaScan()
      expect(orderUpdateMock).not.toHaveBeenCalled()
    })

    it('count error khi escalateBreach throw', async () => {
      orderFindManyMock.mockResolvedValueOnce([baseOrder])
      slaConfigFindFirstMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(globalConfig)
      escalateBreachMock.mockRejectedValueOnce(new Error('escalation boom'))

      const result = await runSlaScan()
      expect(result.errors).toBe(1)
      expect(result.scanned).toBe(1)
    })
  })
})
