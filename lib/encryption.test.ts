import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, fingerprint } from '@/lib/encryption'

describe('encryption (AES-256-GCM)', () => {
  // ENCRYPTION_KEY trong .env phải đúng 64 hex chars
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  process.env.SESSION_SECRET = 'x'.repeat(32)

  it('round-trip plaintext → ciphertext → plaintext', async () => {
    const { env } = await import('@/lib/env')
    expect(env.ENCRYPTION_KEY.length).toBe(64)

    const original = 'sk-cursor-pro-abc123-very-secret'
    const ciphertext = encrypt(original)
    const back = decrypt(ciphertext)
    expect(back).toBe(original)
  })

  it('ciphertext không trùng nhau giữa 2 lần encrypt cùng plaintext', () => {
    const a = encrypt('same-value')
    const b = encrypt('same-value')
    expect(Buffer.compare(a, b)).not.toBe(0)
  })

  it('fingerprint là hex 16 chars ổn định', () => {
    const fp1 = fingerprint('key-abc-123')
    const fp2 = fingerprint('key-abc-123')
    const fp3 = fingerprint('key-abc-124')
    expect(fp1).toBe(fp2)
    expect(fp1).not.toBe(fp3)
    expect(fp1).toMatch(/^[a-f0-9]{16}$/)
  })
})
