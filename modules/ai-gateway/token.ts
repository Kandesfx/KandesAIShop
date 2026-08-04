import crypto from 'crypto'

/**
 * AI Gateway token utilities — Phase 6.
 *
 * Tách hẳn ra file riêng để:
 *   - KHÔNG depend vào `@/lib/db` (test chạy pure).
 *   - Dùng chung cho AI_RESELLER delivery + User-self-service + Admin create.
 *
 * Token format: `ks-` + 16 chars base64url random.
 * Storage: SHA-256 hex digest + 12-char unique prefix.
 */

const KEY_PREFIX_LENGTH = 12
const TOKEN_MIN_LENGTH = 16

export type GeneratedToken = {
  /** Plaintext token (chỉ hiển thị 1 lần qua email/UI). */
  token: string
  /** Unique 12-char prefix, indexed cho fast lookup. */
  keyPrefix: string
  /** SHA-256 hex (64 chars). So sánh constant-time khi auth. */
  keyHash: string
}

/** Minimum length of token (excluding 'ks-'). */
export const API_KEY_MIN_LENGTH = TOKEN_MIN_LENGTH

/**
 * Generate 1 fresh `ks-xxx` token + storage fields.
 */
export function generateApiToken(): GeneratedToken {
  const random = crypto.randomBytes(12).toString('base64url').slice(0, 16)
  const token = `ks-${random}`
  const keyPrefix = token.slice(0, KEY_PREFIX_LENGTH)
  const keyHash = sha256(token)
  return { token, keyPrefix, keyHash }
}

/** SHA-256 hex digest. */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/** Constant-time string compare. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}