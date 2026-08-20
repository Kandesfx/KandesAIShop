import { OAuth2Client } from 'google-auth-library'
import { env } from '../../lib/env'
import { db } from '../../lib/db'
import { logger } from '../../lib/logger'
import { encrypt } from '../../lib/encryption'
import { createSession } from './session'
import type { User } from '@prisma/client'

/**
 * Google OAuth module — Phase 2 (P1).
 *
 * Flow:
 *   1. Client dùng Google SDK lấy `id_token` (qua Google Sign-In button hoặc One Tap)
 *   2. POST /api/auth/oauth/google { idToken }
 *   3. Server verify idToken với Google → lấy email, name, sub (google user id)
 *   4. Nếu email đã tồn tại → link OAuthAccount vào user đó
 *   5. Nếu chưa → tạo user mới + OAuthAccount
 *   6. Set session cookies
 *
 * Auto-link: BR-4 — nếu email đã verify (status active) thì auto-link,
 * không cần xác nhận từ user. Nếu status pending_verify thì fail (cần verify trước).
 */

const getGoogleClientId = () => env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

const GOOGLE_AUDIENCE = () => getGoogleClientId()

export type GoogleTokenPayload = {
  sub: string
  email: string
  email_verified: boolean
  name?: string
  picture?: string
}

export type OAuthResult = {
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>
  accessToken: string
  refreshToken: string
  refreshExpiresAt: Date
  isNewUser: boolean
}

let _client: OAuth2Client | null = null
function getClient(): OAuth2Client {
  if (!_client) {
    const clientId = getGoogleClientId()
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID chưa được cấu hình. Set env để dùng Google OAuth.')
    }
    _client = new OAuth2Client(clientId)
  }
  return _client
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload> {
  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: GOOGLE_AUDIENCE(),
  })
  const payload = ticket.getPayload()
  if (!payload?.sub || !payload.email) {
    throw new Error('Google ID token thiếu sub hoặc email')
  }
  if (!payload.email_verified) {
    throw new Error('Email Google chưa được verify')
  }
  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
  }
}

export const oauthService = {
  /**
   * Verify Google ID token → find hoặc tạo user → set session.
   */
  async loginWithGoogle(
    idToken: string,
    meta: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<OAuthResult> {
    const profile = await verifyGoogleIdToken(idToken)
    const email = profile.email.trim().toLowerCase()

    // Tìm OAuthAccount trước — đã link với user nào chưa
    const existingOAuth = await db.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: profile.sub,
        },
      },
      include: { user: true },
    })

    if (existingOAuth) {
      // Đã link trước đó → login user đó
      const user = existingOAuth.user
      if (user.deletedAt || user.status !== 'active') {
        throw new Error('Tài khoản đã bị khoá hoặc xoá')
      }
      const session = await createSession({
        userId: user.id,
        role: user.role,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      })
      logger.info({ userId: user.id, email: user.email }, 'User logged in via Google')
      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        refreshExpiresAt: session.refreshExpiresAt,
        isNewUser: false,
      }
    }

    // Chưa link — kiểm tra email đã có user chưa (auto-link per BR-4)
    const existingUser = await db.user.findUnique({ where: { email } })

    let user: User
    let isNewUser = false

    if (existingUser) {
      if (existingUser.deletedAt || existingUser.status !== 'active') {
        throw new Error('Tài khoản email này đã bị khoá hoặc xoá')
      }
      user = existingUser
      logger.info(
        { userId: user.id, email },
        'Auto-linking Google account to existing user'
      )
    } else {
      // Tạo user mới
      user = await db.user.create({
        data: {
          email,
          name: profile.name ?? email.split('@')[0],
          avatarUrl: profile.picture,
          passwordHash: null, // OAuth-only user
          role: 'customer',
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      })
      isNewUser = true
      logger.info({ userId: user.id, email }, 'New user registered via Google')
    }

    // Tạo OAuthAccount
    await db.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: 'google',
        providerAccountId: profile.sub,
        // Lưu idToken làm access token reference (không có refresh cho Google One Tap).
        // Encrypt trả Buffer, nhưng schema lưu String (base64).
        accessTokenEncrypted: encrypt(idToken).toString('base64'),
      },
    })

    const session = await createSession({
      userId: user.id,
      role: user.role,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    })

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      refreshExpiresAt: session.refreshExpiresAt,
      isNewUser,
    }
  },
}
