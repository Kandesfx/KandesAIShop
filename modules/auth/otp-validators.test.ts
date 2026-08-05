import { describe, it, expect } from 'vitest'
import { requestOtpSchema, verifyOtpSchema } from '@/modules/auth/otp-validators'

describe('auth/otp validators', () => {
  describe('requestOtpSchema', () => {
    it('OK email + login', () => {
      expect(
        requestOtpSchema.safeParse({
          contactType: 'email',
          contactValue: 'a@b.com',
          purpose: 'login',
        }).success
      ).toBe(true)
    })
    it('OK phone + verify', () => {
      expect(
        requestOtpSchema.safeParse({
          contactType: 'phone',
          contactValue: '0912345678',
          purpose: 'verify',
        }).success
      ).toBe(true)
    })
    it('Reject contactType sai', () => {
      expect(
        requestOtpSchema.safeParse({
          contactType: 'telegram',
          contactValue: 'x',
          purpose: 'login',
        }).success
      ).toBe(false)
    })
    it('Reject purpose sai', () => {
      expect(
        requestOtpSchema.safeParse({
          contactType: 'email',
          contactValue: 'a@b.com',
          purpose: 'evil',
        }).success
      ).toBe(false)
    })
  })

  describe('verifyOtpSchema', () => {
    it('OK 6 số', () => {
      expect(
        verifyOtpSchema.safeParse({
          contactType: 'email',
          contactValue: 'a@b.com',
          code: '123456',
          purpose: 'login',
        }).success
      ).toBe(true)
    })
    it('Reject code 5 số', () => {
      expect(
        verifyOtpSchema.safeParse({
          contactType: 'email',
          contactValue: 'a@b.com',
          code: '12345',
          purpose: 'login',
        }).success
      ).toBe(false)
    })
    it('Reject code có chữ', () => {
      expect(
        verifyOtpSchema.safeParse({
          contactType: 'email',
          contactValue: 'a@b.com',
          code: '12345a',
          purpose: 'login',
        }).success
      ).toBe(false)
    })
  })
})
