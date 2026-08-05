import { describe, it, expect, beforeEach, vi } from 'vitest'

const envMock = vi.hoisted(() => ({
  TWILIO_ACCOUNT_SID: undefined as string | undefined,
  TWILIO_AUTH_TOKEN: undefined as string | undefined,
  TWILIO_FROM_NUMBER: undefined as string | undefined,
}))

vi.mock('@/lib/env', () => ({ env: envMock }))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { sendSmsMessage, maskPhone, _setSmsProvider } from './sms'

beforeEach(() => {
  envMock.TWILIO_ACCOUNT_SID = undefined
  envMock.TWILIO_AUTH_TOKEN = undefined
  envMock.TWILIO_FROM_NUMBER = undefined
  fetchMock.mockReset()
  _setSmsProvider(null)
})

describe('sms provider — P5-03', () => {
  describe('sendSmsMessage', () => {
    it('throw nếu thiếu SID', async () => {
      envMock.TWILIO_AUTH_TOKEN = 't'
      envMock.TWILIO_FROM_NUMBER = '+15005550006'
      await expect(
        sendSmsMessage({ to: '+84123456789', text: 'hi' })
      ).rejects.toThrow('Twilio config chưa đầy đủ')
    })

    it('throw nếu phone không E.164', async () => {
      envMock.TWILIO_ACCOUNT_SID = 'AC1'
      envMock.TWILIO_AUTH_TOKEN = 't'
      envMock.TWILIO_FROM_NUMBER = '+15005550006'
      await expect(
        sendSmsMessage({ to: '0123456789', text: 'hi' })
      ).rejects.toThrow(/E\.164/)
    })

    it('POST Messages.json với Basic Auth + form-urlencoded', async () => {
      envMock.TWILIO_ACCOUNT_SID = 'AC1'
      envMock.TWILIO_AUTH_TOKEN = 't-secret'
      envMock.TWILIO_FROM_NUMBER = '+15005550006'
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ sid: 'SM1' }) })

      await sendSmsMessage({ to: '+84123456789', subject: 'Test', text: 'hello' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      )
      const body = fetchMock.mock.calls[0]?.[1]?.body as string
      const params = new URLSearchParams(body)
      expect(params.get('To')).toBe('+84123456789')
      expect(params.get('From')).toBe('+15005550006')
      expect(params.get('Body')).toBe('Test\nhello')
    })

    it('không prefix subject nếu không truyền', async () => {
      envMock.TWILIO_ACCOUNT_SID = 'AC1'
      envMock.TWILIO_AUTH_TOKEN = 't'
      envMock.TWILIO_FROM_NUMBER = '+15005550006'
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ sid: 'SM1' }) })

      await sendSmsMessage({ to: '+84123456789', text: 'just text' })
      const body = fetchMock.mock.calls[0]?.[1]?.body as string
      expect(new URLSearchParams(body).get('Body')).toBe('just text')
    })

    it('throw khi Twilio trả 4xx', async () => {
      envMock.TWILIO_ACCOUNT_SID = 'AC1'
      envMock.TWILIO_AUTH_TOKEN = 't'
      envMock.TWILIO_FROM_NUMBER = '+15005550006'
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: 21610, message: 'unsubscribed' }),
      })
      await expect(
        sendSmsMessage({ to: '+84123456789', text: 'x' })
      ).rejects.toThrow(/unsubscribed/)
    })

    it('throw khi fetch network fail', async () => {
      envMock.TWILIO_ACCOUNT_SID = 'AC1'
      envMock.TWILIO_AUTH_TOKEN = 't'
      envMock.TWILIO_FROM_NUMBER = '+15005550006'
      fetchMock.mockRejectedValueOnce(new Error('timeout'))
      await expect(
        sendSmsMessage({ to: '+84123456789', text: 'x' })
      ).rejects.toThrow('timeout')
    })
  })

  describe('maskPhone', () => {
    it('giữ 4 số cuối', () => {
      expect(maskPhone('+84123456789')).toBe('****6789')
    })

    it('trả **** nếu ngắn', () => {
      expect(maskPhone('+12')).toBe('****')
    })
  })
})
