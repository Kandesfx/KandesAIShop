import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * P10 B3 — escalation test cho multi-recipient + loud mode.
 *
 * Mock shape: db.notificationRecipient, db.orderSlaEscalationLog là các model
 * mới của Phase 10. Backward-compat với env fallback cũng được cover.
 */

const envMock = vi.hoisted(() => ({
  TELEGRAM_ADMIN_CHAT_ID: undefined as string | undefined,
  ZALO_OA_ADMIN_USER_ID: undefined as string | undefined,
  TWILIO_FROM_NUMBER: undefined as string | undefined,
  TWILIO_ACCOUNT_SID: undefined as string | undefined,
  TWILIO_AUTH_TOKEN: undefined as string | undefined,
}))

const recipientFindManyMock = vi.fn()
const escalationLogFindFirstMock = vi.fn()
const escalationLogCreateMock = vi.fn()
const notifyMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    notificationRecipient: {
      findMany: (...args: unknown[]) => recipientFindManyMock(...args),
    },
    orderSlaEscalationLog: {
      findFirst: (...args: unknown[]) => escalationLogFindFirstMock(...args),
      create: (...args: unknown[]) => escalationLogCreateMock(...args),
    },
  },
}))

vi.mock('@/lib/env', () => ({ env: envMock }))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/modules/notification', () => ({
  notificationService: {
    notify: (...args: unknown[]) => notifyMock(...args),
  },
}))

const { slaEscalation } = await import('./escalation')

beforeEach(() => {
  envMock.TELEGRAM_ADMIN_CHAT_ID = undefined
  envMock.ZALO_OA_ADMIN_USER_ID = undefined
  envMock.TWILIO_FROM_NUMBER = undefined
  envMock.TWILIO_ACCOUNT_SID = undefined
  envMock.TWILIO_AUTH_TOKEN = undefined
  recipientFindManyMock.mockReset()
  escalationLogFindFirstMock.mockReset()
  escalationLogCreateMock.mockReset()
  notifyMock.mockReset()
  escalationLogFindFirstMock.mockResolvedValue(null) // default: không có recent log
  notifyMock.mockResolvedValue({ notificationId: 'n-1' })
})

