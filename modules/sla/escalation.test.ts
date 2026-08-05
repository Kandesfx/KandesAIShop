import { describe, it, expect, beforeEach, vi } from 'vitest'

const envMock = vi.hoisted(() => ({
  TELEGRAM_ADMIN_CHAT_ID: undefined as string | undefined,
}))

const orderFindUniqueMock = vi.fn()
const userFindUniqueMock = vi.fn()
const notifyMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    order: {
      findUnique: (...args: unknown[]) => orderFindUniqueMock(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
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
  orderFindUniqueMock.mockReset()
  userFindUniqueMock.mockReset()
  notifyMock.mockReset()
  notifyMock.mockResolvedValue({ notificationId: 'n-1' })
})

describe('sla escalation — P5-06', () => {
  describe('escalateBreach', () => {
    it('email channel → enqueue notification', async () => {
      orderFindUniqueMock.mockResolvedValueOnce({ userId: 'u1', guestEmail: null })
      userFindUniqueMock.mockResolvedValueOnce({ email: 'a@b.vn' })

      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 1,
        minutesOver: 45,
        channels: ['email'],
      })

      expect(attempts).toHaveLength(1)
      expect(attempts[0]?.ok).toBe(true)
      expect(notifyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'sla.breach',
          channel: 'email',
          recipient: { email: 'a@b.vn' },
        })
      )
    })

    it('telegram channel → dùng TELEGRAM_ADMIN_CHAT_ID env', async () => {
      envMock.TELEGRAM_ADMIN_CHAT_ID = '999'

      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 1,
        minutesOver: 45,
        channels: ['telegram'],
      })

      expect(attempts).toHaveLength(1)
      expect(attempts[0]?.ok).toBe(true)
      expect(notifyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'telegram',
          recipient: { email: '999', telegramChatId: '999' },
        })
      )
    })

    it('telegram channel + thiếu env → skip (no recipient)', async () => {
      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 1,
        minutesOver: 45,
        channels: ['telegram'],
      })
      expect(attempts[0]?.ok).toBe(false)
      expect(attempts[0]?.error).toBe('no recipient')
      expect(notifyMock).not.toHaveBeenCalled()
    })

    it('multi-channel: cả email + telegram success', async () => {
      envMock.TELEGRAM_ADMIN_CHAT_ID = 'tg-1'
      orderFindUniqueMock.mockResolvedValueOnce({ userId: 'u1', guestEmail: null })
      userFindUniqueMock.mockResolvedValueOnce({ email: 'a@b.vn' })

      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 1,
        minutesOver: 30,
        channels: ['email', 'telegram'],
      })

      expect(attempts).toHaveLength(2)
      expect(attempts.every((a) => a.ok)).toBe(true)
      expect(notifyMock).toHaveBeenCalledTimes(2)
    })

    it('zalo channel → log warn + return fail (no recipient)', async () => {
      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 2,
        minutesOver: 60,
        channels: ['zalo'],
      })
      expect(attempts[0]?.ok).toBe(false)
      expect(attempts[0]?.channel).toBe('zalo')
      expect(notifyMock).not.toHaveBeenCalled()
    })

    it('guest order → dùng guestEmail', async () => {
      orderFindUniqueMock.mockResolvedValueOnce({ userId: null, guestEmail: 'guest@bk.vn' })

      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 1,
        minutesOver: 30,
        channels: ['email'],
      })

      expect(attempts).toHaveLength(1)
      expect(attempts[0]?.ok).toBe(true)
      expect(notifyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: { email: 'guest@bk.vn' },
        })
      )
    })

    it('order không tồn tại → fail', async () => {
      orderFindUniqueMock.mockResolvedValueOnce(null)
      const attempts = await slaEscalation.escalateBreach({
        orderId: 'missing',
        orderNumber: 'KDS-001',
        level: 1,
        minutesOver: 30,
        channels: ['email'],
      })
      expect(attempts[0]?.ok).toBe(false)
    })

    it('notify throw → catch + return fail attempt', async () => {
      envMock.TELEGRAM_ADMIN_CHAT_ID = 'tg-1'
      notifyMock.mockRejectedValueOnce(new Error('enqueue failed'))

      const attempts = await slaEscalation.escalateBreach({
        orderId: 'o1',
        orderNumber: 'KDS-001',
        level: 1,
        minutesOver: 30,
        channels: ['telegram'],
      })
      expect(attempts[0]?.ok).toBe(false)
      expect(attempts[0]?.error).toBe('enqueue failed')
    })
  })
})
