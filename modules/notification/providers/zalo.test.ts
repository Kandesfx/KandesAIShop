import { describe, it, expect, beforeEach, vi } from 'vitest'

const envMock = vi.hoisted(() => ({
  ZALO_OA_ACCESS_TOKEN: undefined as string | undefined,
  ZALO_OA_SECRET: undefined as string | undefined,
}))

vi.mock('@/lib/env', () => ({ env: envMock }))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import {
  sendZaloMessage,
  getZaloOAInfo,
  _setZaloProvider,
  computeZaloHmac,
} from './zalo'

beforeEach(() => {
  envMock.ZALO_OA_ACCESS_TOKEN = undefined
  envMock.ZALO_OA_SECRET = undefined
  fetchMock.mockReset()
  _setZaloProvider(null)
})

describe('zalo provider — P5-02', () => {
  describe('sendZaloMessage', () => {
    it('throw nếu thiếu access token', async () => {
      await expect(sendZaloMessage({ userId: 'u1', text: 'hi' })).rejects.toThrow(
        'ZALO_OA_ACCESS_TOKEN chưa config'
      )
    })

    it('POST message/cs với access_token header', async () => {
      envMock.ZALO_OA_ACCESS_TOKEN = 'tok-123'
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 0 }),
      })

      await sendZaloMessage({ userId: 'u1', subject: 'Test', text: 'hello' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://openapi.zalo.me/v2.0/oa/message/cs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            access_token: 'tok-123',
          }),
          body: JSON.stringify({
            recipient: { user_id: 'u1' },
            message: { text: '*Test*\n\nhello' },
          }),
        })
      )
    })

    it('không prefix subject nếu không truyền', async () => {
      envMock.ZALO_OA_ACCESS_TOKEN = 'tok-123'
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 0 }),
      })
      await sendZaloMessage({ userId: 'u1', text: 'just text' })
      const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
      expect(body.message.text).toBe('just text')
    })

    it('throw khi API trả 4xx', async () => {
      envMock.ZALO_OA_ACCESS_TOKEN = 'tok-123'
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: -201, message: 'invalid token' }),
      })
      await expect(sendZaloMessage({ userId: 'u1', text: 'x' })).rejects.toThrow(
        /invalid token|-201/
      )
    })

    it('throw khi Zalo trả error payload error != 0', async () => {
      envMock.ZALO_OA_ACCESS_TOKEN = 'tok-123'
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: -204, message: 'user not follow' }),
      })
      await expect(sendZaloMessage({ userId: 'u1', text: 'x' })).rejects.toThrow(
        'user not follow'
      )
    })

    it('throw khi fetch network fail', async () => {
      envMock.ZALO_OA_ACCESS_TOKEN = 'tok-123'
      fetchMock.mockRejectedValueOnce(new Error('connect timeout'))
      await expect(sendZaloMessage({ userId: 'u1', text: 'x' })).rejects.toThrow(
        'connect timeout'
      )
    })
  })

  describe('getZaloOAInfo', () => {
    it('throw nếu thiếu access token', async () => {
      await expect(getZaloOAInfo()).rejects.toThrow('ZALO_OA_ACCESS_TOKEN chưa config')
    })

    it('trả OA info khi OK', async () => {
      envMock.ZALO_OA_ACCESS_TOKEN = 'tok-123'
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 0,
          data: { oa_id: 'oa-1', name: 'Kandes', description: 'AI shop' },
        }),
      })
      const info = await getZaloOAInfo()
      expect(info.oaId).toBe('oa-1')
      expect(info.name).toBe('Kandes')
    })

    it('throw khi getoa trả error', async () => {
      envMock.ZALO_OA_ACCESS_TOKEN = 'tok-123'
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: -201, message: 'invalid token' }),
      })
      await expect(getZaloOAInfo()).rejects.toThrow('invalid token')
    })
  })

  describe('computeZaloHmac', () => {
    it('throw nếu thiếu secret', async () => {
      await expect(computeZaloHmac('body')).rejects.toThrow('ZALO_OA_SECRET chưa config')
    })

    it('tính HMAC-SHA256 đúng với secret', async () => {
      envMock.ZALO_OA_SECRET = 'my-secret'
      const h = await computeZaloHmac('hello-world')
      expect(h).toMatch(/^[0-9a-f]{64}$/)
    })
  })
})
