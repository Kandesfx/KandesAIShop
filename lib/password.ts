import argon2 from 'argon2'
import { PASSWORD_REGEX } from './password-constants'

/**
 * Password hashing với argon2id — recommended từ OWASP.
 *
 * Args:
 *   memoryCost: 19 MiB (default OWASP 2023)
 *   timeCost: 2 iterations
 *   parallelism: 1
 *
 * Validate theo BR-4.2: tối thiểu 8 ký tự, có chữ + số.
 *
 * Round-trip test: hash() → verify() phải OK.
 */

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const

export class PasswordValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PasswordValidationError'
  }
}

/** Validate password theo BR-4.2. Throw nếu không đạt. */
export function validatePassword(plain: string): void {
  if (!plain || plain.length < 8) {
    throw new PasswordValidationError('Mật khẩu phải tối thiểu 8 ký tự')
  }
  if (!PASSWORD_REGEX.test(plain)) {
    throw new PasswordValidationError('Mật khẩu phải có chữ và số')
  }
}

export async function hashPassword(plain: string): Promise<string> {
  validatePassword(plain)
  return argon2.hash(plain, HASH_OPTIONS)
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}
