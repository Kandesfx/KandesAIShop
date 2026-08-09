import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Test module/checkout/turnstile.ts — Phase 9 C7.
 *
 * Mock env như qr.test.ts (module-level import, cần mock trước import).
 */

describe('checkout/turnstile — đã config secret', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('@/lib/env', () => ({
      env: { TURNSTILE_SECRET_KEY: 'test-secret-key' },
    }))
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    }))
  })

  afterEach(() => {
    vi.doUnmock('@/lib/env')
    vi.doUnmock('@/lib/logger')
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('isTurnstileConfigured trả true khi có secret key', async () => {
    const { isTurnstileConfigured } = await import('./turnstile')
    expect(isTurnstileConfigured()).toBe(true)
  })

  it('verifyTurnstileToken trả success=true khi Cloudflare trả success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { verifyTurnstileToken } = await import('./turnstile')
    const result = await verifyTurnstileToken('good-token', '1.2.3.4')

    expect(result.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' })
    )
    const body = fetchMock.mock.calls[0]![1].body as URLSearchParams
    expect(body.get('secret')).toBe('test-secret-key')
    expect(body.get('response')).toBe('good-token')
    expect(body.get('remoteip')).toBe('1.2.3.4')
  })

  it('verifyTurnstileToken trả success=false + errorCodes khi token invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
      })
    )

    const { verifyTurnstileToken } = await import('./turnstile')
    const result = await verifyTurnstileToken('bad-token')

    expect(result.success).toBe(false)
    expect(result.errorCodes).toEqual(['invalid-input-response'])
  })

  it('verifyTurnstileToken throw khi siteverify trả non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    const { verifyTurnstileToken } = await import('./turnstile')
    await expect(verifyTurnstileToken('token')).rejects.toThrow(/HTTP 500/)
  })

  it('verifyTurnstileToken throw khi network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')))

    const { verifyTurnstileToken } = await import('./turnstile')
    await expect(verifyTurnstileToken('token')).rejects.toThrow(/network error/)
  })
})

describe('checkout/turnstile — chưa config secret', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('@/lib/env', () => ({
      env: { TURNSTILE_SECRET_KEY: undefined },
    }))
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    }))
  })

  afterEach(() => {
    vi.doUnmock('@/lib/env')
    vi.doUnmock('@/lib/logger')
    vi.resetModules()
  })

  it('isTurnstileConfigured trả false', async () => {
    const { isTurnstileConfigured } = await import('./turnstile')
    expect(isTurnstileConfigured()).toBe(false)
  })

  it('verifyTurnstileToken throw khi thiếu secret key', async () => {
    const { verifyTurnstileToken } = await import('./turnstile')
    await expect(verifyTurnstileToken('token')).rejects.toThrow(/chưa config/)
  })
})
