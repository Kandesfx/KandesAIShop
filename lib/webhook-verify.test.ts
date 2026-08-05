import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import {
  verifyHmacSignature,
  extractSignature,
  isWebhookConfigured,
  readRawBody,
} from '@/lib/webhook-verify'

describe('webhook-verify', () => {
  const secret = 'test-webhook-secret-1234567890'

  function sign(rawBody: string): string {
    return crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  }

  it('verify OK với signature đúng', () => {
    const body = JSON.stringify({ id: 1, amount: 1000 })
    const sig = sign(body)
    expect(() =>
      verifyHmacSignature({
        rawBody: body,
        signature: sig,
        secret,
      })
    ).not.toThrow()
  })

  it('reject signature sai', () => {
    const body = JSON.stringify({ id: 1 })
    expect(() =>
      verifyHmacSignature({
        rawBody: body,
        signature: 'a'.repeat(64),
        secret,
      })
    ).toThrow(/Chữ ký không hợp lệ/)
  })

  it('reject thiếu signature', () => {
    expect(() =>
      verifyHmacSignature({
        rawBody: '{}',
        signature: null,
        secret,
      })
    ).toThrow(/Thiếu signature/)
  })

  it('reject body bị tamper (signature khác body)', () => {
    const body = JSON.stringify({ amount: 1000 })
    const sig = sign(body)
    const tamperedBody = JSON.stringify({ amount: 9999 })
    expect(() =>
      verifyHmacSignature({
        rawBody: tamperedBody,
        signature: sig,
        secret,
      })
    ).toThrow(/Chữ ký không hợp lệ/)
  })

  it('reject length mismatch (kể cả cùng prefix)', () => {
    expect(() =>
      verifyHmacSignature({
        rawBody: '{}',
        signature: 'abc',
        secret,
      })
    ).toThrow(/Chữ ký không hợp lệ/)
  })

  it('base64 encoding OK', () => {
    const body = 'hello'
    const sig = crypto.createHmac('sha256', secret).update(body).digest('base64')
    expect(() =>
      verifyHmacSignature({
        rawBody: body,
        signature: sig,
        secret,
        signatureEncoding: 'base64',
      })
    ).not.toThrow()
  })

  it('sha512 algorithm OK', () => {
    const body = 'hello'
    const sig = crypto.createHmac('sha512', secret).update(body).digest('hex')
    expect(() =>
      verifyHmacSignature({
        rawBody: body,
        signature: sig,
        secret,
        algorithm: 'sha512',
      })
    ).not.toThrow()
  })

  it('extractSignature — strip prefix "sha256="', () => {
    expect(extractSignature('sha256=abcdef')).toBe('abcdef')
  })

  it('extractSignature — no prefix returns as-is', () => {
    expect(extractSignature('abcdef')).toBe('abcdef')
  })

  it('extractSignature — null/undefined → null', () => {
    expect(extractSignature(null)).toBeNull()
    expect(extractSignature(undefined)).toBeNull()
    expect(extractSignature('')).toBeNull()
  })

  it('isWebhookConfigured — true nếu secret >= 16 chars', () => {
    expect(isWebhookConfigured('1234567890123456')).toBe(true)
    expect(isWebhookConfigured('short')).toBe(false)
    expect(isWebhookConfigured(undefined)).toBe(false)
  })

  it('readRawBody — trả string', async () => {
    // Mock global fetch (vitest env=node không có sẵn)
    const body = '{"a":1}'
    const req = {
      text: async () => body,
    } as Pick<Request, 'text'>
    const result = await readRawBody(req as unknown as Request)
    expect(result).toBe(body)
  })
})
