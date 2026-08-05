import { describe, it, expect, beforeEach } from 'vitest'
import { createInMemoryRateLimiter, rateLimitOrThrow, rateLimitKey, _resetRateLimiter } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

describe('rate-limit in-memory', () => {
  let limiter: ReturnType<typeof createInMemoryRateLimiter>

  beforeEach(() => {
    limiter = createInMemoryRateLimiter()
    _resetRateLimiter()
  })

  it('cho phép đến khi đạt limit', async () => {
    const r1 = await limiter.consume('k', 3, 1000)
    const r2 = await limiter.consume('k', 3, 1000)
    const r3 = await limiter.consume('k', 3, 1000)
    const r4 = await limiter.consume('k', 3, 1000)
    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)
    expect(r4.success).toBe(false)
    expect(r4.remaining).toBe(0)
  })

  it('reset sau window', async () => {
    await limiter.consume('k', 1, 50)
    const blocked = await limiter.consume('k', 1, 50)
    expect(blocked.success).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 60))
    const ok = await limiter.consume('k', 1, 50)
    expect(ok.success).toBe(true)
  })

  it('các key khác nhau độc lập', async () => {
    await limiter.consume('a', 1, 1000)
    const rA = await limiter.consume('a', 1, 1000)
    const rB = await limiter.consume('b', 1, 1000)
    expect(rA.success).toBe(false)
    expect(rB.success).toBe(true)
  })

  it('rateLimitOrThrow throw RateLimitError khi vượt', async () => {
    await expect(rateLimitOrThrow('k', 1, 1000)).resolves.toBeUndefined()
    await expect(rateLimitOrThrow('k', 1, 1000)).rejects.toBeInstanceOf(RateLimitError)
  })

  it('rateLimitKey format', () => {
    expect(rateLimitKey('login', '1.2.3.4')).toBe('login:1.2.3.4:')
    expect(rateLimitKey('login', '1.2.3.4', 'extra')).toBe('login:1.2.3.4:extra')
    expect(rateLimitKey('login', undefined)).toBe('login:unknown:')
  })
})
