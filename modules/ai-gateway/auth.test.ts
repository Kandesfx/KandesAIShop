import { describe, it, expect } from 'vitest'
import { generateApiToken, sha256, constantTimeEqual } from './token'

describe('generateApiToken (from token.ts)', () => {
  it('returns token starting with ks-', () => {
    const t = generateApiToken()
    expect(t.token.startsWith('ks-')).toBe(true)
  })

  it('returns unique tokens', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 100; i += 1) {
      tokens.add(generateApiToken().token)
    }
    expect(tokens.size).toBe(100)
  })

  it('keyPrefix is first 12 chars of token', () => {
    const t = generateApiToken()
    expect(t.keyPrefix).toBe(t.token.slice(0, 12))
  })

  it('keyHash is 64-char hex (SHA-256)', () => {
    const t = generateApiToken()
    expect(t.keyHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('keyHash differs from token (one-way)', () => {
    const t = generateApiToken()
    expect(t.keyHash).not.toContain(t.token)
  })

  it('sha256 is deterministic', () => {
    expect(sha256('hello')).toBe(sha256('hello'))
    expect(sha256('hello')).not.toBe(sha256('world'))
  })

  it('constantTimeEqual matches and rejects mismatch', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true)
    expect(constantTimeEqual('abc', 'abd')).toBe(false)
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
  })
})