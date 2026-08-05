import { describe, it, expect } from 'vitest'
import { __test } from '@/modules/auth/session'

describe('auth/session JWT access', () => {
  it('signAccess → verifyAccess round-trip', async () => {
    const token = await __test.signAccess({ uid: 'user-1', sid: 'session-1', role: 'customer' })
    const decoded = await __test.verifyAccess(token)
    expect(decoded).toEqual({ uid: 'user-1', sid: 'session-1', role: 'customer' })
  })

  it('verifyAccess trả null với token sai', async () => {
    const decoded = await __test.verifyAccess('not-a-jwt')
    expect(decoded).toBeNull()
  })

  it('verifyAccess trả null với token sai signature', async () => {
    const token = await __test.signAccess({ uid: 'u', sid: 's', role: 'customer' })
    // Đổi 1 char ở signature
    const tampered = token.slice(0, -2) + (token.endsWith('A') ? 'B' : 'A')
    const decoded = await __test.verifyAccess(tampered)
    expect(decoded).toBeNull()
  })
})
