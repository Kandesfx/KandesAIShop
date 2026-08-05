import { describe, it, expect, beforeEach, vi } from 'vitest'

const userFindUniqueMock = vi.fn()
const userUpdateMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
      update: (...args: unknown[]) => userUpdateMock(...args),
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

const { accountNotificationsService, DEFAULT_PREFS } = await import('./service')
const { mergePrefs } = await import('./types')
const { updatePrefsSchema } = await import('./validators')

beforeEach(() => {
  userFindUniqueMock.mockReset()
  userUpdateMock.mockReset()
  loggerInfoMock.mockReset()
  loggerWarnMock.mockReset()
  loggerErrorMock.mockReset()
  userUpdateMock.mockResolvedValue({ id: 'u1' })
})

describe('account notifications — P5-07', () => {
  describe('mergePrefs', () => {
    it('null → DEFAULT_PREFS', () => {
      expect(mergePrefs(undefined)).toEqual(DEFAULT_PREFS)
      expect(mergePrefs(null)).toEqual(DEFAULT_PREFS)
    })

    it('partial merge channels + events', () => {
      const r = mergePrefs({
        channels: { email: true, telegram: true, zalo: false, sms: false },
        events: {
          'order.created': true,
          'order.paid': true,
          'order.delivered': true,
          'order.cancelled': true,
          'order.refunded': false,
        },
      })
      expect(r.channels.telegram).toBe(true)
      expect(r.events['order.refunded']).toBe(false)
      expect(r.events['order.paid']).toBe(true)
    })
  })

  describe('updatePrefsSchema', () => {
    it('accept empty body', () => {
      const r = updatePrefsSchema.safeParse({})
      expect(r.success).toBe(true)
    })

    it('accept partial channels + events', () => {
      const r = updatePrefsSchema.safeParse({
        channels: { telegram: true },
        events: { 'order.paid': false },
      })
      expect(r.success).toBe(true)
    })

    it('reject unknown keys', () => {
      const r = updatePrefsSchema.safeParse({
        channels: { unknownChannel: true },
      })
      expect(r.success).toBe(false)
    })
  })

  describe('getPrefs', () => {
    it('trả DEFAULT nếu user null prefs', async () => {
      userFindUniqueMock.mockResolvedValueOnce({ notificationPrefs: null })
      const r = await accountNotificationsService.getPrefs('u1')
      expect(r).toEqual(DEFAULT_PREFS)
    })

    it('merge stored partial prefs', async () => {
      userFindUniqueMock.mockResolvedValueOnce({
        notificationPrefs: { channels: { telegram: true } },
      })
      const r = await accountNotificationsService.getPrefs('u1')
      expect(r.channels.telegram).toBe(true)
      expect(r.channels.email).toBe(true)
    })
  })

  describe('updatePrefs', () => {
    it('shallow merge channels + write DB', async () => {
      userFindUniqueMock.mockResolvedValueOnce({ notificationPrefs: null })
      await accountNotificationsService.updatePrefs('u1', {
        channels: { telegram: true },
      })
      expect(userUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({
            notificationPrefs: expect.objectContaining({
              channels: expect.objectContaining({ telegram: true, email: true }),
            }),
          }),
        })
      )
    })
  })

  describe('bindTelegramChatId', () => {
    it('updates user with chat_id', async () => {
      await accountNotificationsService.bindTelegramChatId('u1', '123456')
      expect(userUpdateMock).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { telegramChatId: '123456' },
      })
    })
  })

  describe('bindZaloUserId', () => {
    it('updates user with zalo user_id', async () => {
      await accountNotificationsService.bindZaloUserId('u1', 'zalo-1')
      expect(userUpdateMock).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { zaloUserId: 'zalo-1' },
      })
    })
  })

  describe('findUserByTelegramChatId', () => {
    it('trả user khi match', async () => {
      userFindUniqueMock.mockResolvedValueOnce({ id: 'u1' })
      const r = await accountNotificationsService.findUserByTelegramChatId('123')
      expect(r?.id).toBe('u1')
    })

    it('trả null khi no match', async () => {
      userFindUniqueMock.mockResolvedValueOnce(null)
      const r = await accountNotificationsService.findUserByTelegramChatId('xxx')
      expect(r).toBeNull()
    })
  })
})
