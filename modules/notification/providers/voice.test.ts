import { describe, it, expect, beforeEach, vi } from 'vitest'

const envMock = vi.hoisted(() => ({
  TWILIO_ACCOUNT_SID: undefined as string | undefined,
  TWILIO_AUTH_TOKEN: undefined as string | undefined,
  TWILIO_VOICE_FROM_NUMBER: undefined as string | undefined,
  PUBLIC_BASE_URL: undefined as string | undefined,
}))

vi.mock('@/lib/env', () => ({ env: envMock }))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { sendVoiceCall, _setVoiceProvider } from './voice'

beforeEach(() => {
  envMock.TWILIO_ACCOUNT_SID = undefined
  envMock.TWILIO_AUTH_TOKEN = undefined
  envMock.TWILIO_VOICE_FROM_NUMBER = undefined
  envMock.PUBLIC_BASE_URL = undefined
  fetchMock.mockReset()
  _setVoiceProvider(null)
})

describe('voice provider — P5-04', () => {
  describe('sendVoiceCall', () => {
    it('throw nếu thiếu SID/Auth/From', async () => {
      await expect(
        sendVoiceCall({ to: '+84123456789', text: 'hi' })
      ).rejects.toThrow(/Twilio voice config chưa đầy đủ/)
    })

    it('throw nếu thiếu PUBLIC_BASE_URL', async () => {
      envMock.TWILIO_ACCOUNT_SID = 'AC1'
      envMock.TWILIO_AUTH_TOKEN = 't'
      envMock.TWILIO_VOICE_FROM_NUMBER = '+15005550006'
      await expect(
        sendVoiceCall({ to: '+84123456789', text: 'hi' })
      ).rejects.toThrow(/PUBLIC_BASE_URL/)
    })

    it('POST Calls.json với Url callback', async () => {
      envMock.TWILIO_ACCOUNT_SID = 'AC1'
      envMock.TWILIO_AUTH_TOKEN = 't-secret'
      envMock.TWILIO_VOICE_FROM_NUMBER = '+15005550006'
      envMock.PUBLIC_BASE_URL = 'https://kandes.shop'
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ sid: 'CA1' }) })

      await sendVoiceCall({ to: '+84123456789', subject: 'Alert', text: 'hello' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.twilio.com/2010-04-01/Accounts/AC1/Calls.json',
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
      expect(params.get('Url')).toContain('https://kandes.shop/api/voice/respond?msg=')
      expect(decodeURIComponent(params.get('Url') ?? '')).toContain('Alert: hello')
    })

    it('URL encode message trong TwiML callback', async () => {
      envMock.TWILIO_ACCOUNT_SID = 'AC1'
      envMock.TWILIO_AUTH_TOKEN = 't'
      envMock.TWILIO_VOICE_FROM_NUMBER = '+15005550006'
      envMock.PUBLIC_BASE_URL = 'https://kandes.shop'
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      await sendVoiceCall({ to: '+84123456789', text: 'SLA L1 đơn KDS 001' })
      const body = fetchMock.mock.calls[0]?.[1]?.body as string
      const params = new URLSearchParams(body)
      const decodedUrl = decodeURIComponent(params.get('Url') ?? '')
      expect(decodedUrl).toContain('SLA L1 đơn KDS 001')
    })

    it('throw khi Twilio trả 4xx', async () => {
      envMock.TWILIO_ACCOUNT_SID = 'AC1'
      envMock.TWILIO_AUTH_TOKEN = 't'
      envMock.TWILIO_VOICE_FROM_NUMBER = '+15005550006'
      envMock.PUBLIC_BASE_URL = 'https://kandes.shop'
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: 21211, message: 'invalid to' }),
      })
      await expect(
        sendVoiceCall({ to: '+84123456789', text: 'x' })
      ).rejects.toThrow(/invalid to/)
    })

    it('throw khi fetch network fail', async () => {
      envMock.TWILIO_ACCOUNT_SID = 'AC1'
      envMock.TWILIO_AUTH_TOKEN = 't'
      envMock.TWILIO_VOICE_FROM_NUMBER = '+15005550006'
      envMock.PUBLIC_BASE_URL = 'https://kandes.shop'
      fetchMock.mockRejectedValueOnce(new Error('connect timeout'))
      await expect(
        sendVoiceCall({ to: '+84123456789', text: 'x' })
      ).rejects.toThrow('connect timeout')
    })
  })
})
