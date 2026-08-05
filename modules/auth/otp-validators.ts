import { z } from 'zod'

export const requestOtpSchema = z.object({
  contactType: z.enum(['email', 'phone']),
  contactValue: z.string().min(3).max(120),
  purpose: z.enum(['login', 'register', 'verify', 'reset_password', 'reveal_key']),
})
export type RequestOtpInputT = z.infer<typeof requestOtpSchema>

export const verifyOtpSchema = z.object({
  contactType: z.enum(['email', 'phone']),
  contactValue: z.string().min(3).max(120),
  code: z.string().regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số'),
  purpose: z.enum(['login', 'register', 'verify', 'reset_password', 'reveal_key']),
})
export type VerifyOtpInputT = z.infer<typeof verifyOtpSchema>
