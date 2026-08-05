import { z } from 'zod'
import { PASSWORD_REGEX } from '../../lib/password-constants'

/**
 * Validators cho auth flow — Phase 2.
 *
 * Theo MASTER_SPEC §4.5 + BR-4.2:
 *   - Email chuẩn RFC, normalize lowercase
 *   - Password tối thiểu 8 ký tự, có chữ + số
 *   - Tên: tối thiểu 2 ký tự, không chỉ whitespace
 */

const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .regex(PASSWORD_REGEX, 'Mật khẩu phải có chữ và số')

const emailSchema = z.string().trim().toLowerCase().email('Email không hợp lệ')

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự').max(120),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, 'Token không hợp lệ'),
    password: passwordSchema,
  })
  .strict()
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
