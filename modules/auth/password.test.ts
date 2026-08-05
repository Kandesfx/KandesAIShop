import { describe, it, expect } from 'vitest'
import { __test } from '@/modules/auth/password'

describe('auth/password token hashing', () => {
  it('generateToken trả token + hash khác nhau', () => {
    const { token, hash } = __test.generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/) // base64url
    expect(hash).toMatch(/^[a-f0-9]{64}$/) // sha256 hex
    expect(token).not.toBe(hash)
  })

  it('hashToken deterministic — cùng token cho cùng hash', () => {
    const { token } = __test.generateToken()
    const h1 = __test.hashToken(token)
    const h2 = __test.hashToken(token)
    expect(h1).toBe(h2)
  })

  it('hashToken khác nhau cho 2 token khác nhau', () => {
    const { token: t1 } = __test.generateToken()
    const { token: t2 } = __test.generateToken()
    expect(__test.hashToken(t1)).not.toBe(__test.hashToken(t2))
  })
})
