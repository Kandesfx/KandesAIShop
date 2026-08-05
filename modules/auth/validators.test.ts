import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@/modules/auth/validators'

describe('auth/validators', () => {
  describe('registerSchema', () => {
    it('OK với input hợp lệ', () => {
      const r = registerSchema.safeParse({
        email: 'Test@Example.com',
        password: 'Password1',
        name: '  Nguyễn Văn A  ',
      })
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.email).toBe('test@example.com') // lowercased
        expect(r.data.name).toBe('Nguyễn Văn A') // trimmed
      }
    })

    it('Reject password không có số', () => {
      const r = registerSchema.safeParse({
        email: 'a@b.com',
        password: 'NoDigitsHere',
        name: 'Tên',
      })
      expect(r.success).toBe(false)
    })

    it('Reject password quá ngắn', () => {
      const r = registerSchema.safeParse({
        email: 'a@b.com',
        password: 'Ab1',
        name: 'Tên',
      })
      expect(r.success).toBe(false)
    })

    it('Reject email không hợp lệ', () => {
      const r = registerSchema.safeParse({
        email: 'not-email',
        password: 'Password1',
        name: 'Tên',
      })
      expect(r.success).toBe(false)
    })

    it('Reject name quá ngắn', () => {
      const r = registerSchema.safeParse({
        email: 'a@b.com',
        password: 'Password1',
        name: 'A',
      })
      expect(r.success).toBe(false)
    })
  })

  describe('loginSchema', () => {
    it('OK', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
    })
    it('Reject password rỗng', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
    })
  })

  describe('forgotPasswordSchema', () => {
    it('OK', () => {
      expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true)
    })
  })

  describe('resetPasswordSchema', () => {
    it('OK', () => {
      expect(
        resetPasswordSchema.safeParse({ token: 'long-enough-token', password: 'NewPass1' }).success
      ).toBe(true)
    })
    it('Reject token quá ngắn', () => {
      expect(resetPasswordSchema.safeParse({ token: 'short', password: 'NewPass1' }).success).toBe(
        false
      )
    })
    it('Reject extra field (strict)', () => {
      const r = resetPasswordSchema.safeParse({
        token: 'long-enough-token',
        password: 'NewPass1',
        evil: true,
      })
      expect(r.success).toBe(false)
    })
  })
})
