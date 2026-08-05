import { createHash, randomBytes } from 'crypto'
import { db } from '../../lib/db'
import {
  hashPassword as libHashPassword,
  verifyPassword as libVerifyPassword,
} from '../../lib/password'

/**
 * Password helpers — Phase 2.
 *
 * Re-export từ lib/password.ts (Phase 1) + thêm forgot/reset token helpers.
 *
 * Reset token:
 *   - 32 bytes random, base64url
 *   - Hash (sha256) → lưu DB
 *   - TTL: 1 giờ
 *   - Một user có thể có nhiều token pending; consume chỉ đánh dấu consumedAt,
 *     không xoá các token khác (an toàn cho race condition).
 */

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000 // 1 giờ

export const hashPassword = libHashPassword
export const verifyPassword = libVerifyPassword
export { validatePassword, PasswordValidationError } from '../../lib/password'

export type ResetTokenInput = {
  userId: string
  ipAddress?: string
}

export type ResetToken = {
  token: string
  expiresAt: Date
}

function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(token).digest('hex')
  return { token, hash }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Tạo reset token mới, trả về token plaintext để gửi qua email. */
export async function createPasswordResetToken(input: ResetTokenInput): Promise<ResetToken> {
  const { token, hash } = generateToken()
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS)
  await db.passwordResetToken.create({
    data: {
      userId: input.userId,
      tokenHash: hash,
      expiresAt,
      ipAddress: input.ipAddress,
    },
  })
  return { token, expiresAt }
}

/**
 * Validate + consume reset token. Trả về userId nếu hợp lệ, null nếu sai/hết hạn.
 * Sau khi consume, token không dùng lại được nữa.
 */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const hash = hashToken(token)
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hash } })
  if (!row) return null
  if (row.consumedAt) return null
  if (row.expiresAt < new Date()) return null

  await db.passwordResetToken.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  })
  return row.userId
}

/** Invalidate tất cả reset token cũ của user (gọi sau khi đổi pass thành công). */
export async function invalidateAllResetTokens(userId: string): Promise<number> {
  const result = await db.passwordResetToken.updateMany({
    where: { userId, consumedAt: null },
    data: { consumedAt: new Date() },
  })
  return result.count
}

export const __test = { hashToken, generateToken }
