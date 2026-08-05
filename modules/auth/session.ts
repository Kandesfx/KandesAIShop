import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { env } from '../../lib/env'
import { db } from '../../lib/db'

/**
 * Session layer — Phase 2.
 *
 * Access token: JWT ngắn hạn (15 phút), lưu cookie `kds_access`.
 *   - Không cần DB lookup mỗi request → nhanh
 *   - Có thể verify offline qua SESSION_SECRET
 *
 * Refresh token: opaque 32-byte secret, lưu cookie `kds_refresh` (path scoped).
 *   - Hash (sha256) rồi mới lưu DB Session.refreshTokenHash
 *   - Khi access hết hạn → gọi /api/auth/refresh để rotate
 *   - Rotation: dùng xong → revoke session cũ, tạo session mới
 *
 * TTL:
 *   - Access: 15 phút
 *   - Refresh: 7 ngày
 */

const ACCESS_COOKIE = 'kds_access'
const REFRESH_COOKIE = 'kds_refresh'
const ACCESS_TTL_SEC = 15 * 60
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60

const DEV_SECRET_WARNING = 'dev-session-secret-do-not-use-in-production-please-replace-now'
const secretKey = new TextEncoder().encode(env.SESSION_SECRET)

if (env.NODE_ENV === 'production' && env.SESSION_SECRET === DEV_SECRET_WARNING) {
  throw new Error('Không thể chạy production với SESSION_SECRET mặc định.')
}

interface AccessPayload {
  uid: string
  sid: string // session id — liên kết với refresh token
  role: string
}

function signAccess(payload: AccessPayload): Promise<string> {
  return new SignJWT({ uid: payload.uid, sid: payload.sid, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(secretKey)
}

async function verifyAccess(token: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    if (
      typeof payload.uid !== 'string' ||
      typeof payload.sid !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null
    }
    return { uid: payload.uid, sid: payload.sid, role: payload.role }
  } catch {
    return null
  }
}

function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(token).digest('hex')
  return { token, hash }
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type CreateSessionInput = {
  userId: string
  role: string
  userAgent?: string
  ipAddress?: string
}

export type CreatedSession = {
  sessionId: string
  userId: string
  role: string
  refreshToken: string
  accessToken: string
  refreshExpiresAt: Date
}

/**
 * Tạo session mới: ghi Session row, ký access JWT, trả về tokens + expires.
 * Caller chịu trách nhiệm set cookies.
 */
export async function createSession(input: CreateSessionInput): Promise<CreatedSession> {
  const { token: refreshToken, hash } = generateRefreshToken()
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000)

  const session = await db.session.create({
    data: {
      userId: input.userId,
      refreshTokenHash: hash,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt,
    },
  })

  const accessToken = await signAccess({
    uid: input.userId,
    sid: session.id,
    role: input.role,
  })

  return {
    sessionId: session.id,
    userId: input.userId,
    role: input.role,
    refreshToken,
    accessToken,
    refreshExpiresAt: expiresAt,
  }
}

/**
 * Rotate refresh token: revoke session cũ, tạo session mới + access mới.
 * Trả về null nếu refresh token không hợp lệ / đã revoke / hết hạn.
 */
export async function rotateSession(
  oldRefreshToken: string,
  meta: { userAgent?: string; ipAddress?: string } = {}
): Promise<CreatedSession | null> {
  const hash = hashRefreshToken(oldRefreshToken)
  const session = await db.session.findUnique({
    where: { refreshTokenHash: hash },
    include: { user: { select: { id: true, role: true, status: true, deletedAt: true } } },
  })

  if (!session || session.revokedAt) return null
  if (session.expiresAt < new Date()) return null
  if (!session.user || session.user.deletedAt || session.user.status !== 'active') return null

  // Revoke session cũ (rotation: mỗi refresh chỉ dùng 1 lần)
  await db.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  })

  return createSession({
    userId: session.user.id,
    role: session.user.role,
    userAgent: meta.userAgent ?? session.userAgent ?? undefined,
    ipAddress: meta.ipAddress ?? session.ipAddress ?? undefined,
  })
}

/** Revoke một session cụ thể (logout current device). */
export async function revokeSession(sessionId: string): Promise<void> {
  await db.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/** Revoke tất cả session của user (force logout all devices). */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return result.count
}

/** Verify access token từ cookie, trả về payload hoặc null. */
export async function getAccessPayload(): Promise<AccessPayload | null> {
  const token = cookies().get(ACCESS_COOKIE)?.value
  if (!token) return null
  return verifyAccess(token)
}

export async function readRefreshCookie(): Promise<string | null> {
  return cookies().get(REFRESH_COOKIE)?.value ?? null
}

/**
 * Set cả 2 cookies (access + refresh) trên response.
 * Cookie refresh path-scope để giảm attack surface.
 */
export function setSessionCookies(tokens: { accessToken: string; refreshToken: string }): void {
  const cookieOpts = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }
  cookies().set(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieOpts,
    path: '/',
    maxAge: ACCESS_TTL_SEC,
  })
  cookies().set(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieOpts,
    // Path-scope: refresh chỉ gửi tới /api/auth/refresh và /api/auth/logout
    path: '/api/auth',
    maxAge: REFRESH_TTL_SEC,
  })
}

export function clearSessionCookies(): void {
  cookies().delete(ACCESS_COOKIE)
  cookies().delete(REFRESH_COOKIE)
}

export const SESSION_COOKIES = {
  access: ACCESS_COOKIE,
  refresh: REFRESH_COOKIE,
} as const

export const SESSION_TTL = {
  accessSec: ACCESS_TTL_SEC,
  refreshSec: REFRESH_TTL_SEC,
} as const

export const __test = { hashRefreshToken, generateRefreshToken, signAccess, verifyAccess }