describe('sla escalation — P10 multi-recipient + loud mode', () => {
  describe('escalateBreach', () => {
    it('no recipients → return empty + log warn', async () => {
      recipientFindManyMock.mockResolvedValueOnce([])
      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 1,
        minutesOver: 45,
        channels: ['email'],
      })
      expect(attempts).toHaveLength(0)
      expect(notifyMock).not.toHaveBeenCalled()
    })

    it('1 recipient × email channel → 1 attempt, enqueue', async () => {
      recipientFindManyMock.mockResolvedValueOnce([
        {
          id: 'r-1',
          userId: null,
          label: 'Hai on-call',
          channels: { email: { to: 'admin@kandes.shop' } },
          isOnCall: true,
          isActive: true,
          priority: 1,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
        },
      ])

      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 1,
        minutesOver: 45,
        channels: ['email'],
      })
      expect(attempts).toHaveLength(1)
      expect(attempts[0]?.ok).toBe(true)
      expect(attempts[0]?.recipientTarget).toBe('admin@kandes.shop')
      expect(notifyMock).toHaveBeenCalledTimes(1)
      expect(escalationLogCreateMock).toHaveBeenCalledTimes(1)
    })

    it('recipient thiếu channel config → attempt ok=false, skip enqueue', async () => {
      recipientFindManyMock.mockResolvedValueOnce([
        {
          id: 'r-1',
          userId: null,
          label: 'Only-email',
          channels: { email: { to: 'admin@kandes.shop' } },
          isOnCall: true,
          isActive: true,
          priority: 1,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
        },
      ])

      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 1,
        minutesOver: 45,
        channels: ['voice'],
      })
      expect(attempts).toHaveLength(1)
      expect(attempts[0]?.ok).toBe(false)
      expect(attempts[0]?.error).toBe('channel not configured for recipient')
      expect(notifyMock).not.toHaveBeenCalled()
    })

    it('recent fire (15m) → skip enqueue + mark "recent fire, skip"', async () => {
      recipientFindManyMock.mockResolvedValueOnce([
        {
          id: 'r-1',
          userId: null,
          label: 'Hai',
          channels: { telegram: { chatId: '999' } },
          isOnCall: true,
          isActive: true,
          priority: 1,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
        },
      ])
      escalationLogFindFirstMock.mockResolvedValueOnce({ id: 'log-1' })

      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 3,
        minutesOver: 150,
        channels: ['telegram'],
        isLoud: true,
      })
      expect(attempts).toHaveLength(1)
      expect(attempts[0]?.ok).toBe(true)
      expect(attempts[0]?.error).toBe('recent fire, skip')
      expect(notifyMock).not.toHaveBeenCalled()
      expect(escalationLogCreateMock).not.toHaveBeenCalled()
    })

    it('notify throw → catch + return fail attempt + write log', async () => {
      recipientFindManyMock.mockResolvedValueOnce([
        {
          id: 'r-1',
          userId: null,
          label: 'Hai',
          channels: { telegram: { chatId: '999' } },
          isOnCall: true,
          isActive: true,
          priority: 1,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
        },
      ])
      notifyMock.mockRejectedValueOnce(new Error('enqueue failed'))

      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 3,
        minutesOver: 150,
        channels: ['telegram'],
        isLoud: true,
      })
      expect(attempts).toHaveLength(1)
      expect(attempts[0]?.ok).toBe(false)
      expect(attempts[0]?.error).toBe('enqueue failed')
      expect(escalationLogCreateMock).toHaveBeenCalledTimes(1)
    })

    it('multi-recipient × multi-channel → enqueue tất cả', async () => {
      recipientFindManyMock.mockResolvedValueOnce([
        {
          id: 'r-1',
          userId: null,
          label: 'Hai',
          channels: { email: { to: 'a@b.vn' }, telegram: { chatId: '111' } },
          isOnCall: true,
          isActive: true,
          priority: 1,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
        },
        {
          id: 'r-2',
          userId: null,
          label: 'Hung',
          channels: { voice: { phone: '+84987654321' } },
          isOnCall: true,
          isActive: true,
          priority: 2,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
        },
      ])

      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 3,
        minutesOver: 150,
        channels: ['email', 'telegram', 'voice'],
        isLoud: true,
      })
      // 2 recipients × (1 channel r-1 có email/telegram ok, voice missing) + (1 channel r-2 voice ok)
      // r-1: email ok, telegram ok, voice skip (no target) → 3 attempts
      // r-2: email skip, telegram skip, voice ok → 3 attempts
      expect(attempts).toHaveLength(6)
      const okCount = attempts.filter((a) => a.ok).length
      expect(okCount).toBe(3) // email + telegram + voice
    })
  })

  describe('shouldRepeatLoudEscalation', () => {
    it('order chưa paid quá 120p → repeat', async () => {
      const result = await slaEscalation.shouldRepeatLoudEscalation({
        status: 'paid',
        paidAt: new Date(Date.now() - 150 * 60 * 1000),
        createdAt: new Date(Date.now() - 200 * 60 * 1000),
      })
      expect(result.repeat).toBe(true)
      expect(result.level).toBe(3)
    })

    it('order delivered → không repeat', async () => {
      const result = await slaEscalation.shouldRepeatLoudEscalation({
        status: 'delivered',
        paidAt: new Date(Date.now() - 150 * 60 * 1000),
        createdAt: new Date(),
      })
      expect(result.repeat).toBe(false)
    })

    it('order paid mới chỉ 60p → không repeat', async () => {
      const result = await slaEscalation.shouldRepeatLoudEscalation({
        status: 'paid',
        paidAt: new Date(Date.now() - 60 * 60 * 1000),
        createdAt: new Date(),
      })
      expect(result.repeat).toBe(false)
    })
  })
})
