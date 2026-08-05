import { db } from '../../lib/db'
import { logger } from '../../lib/logger'
import { UnauthorizedError, ConflictError, NotFoundError } from '../../lib/errors'
import { createSession, rotateSession, revokeSession, revokeAllUserSessions } from './session'
import {
  hashPassword,
  verifyPassword,
  createPasswordResetToken,
  consumePasswordResetToken,
  invalidateAllResetTokens,
} from './password'
import { env } from '../../lib/env'
import type { User } from '@prisma/client'

/**
 * Auth service — Phase 2.
 *
 * Flow:
 *   register  → tạo User (status=active ngay vì auto-verify theo q2), set cookies
 *   login     → verify password, set cookies, update lastLoginAt
 *   logout    → revoke current session, clear cookies
 *   forgotPassword → tạo reset token, trả URL để gửi qua email
 *   resetPassword  → consume token, hash password mới, invalidate tokens cũ
 *   refreshSession → rotate refresh token, set cookies mới
 *
 * Audit: tất cả action success/failure đều log để debug + chống abuse.
 * Rate-limit: route handler chịu trách nhiệm (xem lib/rate-limit.ts).
 */

export type AuthMeta = {
  userAgent?: string
  ipAddress?: string
}

export type PublicUser = {
  id: string
  email: string | null
  name: string | null
  role: User['role']
}

export type AuthSuccess = {
  user: PublicUser
  sessionId: string
  refreshExpiresAt: Date
  /** Tokens trả về cho route handler set cookies. Không trả qua API response. */
  accessToken: string
  refreshToken: string
}

function publicUser(u: Pick<User, 'id' | 'email' | 'name' | 'role'>): PublicUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role }
}

async function setSessionForUser(
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>,
  meta: AuthMeta
): Promise<AuthSuccess> {
  const session = await createSession({
    userId: user.id,
    role: user.role,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  })
  return {
    user: publicUser(user),
    sessionId: session.sessionId,
    refreshExpiresAt: session.refreshExpiresAt,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  }
}

export const authService = {
  /** Tạo user mới + auto-verify (q2). Email conflict → 409. */
  async register(
    input: { email: string; password: string; name: string },
    meta: AuthMeta = {}
  ): Promise<AuthSuccess> {
    const existing = await db.user.findUnique({ where: { email: input.email } })
    if (existing) {
      throw new ConflictError('Email đã được đăng ký')
    }

    const passwordHash = await hashPassword(input.password)

    const user = await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: 'customer',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    })

    logger.info({ userId: user.id, email: user.email }, 'User registered')

    return setSessionForUser(user, meta)
  },

  /** Login bằng email + password. Rate-limit ở route handler. */
  async login(
    input: { email: string; password: string },
    meta: AuthMeta = {}
  ): Promise<AuthSuccess> {
    const user = await db.user.findUnique({
      where: { email: input.email },
    })

    if (!user || user.deletedAt || user.status !== 'active' || !user.passwordHash) {
      logger.warn({ email: input.email }, 'Login failed: user not found or inactive')
      throw new UnauthorizedError('Email hoặc mật khẩu không đúng')
    }

    const okPw = await verifyPassword(user.passwordHash, input.password)
    if (!okPw) {
      logger.warn({ email: input.email, userId: user.id }, 'Login failed: bad password')
      throw new UnauthorizedError('Email hoặc mật khẩu không đúng')
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    logger.info({ userId: user.id, email: user.email }, 'User logged in')

    return setSessionForUser(user, meta)
  },

  /**
   * Login sau khi verify OTP. Caller chịu trách nhiệm verify OTP trước.
   * Không check password (OTP thay thế).
   */
  async loginViaOtp(email: string, meta: AuthMeta = {}): Promise<AuthSuccess> {
    const user = await db.user.findUnique({ where: { email } })
    if (!user || user.deletedAt || user.status !== 'active') {
      throw new UnauthorizedError('Tài khoản không tồn tại hoặc đã bị khoá')
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    logger.info({ userId: user.id, email: user.email }, 'User logged in via OTP')

    return setSessionForUser(user, meta)
  },

  /** Logout current session. Revoke session + clear cookies (caller). */
  async logout(sessionId: string | null): Promise<void> {
    if (sessionId) {
      await revokeSession(sessionId)
    }
  },

  /** Logout tất cả thiết bị của user. */
  async logoutAll(userId: string): Promise<number> {
    return revokeAllUserSessions(userId)
  },

  /**
   * Forgot password: tạo reset token. Luôn trả về success dù email có tồn tại
   * hay không (chống user enumeration).
   */
  async forgotPassword(
    input: { email: string },
    meta: AuthMeta = {}
  ): Promise<{ resetUrl: string | null; expiresAt: Date | null }> {
    const user = await db.user.findUnique({ where: { email: input.email } })
    if (!user || user.deletedAt || !user.passwordHash) {
      logger.info({ email: input.email }, 'Forgot password: no matching user')
      return { resetUrl: null, expiresAt: null }
    }

    const { token, expiresAt } = await createPasswordResetToken({
      userId: user.id,
      ipAddress: meta.ipAddress,
    })

    const resetUrl = `${env.APP_URL}/auth/reset-password?token=${token}`

    logger.info(
      { userId: user.id, email: user.email, resetUrl, expiresAt },
      'Password reset requested'
    )

    return { resetUrl, expiresAt }
  },

  /** Reset password bằng token. Invalid tất cả session + reset token cũ. */
  async resetPassword(input: { token: string; password: string }): Promise<void> {
    const userId = await consumePasswordResetToken(input.token)
    if (!userId) {
      throw new NotFoundError('Token không hợp lệ hoặc đã hết hạn')
    }

    const passwordHash = await hashPassword(input.password)

    await db.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    // Force logout tất cả thiết bị + xoá các reset token cũ chưa dùng
    await Promise.all([revokeAllUserSessions(userId), invalidateAllResetTokens(userId)])

    logger.info({ userId }, 'Password reset successful')
  },

  /** Rotate refresh token → session mới + access mới. Trả null nếu token sai. */
  async refreshSession(refreshToken: string, meta: AuthMeta = {}): Promise<AuthSuccess | null> {
    const session = await rotateSession(refreshToken, meta)
    if (!session) return null

    // Query lại user để có name/email cho response. rotateSession đã verify
    // status active + deletedAt null, nên chỉ có thể fail nếu race với admin
    // vừa deactivate user → trả null để client logout.
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true, status: true, deletedAt: true },
    })
    if (!user || user.deletedAt || user.status !== 'active') {
      return null
    }

    return {
      user: publicUser(user),
      sessionId: session.sessionId,
      refreshExpiresAt: session.refreshExpiresAt,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    }
  },
}

export { publicUser }
