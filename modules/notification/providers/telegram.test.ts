import { describe, it, expect, beforeEach, vi } from 'vitest'

const envMock = vi.hoisted(() => ({
  TELEGRAM_BOT_TOKEN: undefined as string | undefined,
}))

vi.mock('@/lib/env', () => ({
  env: envMock,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { sendTelegramMessage, getTelegramBotInfo, _setTelegramProvider } from './telegram'

beforeEach(() => {
  envMock.TELEGRAM_BOT_TOKEN = undefined
  fetchMock.mockReset()
  _setTelegramProvider(null)
})

describe('telegram provider — P5-01', () => {
  describe('sendTelegramMessage', () => {
    it('throw nếu thiếu bot token', async () => {
      await expect(sendTelegramMessage({ chatId: '123', text: 'hi' })).rejects.toThrow(
        'TELEGRAM_BOT_TOKEN chưa config'
      )
    })

    it('POST sendMessage với parse_mode Markdown', async () => {
      envMock.TELEGRAM_BOT_TOKEN = '123:abc'
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

      await sendTelegramMessage({ chatId: '456', subject: 'Test', text: 'hello' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.telegram.org/bot123:abc/sendMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '456',
            text: '*Test*\n\nhello',
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          }),
        })
      )
    })

    it('không prefix subject nếu không truyền', async () => {
      envMock.TELEGRAM_BOT_TOKEN = '123:abc'
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      await sendTelegramMessage({ chatId: '456', text: 'just text' })
      const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
      expect(body.text).toBe('just text')
    })

    it('throw khi Telegram API trả 4xx', async () => {
      envMock.TELEGRAM_BOT_TOKEN = '123:abc'
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ description: 'chat not found' }),
      })
      await expect(sendTelegramMessage({ chatId: 'invalid', text: 'x' })).rejects.toThrow(
        'chat not found'
      )
    })

    it('throw khi fetch network fail', async () => {
      envMock.TELEGRAM_BOT_TOKEN = '123:abc'
      fetchMock.mockRejectedValueOnce(new Error('connect timeout'))
      await expect(sendTelegramMessage({ chatId: '456', text: 'x' })).rejects.toThrow(
        'connect timeout'
      )
    })
  })

  describe('getTelegramBotInfo', () => {
    it('throw nếu thiếu bot token', async () => {
      await expect(getTelegramBotInfo()).rejects.toThrow('TELEGRAM_BOT_TOKEN chưa config')
    })

    it('trả bot info khi getMe OK', async () => {
      envMock.TELEGRAM_BOT_TOKEN = '123:abc'
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          result: {
            id: 123456,
            username: 'kandes_bot',
            first_name: 'Kandes',
            is_bot: true,
          },
        }),
      })
      const info = await getTelegramBotInfo()
      expect(info.username).toBe('kandes_bot')
      expect(info.isBot).toBe(true)
    })

    it('throw khi getMe trả ok=false', async () => {
      envMock.TELEGRAM_BOT_TOKEN = '123:abc'
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, description: 'invalid token' }),
      })
      await expect(getTelegramBotInfo()).rejects.toThrow('invalid token')
    })
  })
})
