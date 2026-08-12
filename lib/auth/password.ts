/**
 * Password utilities re-exported for @/lib/auth/password compatibility.
 * Primary implementation is in lib/password.ts (uses argon2id).
 */

export {
  hashPassword,
  verifyPassword,
  validatePassword,
  PasswordValidationError,
} from '../password'
